const { validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const User = require('../models/User');

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

module.exports = { registerOrganization, getOrgStatus };
