const { validationResult } = require('express-validator');
const FundingAgency = require('../models/FundingAgency');
const User = require('../models/User');

// @desc    Register a funding agency (submit for verification)
// @route   POST /api/agency/register
// @access  Private (funding_agency)
const registerFundingAgency = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check if user already has a funding agency
    if (req.user.fundingAgency) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered a funding agency',
      });
    }

    const agencyData = {
      agencyName: req.body.agencyName,
      agencyType: req.body.agencyType,
      establishedYear: req.body.establishedYear,
      website: req.body.website || '',
      headquarters: {
        street: req.body.headquarters?.street,
        city: req.body.headquarters?.city,
        state: req.body.headquarters?.state,
        pincode: req.body.headquarters?.pincode,
        country: req.body.headquarters?.country || 'India',
      },
      cin: req.body.cin || '',
      darpanId: req.body.darpanId || '',
      csrRegistrationNumber: req.body.csrRegistrationNumber || '',
      fundingDomains: req.body.fundingDomains || [],
      grantTypesOffered: req.body.grantTypesOffered || [],
      contactPerson: {
        name: req.body.contactPerson?.name,
        designation: req.body.contactPerson?.designation || '',
        email: req.body.contactPerson?.email,
        phone: req.body.contactPerson?.phone,
      },
      authorizationLetterUrl: req.body.authorizationLetterUrl || '',
      registrationCertificateUrl: req.body.registrationCertificateUrl || '',
      status: 'pending',
      submittedAt: new Date(),
      createdBy: req.user._id,
    };

    const agency = await FundingAgency.create(agencyData);

    // Link agency to user
    await User.findByIdAndUpdate(req.user._id, {
      fundingAgency: agency._id,
    });

    res.status(201).json({
      success: true,
      message:
        'Funding agency registered successfully. Your application is under review. You will receive an email notification within 3 days.',
      agency: {
        id: agency._id,
        agencyName: agency.agencyName,
        status: agency.status,
        submittedAt: agency.submittedAt,
      },
    });
  } catch (error) {
    console.error('Agency registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during agency registration',
    });
  }
};

// @desc    Get funding agency status
// @route   GET /api/agency/status
// @access  Private (funding_agency)
const getAgencyStatus = async (req, res) => {
  try {
    if (!req.user.fundingAgency) {
      return res.status(404).json({
        success: false,
        message: 'No funding agency found. Please register your agency first.',
        hasAgency: false,
      });
    }

    const agency = await FundingAgency.findById(req.user.fundingAgency);
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Funding agency not found',
        hasAgency: false,
      });
    }

    res.json({
      success: true,
      hasAgency: true,
      agency: {
        id: agency._id,
        agencyName: agency.agencyName,
        status: agency.status,
        submittedAt: agency.submittedAt,
        reviewedAt: agency.reviewedAt,
        rejectionReason: agency.rejectionReason || null,
      },
    });
  } catch (error) {
    console.error('Get agency status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = { registerFundingAgency, getAgencyStatus };
