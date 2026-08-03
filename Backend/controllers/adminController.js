const Organization = require('../models/Organization');
const FundingAgency = require('../models/FundingAgency');
const {
  sendApprovalEmail,
  sendRejectionEmail,
  sendAgencyApprovalEmail,
  sendAgencyRejectionEmail,
} = require('../utils/sendEmail');

// @desc    Get all organizations (with optional status filter)
// @route   GET /api/admin/organizations
// @access  Private (system_admin)
const getAllOrganizations = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const organizations = await Organization.find(filter)
      .populate('createdBy', 'fullName email')
      .populate('reviewedBy', 'fullName email')
      .sort({ submittedAt: -1 });

    // Count by status
    const counts = {
      total: await Organization.countDocuments(),
      pending: await Organization.countDocuments({ status: 'pending' }),
      approved: await Organization.countDocuments({ status: 'approved' }),
      rejected: await Organization.countDocuments({ status: 'rejected' }),
    };

    res.json({
      success: true,
      counts,
      organizations,
    });
  } catch (error) {
    console.error('Get all orgs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single organization details
// @route   GET /api/admin/organizations/:id
// @access  Private (system_admin)
const getOrganizationById = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('reviewedBy', 'fullName email');

    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    res.json({
      success: true,
      organization: org,
    });
  } catch (error) {
    console.error('Get org by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Approve organization
// @route   PUT /api/admin/organizations/:id/approve
// @access  Private (system_admin)
const approveOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);

    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    if (org.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Organization is already approved',
      });
    }

    org.status = 'approved';
    org.reviewedAt = new Date();
    org.reviewedBy = req.user._id;
    org.rejectionReason = '';
    await org.save();

    // Send approval email
    await sendApprovalEmail(org.contactPerson.email, org.organizationName);

    res.json({
      success: true,
      message: `Organization "${org.organizationName}" has been approved`,
      organization: {
        id: org._id,
        organizationName: org.organizationName,
        status: org.status,
        reviewedAt: org.reviewedAt,
      },
    });
  } catch (error) {
    console.error('Approve org error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during approval',
    });
  }
};

// @desc    Reject organization
// @route   PUT /api/admin/organizations/:id/reject
// @access  Private (system_admin)
const rejectOrganization = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const org = await Organization.findById(req.params.id);

    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    if (org.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Organization is already rejected',
      });
    }

    org.status = 'rejected';
    org.rejectionReason = reason;
    org.reviewedAt = new Date();
    org.reviewedBy = req.user._id;
    await org.save();

    // Send rejection email
    await sendRejectionEmail(
      org.contactPerson.email,
      org.organizationName,
      reason
    );

    res.json({
      success: true,
      message: `Organization "${org.organizationName}" has been rejected`,
      organization: {
        id: org._id,
        organizationName: org.organizationName,
        status: org.status,
        rejectionReason: org.rejectionReason,
        reviewedAt: org.reviewedAt,
      },
    });
  } catch (error) {
    console.error('Reject org error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during rejection',
    });
  }
};

// ═══════════════════════════════════════════════════════
// FUNDING AGENCY MANAGEMENT
// ═══════════════════════════════════════════════════════

// @desc    Get all funding agencies (with optional status filter)
// @route   GET /api/admin/agencies
// @access  Private (system_admin)
const getAllAgencies = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const agencies = await FundingAgency.find(filter)
      .populate('createdBy', 'fullName email')
      .populate('reviewedBy', 'fullName email')
      .sort({ submittedAt: -1 });

    const counts = {
      total: await FundingAgency.countDocuments(),
      pending: await FundingAgency.countDocuments({ status: 'pending' }),
      approved: await FundingAgency.countDocuments({ status: 'approved' }),
      rejected: await FundingAgency.countDocuments({ status: 'rejected' }),
    };

    res.json({
      success: true,
      counts,
      agencies,
    });
  } catch (error) {
    console.error('Get all agencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single funding agency details
// @route   GET /api/admin/agencies/:id
// @access  Private (system_admin)
const getAgencyById = async (req, res) => {
  try {
    const agency = await FundingAgency.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('reviewedBy', 'fullName email');

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Funding agency not found',
      });
    }

    res.json({
      success: true,
      agency,
    });
  } catch (error) {
    console.error('Get agency by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Approve funding agency
// @route   PUT /api/admin/agencies/:id/approve
// @access  Private (system_admin)
const approveAgency = async (req, res) => {
  try {
    const agency = await FundingAgency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Funding agency not found',
      });
    }

    if (agency.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Agency is already approved',
      });
    }

    agency.status = 'approved';
    agency.reviewedAt = new Date();
    agency.reviewedBy = req.user._id;
    agency.rejectionReason = '';
    await agency.save();

    // Send approval email
    await sendAgencyApprovalEmail(agency.contactPerson.email, agency.agencyName);

    res.json({
      success: true,
      message: `Funding agency "${agency.agencyName}" has been approved`,
      agency: {
        id: agency._id,
        agencyName: agency.agencyName,
        status: agency.status,
        reviewedAt: agency.reviewedAt,
      },
    });
  } catch (error) {
    console.error('Approve agency error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during approval',
    });
  }
};

// @desc    Reject funding agency
// @route   PUT /api/admin/agencies/:id/reject
// @access  Private (system_admin)
const rejectAgency = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const agency = await FundingAgency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Funding agency not found',
      });
    }

    if (agency.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Agency is already rejected',
      });
    }

    agency.status = 'rejected';
    agency.rejectionReason = reason;
    agency.reviewedAt = new Date();
    agency.reviewedBy = req.user._id;
    await agency.save();

    // Send rejection email
    await sendAgencyRejectionEmail(
      agency.contactPerson.email,
      agency.agencyName,
      reason
    );

    res.json({
      success: true,
      message: `Funding agency "${agency.agencyName}" has been rejected`,
      agency: {
        id: agency._id,
        agencyName: agency.agencyName,
        status: agency.status,
        rejectionReason: agency.rejectionReason,
        reviewedAt: agency.reviewedAt,
      },
    });
  } catch (error) {
    console.error('Reject agency error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during rejection',
    });
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  approveOrganization,
  rejectOrganization,
  getAllAgencies,
  getAgencyById,
  approveAgency,
  rejectAgency,
};
