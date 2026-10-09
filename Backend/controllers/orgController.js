const { validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const User = require('../models/User');
const GrantListing = require('../models/GrantListing');
const Proposal = require('../models/Proposal');
const {
  embedOrgProfile,
  embedGrantText,
  cosineSimilarity,
  buildOrgText,
  buildGrantText,
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
//          Returns government/scraped grants AND GrantOS funding agency grants
//          as two separate sections, plus dropdown filter options for each.
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
      await org.populate([]);
    }

    const orgEmbedding = org.embedding && org.embedding.length === 768 ? org.embedding : null;

    // ── 2. Build grant query ──
    const { search, category, status, page = 1, limit = 20, agencyFilter, sourceTab, govPage, grantosPage } = req.query;
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

    // Agency acronym & alias helper
    const GOV_ACRONYMS = {
      'Department of Science and Technology': 'DST',
      'Dept of Science and Technology': 'DST',
      'Science and Engineering Research Board': 'SERB',
      'All India Council for Technical Education': 'AICTE',
      'University Grants Commission': 'UGC',
      'Department of Biotechnology': 'DBT',
      'Dept of Biotechnology': 'DBT',
      'Council of Scientific and Industrial Research': 'CSIR',
      'Indian Council of Medical Research': 'ICMR',
      'Indian Space Research Organisation': 'ISRO',
      'Defence Research and Development Organisation': 'DRDO',
    };

    const ACRONYM_TO_FULL = {
      'dst': 'Department of Science and Technology',
      'serb': 'Science and Engineering Research Board',
      'aicte': 'All India Council for Technical Education',
      'ugc': 'University Grants Commission',
      'dbt': 'Department of Biotechnology',
      'csir': 'Council of Scientific and Industrial Research',
      'icmr': 'Indian Council of Medical Research',
      'isro': 'Indian Space Research Organisation',
      'drdo': 'Defence Research and Development Organisation',
    };

    let agencyRegex = null;
    if (agencyFilter && agencyFilter !== 'all') {
      const norm = agencyFilter.trim().toLowerCase();
      const terms = new Set([agencyFilter.trim()]);
      if (ACRONYM_TO_FULL[norm]) {
        terms.add(ACRONYM_TO_FULL[norm]);
      }
      for (const [full, acr] of Object.entries(GOV_ACRONYMS)) {
        if (full.toLowerCase() === norm || acr.toLowerCase() === norm) {
          terms.add(full);
          terms.add(acr);
        }
      }
      const pattern = Array.from(terms).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      agencyRegex = new RegExp(pattern, 'i');
      filter['agency.name'] = agencyRegex;
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

    // ── 3. Fetch ALL candidates (both scraped & agency_submitted) ──
    const grants = await GrantListing.find(filter).lean();

    // ── 3a. Inline-heal grants missing embeddings ──
    for (const grant of grants) {
      if (!grant.embedding || grant.embedding.length !== 768) {
        try {
          const { embedding, hash } = await embedGrantText(grant);
          grant.embedding = embedding;
          grant.embeddingContentHash = hash;
          GrantListing.updateOne(
            { _id: grant._id },
            { $set: { embedding, embeddingContentHash: hash } }
          ).catch((err) =>
            console.error(`Grant embedding save failed for "${grant.title}":`, err.message)
          );
        } catch (err) {
          console.error(`Grant embedding failed for "${grant.title}" (non-fatal):`, err.message);
        }
      }
    }

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

    const transformGrant = (grant) => {
      const similarity = orgEmbedding
        ? cosineSimilarity(orgEmbedding, grant.embedding || [])
        : 0;
      const matchPercentage = Math.round(Math.max(0, Math.min(1, similarity)) * 100);
      const _similarity = similarity;

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
        sourceType: grant.source?.type || 'scraped',
        fundingDisplay,
        deadlineDisplay,
        displayStatus,
        matchPercentage,
        _similarity,
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
    };

    const results = grants.map(transformGrant);
    results.sort((a, b) => b._similarity - a._similarity);

    // ── 5. Apply display-status filter post-sort ──
    let filtered = results;
    if (status === 'Open') {
      filtered = results.filter((r) => r.displayStatus === 'Open');
    } else if (status === 'Closing Soon') {
      filtered = results.filter((r) => r.displayStatus === 'Closing Soon');
    }

    // ── 6. Separate into government (scraped) and GrantOS (agency_submitted) ──
    const govGrants = filtered.filter((g) => g.sourceType === 'scraped');
    const grantosGrants = filtered.filter((g) => g.sourceType === 'agency_submitted');

    // ── 6a. Also fetch GrantProgram entries from approved funding agencies ──
    // These are grants created directly by funding agencies on the platform
    const GrantProgram = require('../models/GrantProgram');
    const FundingAgency = require('../models/FundingAgency');

    const programFilter = {
      status: { $in: ['Active', 'Upcoming'] },
      isDeleted: { $ne: true },
    };

    // Apply search filter to programs too
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      programFilter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
      ];
    }

    const programs = await GrantProgram.find(programFilter)
      .populate('fundingAgency', 'agencyName shortName agencyType status')
      .sort({ deadline: 1 })
      .lean();

    // Only include programs from approved agencies
    let approvedPrograms = programs.filter(
      (p) => p.fundingAgency && p.fundingAgency.status === 'approved'
    );

    // Apply agency filter to programs too
    if (agencyRegex) {
      approvedPrograms = approvedPrograms.filter((p) => {
        const agencyName = p.fundingAgency?.agencyName || '';
        const shortName = p.fundingAgency?.shortName || '';
        return agencyRegex.test(agencyName) || agencyRegex.test(shortName);
      });
    }

    // Inline-heal programs missing embeddings (background/non-blocking)
    const { embedGrantText } = require('../utils/embeddings');
    for (const program of approvedPrograms) {
      if (!program.embedding || program.embedding.length !== 768) {
        embedGrantText(program)
          .then(({ embedding, hash }) => {
            GrantProgram.updateOne(
              { _id: program._id },
              { $set: { embedding, embeddingContentHash: hash } }
            ).catch(() => {});
          })
          .catch(() => {});
      }
    }

    // Check which programs the org already applied for
    const appliedProgramIds = await Proposal.find({
      organization: org._id,
      grantProgram: { $ne: null },
      status: { $nin: ['Rejected'] },
    }).distinct('grantProgram');
    const appliedProgramSet = new Set(appliedProgramIds.map((id) => id.toString()));

    // Transform programs into a similar shape for the frontend
    const programResults = approvedPrograms.map((program) => {
      // Compute similarity score for programs
      let matchPercentage = 0;
      let _similarity = 0;

      if (orgEmbedding && program.embedding && program.embedding.length === 768) {
        _similarity = cosineSimilarity(orgEmbedding, program.embedding);
        matchPercentage = Math.round(Math.max(0, Math.min(1, _similarity)) * 100);
      } else if (orgEmbedding) {
        // Keyword & profile matching heuristic when embedding is still computing
        const orgFocusAreas = (org.focusAreas || []).map((a) => a.toLowerCase());
        const orgCategories = (org.grantCategories || []).map((c) => c.toLowerCase());
        const progText = `${program.title} ${program.description} ${program.category || ''} ${(program.researchAreas || []).join(' ')}`.toLowerCase();

        let hits = 0;
        let total = orgFocusAreas.length + orgCategories.length;
        if (total === 0) total = 1;

        orgFocusAreas.forEach((area) => {
          if (progText.includes(area.replace(/_/g, ' '))) hits++;
        });
        orgCategories.forEach((cat) => {
          if (progText.includes(cat.replace(/_/g, ' '))) hits++;
        });

        matchPercentage = Math.min(95, Math.max(45, Math.round(55 + (hits / total) * 35)));
        _similarity = matchPercentage / 100;
      } else {
        matchPercentage = 75;
        _similarity = 0.75;
      }

      // Determine display status
      let displayStatus = 'Open';
      if (program.status === 'Closed' || program.status === 'Archived' || program.status === 'Completed') {
        displayStatus = 'Closed';
      } else if (program.deadline) {
        const deadlineDate = new Date(program.deadline);
        if (deadlineDate < now) {
          displayStatus = 'Closed';
        } else if (deadlineDate.getTime() - now.getTime() <= FOURTEEN_DAYS_MS) {
          displayStatus = 'Closing Soon';
        }
      }

      return {
        _id: program._id,
        title: program.title,
        agencyName: program.fundingAgency?.agencyName || '',
        agencyShortName: program.fundingAgency?.shortName || '',
        agencyType: program.fundingAgency?.agencyType || '',
        category: program.category || '',
        fundingType: program.fundingType || '',
        fundingDisplay: program.budget || '',
        deadlineDisplay: (() => {
          if (!program.deadline) return '';
          try {
            const d = new Date(program.deadline);
            return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
          } catch {
            return '';
          }
        })(),
        displayStatus,
        matchPercentage,
        _similarity,
        description: program.description || '',
        eligibilityText: program.eligibilityRulesText || '',
        applicationProcedure: program.applicationProcess || '',
        researchAreas: program.researchAreas || [],
        hasApplied: appliedProgramSet.has(program._id.toString()),
        isProgramGrant: true, // flag to differentiate in frontend
      };
    });

    // Apply status filter to programs too
    let filteredPrograms = programResults;
    if (status === 'Open') {
      filteredPrograms = programResults.filter((r) => r.displayStatus === 'Open');
    } else if (status === 'Closing Soon') {
      filteredPrograms = programResults.filter((r) => r.displayStatus === 'Closing Soon');
    }

    // Sort programs by matchPercentage descending
    filteredPrograms.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // ── 7. Build unique agency lists for dropdown filters ──
    // Government agencies (from ALL scraped grants + standard Indian R&D agencies)
    const allScrapedAgencies = await GrantListing.find({
      isActive: true,
      'source.type': { $ne: 'agency_submitted' },
    }).distinct('agency.name');

    const standardGovAgencies = [
      'Department of Science and Technology',
      'Science and Engineering Research Board',
      'All India Council for Technical Education',
      'University Grants Commission',
      'Department of Biotechnology',
      'Council of Scientific and Industrial Research',
      'Indian Council of Medical Research',
    ];

    const mergedGovNames = Array.from(new Set([...standardGovAgencies, ...allScrapedAgencies])).filter(Boolean);

    const isGovAgencyName = (name) => {
      const lower = (name || '').trim().toLowerCase();
      return (
        ACRONYM_TO_FULL[lower] !== undefined ||
        Object.keys(GOV_ACRONYMS).some((k) => k.toLowerCase() === lower) ||
        ['aicte', 'dst', 'serb', 'ugc', 'dbt', 'csir', 'icmr', 'drdo', 'isro'].includes(lower)
      );
    };

    const govAgencyOptions = mergedGovNames
      .map((name) => {
        const short = GOV_ACRONYMS[name] || '';
        return {
          name,
          shortName: short,
          label: short ? `${short} (${name})` : name,
          value: short || name,
        };
      })
      .sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));

    // GrantOS private/partner agency names (exclude any government agencies)
    const allApprovedAgencies = await FundingAgency.find({ status: 'approved' })
      .select('agencyName shortName agencyType')
      .lean();

    const privateAgencies = allApprovedAgencies.filter((a) => {
      if (a.agencyType === 'government_central' || a.agencyType === 'government_state') return false;
      if (isGovAgencyName(a.agencyName) || isGovAgencyName(a.shortName)) return false;
      return true;
    });

    const grantosAgencyOptions = privateAgencies
      .map((a) => {
        const short = (a.shortName || '').trim();
        const name = (a.agencyName || '').trim();
        return {
          name,
          shortName: short,
          label: short ? `${name} (${short})` : name,
          value: name,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    // ── 8. Paginate the data ──
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Government pagination
    const govPageNum = Math.max(1, parseInt(govPage || page, 10) || 1);
    const govStartIdx = (govPageNum - 1) * limitNum;
    const govPaginated = govGrants.slice(govStartIdx, govStartIdx + limitNum);

    // GrantOS pagination (listings + programs combined)
    const allGrantosItems = [...grantosGrants, ...filteredPrograms];
    allGrantosItems.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));

    const grantosPageNum = Math.max(1, parseInt(grantosPage || page, 10) || 1);
    const grantosStartIdx = (grantosPageNum - 1) * limitNum;
    const grantosPaginated = allGrantosItems.slice(grantosStartIdx, grantosStartIdx + limitNum);

    // Strip _similarity field before sending
    const cleanGovGrants = govPaginated.map(({ _similarity, ...rest }) => rest);
    const cleanGrantosGrants = grantosPaginated.map(({ _similarity, ...rest }) => rest);

    res.json({
      success: true,
      government: {
        grants: cleanGovGrants,
        total: govGrants.length,
        page: govPageNum,
        totalPages: Math.ceil(govGrants.length / limitNum),
      },
      grantos: {
        grants: cleanGrantosGrants,
        total: allGrantosItems.length,
        page: grantosPageNum,
        totalPages: Math.ceil(allGrantosItems.length / limitNum),
      },
      filters: {
        govAgencies: govAgencyOptions,
        grantosAgencies: grantosAgencyOptions,
      },
      pagination: {
        page: govPageNum,
        limit: limitNum,
        total: govGrants.length,
        totalPages: Math.ceil(govGrants.length / limitNum),
      },
      grants: cleanGovGrants,
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

