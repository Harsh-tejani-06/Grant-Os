/**
 * controllers/grantIngestController.js
 *
 * Handles internal scraper→Node grant ingestion.  Every function here
 * is called exclusively by the Python scraping pipeline through the
 * internal bearer-token-protected `/api/internal/grants` routes —
 * never by end-users directly.
 *
 * Core responsibilities:
 *   1. Receive scraped grant data and delegate to GrantListing.upsertFromScrape()
 *   2. Attempt best-effort agency linking against FundingAgency collection
 *   3. Bulk soft-delete (delist) grants that vanish from their source
 *   4. Provide run-summary stats for the end-of-pipeline log
 */

const GrantListing = require('../models/GrantListing');
const FundingAgency = require('../models/FundingAgency');
const { tokenSortRatio, bestMatch } = require('../utils/fuzzyMatch');

// ─── Alias table ───
// Common short-form / alternate names for the four primary agencies.
// Maps normalized aliases → canonical name stored in FundingAgency.agencyName.
// Extend this as new agencies are added to the platform.
const AGENCY_ALIASES = {
  'dst': 'Department of Science and Technology',
  'department of science and technology': 'Department of Science and Technology',
  'department of science & technology': 'Department of Science and Technology',
  'department of science and technology (dst)': 'Department of Science and Technology',
  'dbt': 'Department of Biotechnology',
  'department of biotechnology': 'Department of Biotechnology',
  'department of biotechnology (dbt)': 'Department of Biotechnology',
  'aicte': 'All India Council for Technical Education',
  'all india council for technical education': 'All India Council for Technical Education',
  'all india council for technical education (aicte)': 'All India Council for Technical Education',
  'ugc': 'University Grants Commission',
  'university grants commission': 'University Grants Commission',
  'university grants commission (ugc)': 'University Grants Commission',
};

/**
 * Try to link a scraped agency name to an existing FundingAgency document.
 *
 * Strategy (per requirement §6):
 *   1. Alias table lookup (handles abbreviations like "DST" → full name)
 *   2. Exact match against FundingAgency.agencyName (case-insensitive)
 *   3. Fuzzy match (token-sort ratio ≥ 90) against approved agencies
 *
 * @param  {string} scrapedName - The agency name as scraped
 * @returns {Promise<ObjectId|null>} The matched FundingAgency._id, or null
 */
async function tryLinkAgency(scrapedName) {
  if (!scrapedName) return null;

  const normalized = scrapedName.trim().toLowerCase();

  // 1. Alias table lookup
  const aliasCanonical = AGENCY_ALIASES[normalized];

  // 2. Exact match (case-insensitive) — try alias first, then raw name
  const candidateName = aliasCanonical || scrapedName;
  const exactMatch = await FundingAgency.findOne({
    agencyName: { $regex: new RegExp(`^${escapeRegex(candidateName.trim())}$`, 'i') },
    status: 'approved',
  });

  if (exactMatch) return exactMatch._id;

  // 3. Fuzzy match against all approved agencies
  const approvedAgencies = await FundingAgency.find(
    { status: 'approved' },
    { agencyName: 1 }
  ).lean();

  if (approvedAgencies.length === 0) return null;

  const names = approvedAgencies.map((a) => a.agencyName);
  const result = bestMatch(scrapedName, names, 90);

  if (result) {
    return approvedAgencies[result.index]._id;
  }

  return null;
}

/**
 * Escape special regex characters in a string so it can be used in
 * a RegExp constructor safely.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Route handlers ────────────────────────────────────────────────

/**
 * @desc    Ingest a single scraped grant
 * @route   POST /api/internal/grants/ingest
 * @access  Internal (bearer token)
 */
const ingestGrant = async (req, res) => {
  try {
    const scrapedData = req.body;

    // Basic validation — the model handles full validation, but reject
    // obviously incomplete payloads early so we don't hit cryptic errors.
    if (!scrapedData.title) {
      return res.status(400).json({
        success: false,
        status: 'rejected',
        errors: ['title is required'],
      });
    }
    if (!scrapedData.agency?.name) {
      return res.status(400).json({
        success: false,
        status: 'rejected',
        errors: ['agency.name is required'],
      });
    }
    if (!scrapedData.links?.infoUrl) {
      return res.status(400).json({
        success: false,
        status: 'rejected',
        errors: ['links.infoUrl is required'],
      });
    }
    if (!scrapedData.source?.type) {
      return res.status(400).json({
        success: false,
        status: 'rejected',
        errors: ['source.type is required'],
      });
    }

    // Attempt agency linking before upsert
    if (!scrapedData.agency.ref) {
      const agencyRef = await tryLinkAgency(scrapedData.agency.name);
      if (agencyRef) {
        scrapedData.agency.ref = agencyRef;
      }
    }

    // Compute grantId for the response (upsertFromScrape also computes it,
    // but we need it for the response regardless of insert vs. update)
    const grantId = GrantListing.computeGrantId(
      scrapedData.agency.name,
      scrapedData.title,
      scrapedData.links.infoUrl
    );

    // Check if this grant already exists to determine insert vs. update
    const existingBefore = await GrantListing.findOne({ grantId });

    const doc = await GrantListing.upsertFromScrape(scrapedData);

    const status = existingBefore ? 'updated' : 'inserted';

    res.status(status === 'inserted' ? 201 : 200).json({
      success: true,
      status,
      grantId: doc.grantId,
      needsReview: doc.needsReview,
      missingFields: doc.missingFields,
      agencyLinked: doc.agency.isLinked,
    });
  } catch (error) {
    // Mongoose validation errors should report as "rejected", not 500
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        status: 'rejected',
        errors,
      });
    }

    console.error('Grant ingest error:', error);
    res.status(500).json({
      success: false,
      status: 'rejected',
      message: 'Internal server error during grant ingestion',
    });
  }
};

/**
 * @desc    Batch soft-delete grants that are no longer found on their source
 * @route   POST /api/internal/grants/delist
 * @access  Internal (bearer token)
 *
 * Body: { grantIds: string[], sourceWebsite: string }
 *
 * The pipeline sends all grantIds it found in the current crawl for a given
 * source website.  Any grant in the DB for that website NOT in the list gets
 * delisted.
 */
const markDelistedBatch = async (req, res) => {
  try {
    const { grantIds, sourceWebsite } = req.body;

    if (!sourceWebsite) {
      return res.status(400).json({
        success: false,
        message: 'sourceWebsite is required',
      });
    }

    if (!Array.isArray(grantIds)) {
      return res.status(400).json({
        success: false,
        message: 'grantIds must be an array',
      });
    }

    // Find grants from this website that are currently active but were NOT
    // in the latest crawl — those have been delisted from the source.
    const toDelistQuery = {
      'source.website': sourceWebsite,
      isActive: true,
    };

    // If the scraper found grants, exclude them from delisting
    if (grantIds.length > 0) {
      toDelistQuery.grantId = { $nin: grantIds };
    }

    const toDelistDocs = await GrantListing.find(toDelistQuery);
    let delistedCount = 0;

    for (const doc of toDelistDocs) {
      await doc.markDelisted();
      delistedCount++;
    }

    res.json({
      success: true,
      delistedCount,
      message: `${delistedCount} grant(s) marked as delisted from ${sourceWebsite}`,
    });
  } catch (error) {
    console.error('Delist batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during batch delist',
    });
  }
};

/**
 * @desc    Get ingestion statistics for the end-of-run summary
 * @route   GET /api/internal/grants/stats
 * @access  Internal (bearer token)
 */
const getIngestStats = async (req, res) => {
  try {
    const [
      total,
      active,
      delisted,
      needsReview,
      scraped,
      agencySubmitted,
      linked,
      unlinked,
    ] = await Promise.all([
      GrantListing.countDocuments(),
      GrantListing.countDocuments({ isActive: true }),
      GrantListing.countDocuments({ isActive: false }),
      GrantListing.countDocuments({ needsReview: true }),
      GrantListing.countDocuments({ 'source.type': 'scraped' }),
      GrantListing.countDocuments({ 'source.type': 'agency_submitted' }),
      GrantListing.countDocuments({ 'agency.isLinked': true }),
      GrantListing.countDocuments({ 'agency.isLinked': false }),
    ]);

    // Status breakdown
    const statusCounts = {};
    for (const s of ['active', 'closed', 'suspended', 'unknown']) {
      statusCounts[s] = await GrantListing.countDocuments({ status: s });
    }

    // Per-website breakdown
    const websiteAgg = await GrantListing.aggregate([
      { $group: { _id: '$source.website', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      stats: {
        total,
        active,
        delisted,
        needsReview,
        bySourceType: { scraped, agencySubmitted },
        byAgencyLink: { linked, unlinked },
        byStatus: statusCounts,
        byWebsite: websiteAgg.map((w) => ({ website: w._id, count: w.count })),
      },
    });
  } catch (error) {
    console.error('Get ingest stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error fetching stats',
    });
  }
};

module.exports = { ingestGrant, markDelistedBatch, getIngestStats };
