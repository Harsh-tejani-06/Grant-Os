/**
 * controllers/grantAdminController.js
 *
 * Admin-facing endpoints for reviewing and managing scraped grants.
 * Protected by `protect` + `requireRole('system_admin')`.
 *
 * Key endpoints:
 *   - GET /review    → grants flagged needsReview=true
 *   - GET /          → all grants with filters (status, agency, grantType, etc.)
 *   - GET /:id       → single grant detail
 *   - PUT /:id/approve → mark a grant as reviewed (needsReview=false)
 *   - PUT /:id/edit    → admin edit of a grant (e.g. fix extracted data)
 */

const GrantListing = require('../models/GrantListing');

// @desc    Get grants needing review
// @route   GET /api/admin/grants/review
// @access  Private (system_admin)
const getGrantsForReview = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { needsReview: true };

    // Optional filters
    if (req.query.agency) {
      filter['agency.name'] = { $regex: req.query.agency, $options: 'i' };
    }
    if (req.query.website) {
      filter['source.website'] = req.query.website;
    }

    const [grants, total] = await Promise.all([
      GrantListing.find(filter)
        .sort({ lastScrapedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GrantListing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      grants,
    });
  } catch (error) {
    console.error('Get grants for review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all grants with optional filters
// @route   GET /api/admin/grants
// @access  Private (system_admin)
const getAllGrants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    // Filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.grantType) filter.grantType = req.query.grantType;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.needsReview !== undefined) filter.needsReview = req.query.needsReview === 'true';
    if (req.query.sourceType) filter['source.type'] = req.query.sourceType;
    if (req.query.website) filter['source.website'] = req.query.website;
    if (req.query.agency) {
      filter['agency.name'] = { $regex: req.query.agency, $options: 'i' };
    }
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Sort
    const sortField = req.query.sortBy || 'lastScrapedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [grants, total, counts] = await Promise.all([
      GrantListing.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      GrantListing.countDocuments(filter),
      _getCounts(),
    ]);

    res.json({
      success: true,
      counts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      grants,
    });
  } catch (error) {
    console.error('Get all grants error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single grant by ID
// @route   GET /api/admin/grants/:id
// @access  Private (system_admin)
const getGrantById = async (req, res) => {
  try {
    const grant = await GrantListing.findById(req.params.id);

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found',
      });
    }

    res.json({ success: true, grant });
  } catch (error) {
    console.error('Get grant by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Approve a grant (mark as reviewed)
// @route   PUT /api/admin/grants/:id/approve
// @access  Private (system_admin)
const approveGrant = async (req, res) => {
  try {
    const grant = await GrantListing.findById(req.params.id);

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found',
      });
    }

    grant.needsReview = false;
    await grant.save();

    res.json({
      success: true,
      message: `Grant "${grant.title}" marked as reviewed`,
      grant: {
        id: grant._id,
        grantId: grant.grantId,
        title: grant.title,
        needsReview: grant.needsReview,
      },
    });
  } catch (error) {
    console.error('Approve grant error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Admin edit a grant
// @route   PUT /api/admin/grants/:id/edit
// @access  Private (system_admin)
const editGrant = async (req, res) => {
  try {
    const grant = await GrantListing.findById(req.params.id);

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Grant not found',
      });
    }

    // Allowed fields for admin edit
    const editableFields = [
      'title', 'grantType', 'categoryRaw', 'description',
      'eligibilityText', 'applicationProcedure', 'status',
    ];

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        grant[field] = req.body[field];
      }
    }

    // Sub-document fields
    if (req.body.deadline) {
      Object.assign(grant.deadline, req.body.deadline);
    }
    if (req.body.fundingAmount) {
      Object.assign(grant.fundingAmount, req.body.fundingAmount);
    }
    if (req.body.duration) {
      Object.assign(grant.duration, req.body.duration);
    }
    if (req.body.links) {
      Object.assign(grant.links, req.body.links);
    }
    if (req.body.focusAreas) {
      grant.focusAreas = req.body.focusAreas;
    }
    if (req.body.eligibleApplicantTypes) {
      grant.eligibleApplicantTypes = req.body.eligibleApplicantTypes;
    }

    await grant.save(); // pre-validate hook will recompute missingFields/needsReview

    res.json({
      success: true,
      message: `Grant "${grant.title}" updated`,
      grant,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, errors });
    }
    console.error('Edit grant error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Helper ───

async function _getCounts() {
  const [total, active, needsReview, scraped, agencySubmitted] = await Promise.all([
    GrantListing.countDocuments(),
    GrantListing.countDocuments({ isActive: true }),
    GrantListing.countDocuments({ needsReview: true }),
    GrantListing.countDocuments({ 'source.type': 'scraped' }),
    GrantListing.countDocuments({ 'source.type': 'agency_submitted' }),
  ]);
  return { total, active, needsReview, scraped, agencySubmitted };
}

module.exports = {
  getGrantsForReview,
  getAllGrants,
  getGrantById,
  approveGrant,
  editGrant,
};
