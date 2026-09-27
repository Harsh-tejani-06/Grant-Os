const { validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const User = require('../models/User');
const GrantListing = require('../models/GrantListing');
const Proposal = require('../models/Proposal');
const {
  embedOrgProfile,
  cosineSimilarity,
  buildOrgText,
  contentHash,
} = require('../utils/embeddings');

// ---------------------------------------------------------------------------
// Helper — recompute org embedding if profile-relevant fields changed
// ---------------------------------------------------------------------------

const EMBEDDING_FIELDS = [
  'organizationType',
  'focusAreas',
  'grantCategories',
  'naacAccreditation',
  'ugcRecognition',
];

/**
 * Recompute the org's embedding if any of the profile fields that feed
 * the embedding have changed (detected via content-hash comparison).
 * No-ops if the hash matches — avoids burning API calls on unrelated edits.
 *
 * @param {Document} org - a Mongoose Organization document
 * @returns {Promise<boolean>} true if the embedding was recomputed
 */
async function maybeRecomputeOrgEmbedding(org) {
  try {
    const text = buildOrgText(org);
    if (!text) return false;

    const hash = contentHash(text);
    if (
      org.embedding &&
      org.embedding.length === 768 &&
      org.embeddingContentHash === hash
    ) {
      return false; // already current
    }

    const { embedding, hash: newHash } = await embedOrgProfile(org);
    org.embedding = embedding;
    org.embeddingContentHash = newHash;
    await org.save();
    return true;
  } catch (err) {
    // Non-fatal — the org still works without an embedding; the discover
    // endpoint will compute it inline as a fallback.
    console.error('Org embedding computation failed (non-fatal):', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

// @desc    Register organization (submit for verification)
// @route   POST /api/org/register
// @access  Private (org_admin)
const registerOrganization = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check if user already has an organization
    if (req.user.organization) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered an organization',
      });
    }

    // Check for duplicate registration number
    const existingOrg = await Organization.findOne({
      registrationNumber: req.body.registrationNumber,
    });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'An organization with this registration number already exists',
      });
    }

    const orgData = {
      organizationName: req.body.organizationName,
      registrationNumber: req.body.registrationNumber,
      organizationType: req.body.organizationType,
      establishedYear: req.body.establishedYear,
      website: req.body.website || '',
      address: {
        street: req.body.address?.street,
        city: req.body.address?.city,
        state: req.body.address?.state,
        pincode: req.body.address?.pincode,
        country: req.body.address?.country || 'India',
      },
      contactPerson: {
        name: req.body.contactPerson?.name,
        designation: req.body.contactPerson?.designation || '',
        email: req.body.contactPerson?.email,
        phone: req.body.contactPerson?.phone,
      },
      naacAccreditation: req.body.naacAccreditation || 'N/A',
      ugcRecognition: req.body.ugcRecognition || false,
      focusAreas: req.body.focusAreas || [],
      grantCategories: req.body.grantCategories || [],
      totalFaculty: req.body.totalFaculty || 0,
      totalPhDScholars: req.body.totalPhDScholars || 0,
      status: 'pending',
      submittedAt: new Date(),
      createdBy: req.user._id,
    };

    const organization = await Organization.create(orgData);

    // Pre-compute embedding (fire-and-forget; non-blocking for the response)
    maybeRecomputeOrgEmbedding(organization);

    // Link organization to user
    await User.findByIdAndUpdate(req.user._id, {
      organization: organization._id,
    });

    res.status(201).json({
      success: true,
      message:
        'Organization registered successfully. Your application is under review. You will receive an email notification within 3 days.',
      organization: {
        id: organization._id,
        organizationName: organization.organizationName,
        status: organization.status,
        submittedAt: organization.submittedAt,
      },
    });
  } catch (error) {
    console.error('Org registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during organization registration',
    });
  }
};

// @desc    Get organization status
// @route   GET /api/org/status
// @access  Private (org_admin)
const getOrgStatus = async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.status(404).json({
        success: false,
        message: 'No organization found. Please register your organization first.',
        hasOrg: false,
      });
    }

    const org = await Organization.findById(req.user.organization);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
        hasOrg: false,
      });
    }

    res.json({
      success: true,
      hasOrg: true,
      organization: {
        id: org._id,
        organizationName: org.organizationName,
        status: org.status,
        submittedAt: org.submittedAt,
        reviewedAt: org.reviewedAt,
        rejectionReason: org.rejectionReason || null,
      },
    });
  } catch (error) {
    console.error('Get org status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Discover grants ranked by semantic similarity to org profile
// @route   GET /api/org/grants/discover
// @access  Private (org_admin, team_member)
const discoverGrants = async (req, res) => {
  try {
    // ── 1. Load requesting org's embedding ──
    if (!req.user.organization) {
      return res.status(400).json({
        success: false,
        message: 'No organization linked to your account',
      });
    }

    const org = await Organization.findById(req.user.organization);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    // Compute inline if missing/stale (fallback — don't error)
    if (!org.embedding || org.embedding.length !== 768) {
      await maybeRecomputeOrgEmbedding(org);
      // Reload after save
      await org.populate([]);
    }

    const orgEmbedding = org.embedding && org.embedding.length === 768 ? org.embedding : null;

    // ── 2. Build grant query ──
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    // Status filter — maps to GrantListing.status
    if (status && status !== 'all') {
      if (status === 'Open' || status === 'Closing Soon') {
        filter.status = 'active';
      } else if (status === 'Closed') {
        filter.status = { $in: ['closed', 'suspended'] };
      } else {
        filter.status = status;
      }
    }

    // Category filter — maps to grantType (the normalised enum)
    if (category && category !== 'all' && category !== 'All Categories') {
      filter.grantType = category;
    }

    // Keyword filter — case-insensitive regex against title, agency.name, categoryRaw
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { title: regex },
        { 'agency.name': regex },
        { categoryRaw: regex },
      ];
    }

    // ── 3. Fetch candidates ──
    const grants = await GrantListing.find(filter).lean();

    // ── 3b. Check which grants the org already applied for ──
    const appliedGrantIds = await Proposal.find({
      organization: org._id,
      grantListingId: { $ne: null },
      status: { $nin: ['Rejected'] },
    }).distinct('grantListingId');
    const appliedSet = new Set(appliedGrantIds.map((id) => id.toString()));

    // ── 4. Compute similarity + derived display status ──
    const now = new Date();
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

    const results = grants.map((grant) => {
      // Similarity
      const similarity = orgEmbedding
        ? cosineSimilarity(orgEmbedding, grant.embedding || [])
        : 0;
      const matchPercentage = Math.round(Math.max(0, Math.min(1, similarity)) * 100);

      // Derived display status
      let displayStatus = 'Closed';
      if (grant.status === 'active') {
        const deadlineDate = grant.deadline?.parsedDate
          ? new Date(grant.deadline.parsedDate)
          : null;
        if (!deadlineDate || deadlineDate.getTime() - now.getTime() > FOURTEEN_DAYS_MS) {
          displayStatus = 'Open';
        } else if (deadlineDate.getTime() > now.getTime()) {
          displayStatus = 'Closing Soon';
        }
      }

      // Funding display
      let fundingDisplay = '';
      if (grant.fundingAmount) {
        if (grant.fundingAmount.rawText) {
          fundingDisplay = grant.fundingAmount.rawText;
        } else if (grant.fundingAmount.maxINR) {
          fundingDisplay = `₹${(grant.fundingAmount.maxINR / 100000).toFixed(0)} Lakh`;
        } else if (grant.fundingAmount.minINR) {
          fundingDisplay = `₹${(grant.fundingAmount.minINR / 100000).toFixed(0)} Lakh`;
        }
      }

      // Deadline display
      let deadlineDisplay = '';
      if (grant.deadline) {
        if (grant.deadline.parsedDate) {
          deadlineDisplay = new Date(grant.deadline.parsedDate).toISOString().split('T')[0];
        } else if (grant.deadline.rawText) {
          deadlineDisplay = grant.deadline.rawText;
        }
      }

      return {
        _id: grant._id,
        title: grant.title,
        agencyName: grant.agency?.name || '',
        grantType: grant.grantType,
        categoryRaw: grant.categoryRaw,
        fundingDisplay,
        deadlineDisplay,
        displayStatus,
        matchPercentage,
        infoUrl: grant.links?.infoUrl || '',
        applicationUrl: grant.links?.applicationUrl || '',
        description: grant.description || '',
        eligibilityText: grant.eligibilityText || '',
        applicationProcedure: grant.applicationProcedure || '',
        durationDisplay: grant.duration?.rawText || '',
        focusAreas: grant.focusAreas || [],
        eligibleApplicantTypes: grant.eligibleApplicantTypes || [],
        guidelinesUrl: grant.links?.guidelinesUrl || '',
        hasApplied: appliedSet.has(grant._id.toString()),
      };
    });

    // ── 5. Sort by similarity descending ──
    results.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // ── 6. Apply display-status filter post-sort (for "Open"/"Closing Soon") ──
    let filtered = results;
    if (status === 'Open') {
      filtered = results.filter((r) => r.displayStatus === 'Open');
    } else if (status === 'Closing Soon') {
      filtered = results.filter((r) => r.displayStatus === 'Closing Soon');
    }

    // ── 7. Paginate ──
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const startIdx = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIdx, startIdx + limitNum);

    res.json({
      success: true,
      grants: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    });
  } catch (error) {
    console.error('Discover grants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during grant discovery',
    });
  }
};

module.exports = { registerOrganization, getOrgStatus, discoverGrants, maybeRecomputeOrgEmbedding };

