const { validationResult } = require('express-validator');
const FundingAgency = require('../models/FundingAgency');
const GrantListing = require('../models/GrantListing');
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

// @desc    Publish a new grant call (creates a GrantListing with source.type 'agency_submitted')
// @route   POST /api/agency/grants
// @access  Private (funding_agency, approved only)
const publishGrantCall = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Ensure the user has a linked funding agency
    if (!req.user.fundingAgency) {
      return res.status(403).json({
        success: false,
        message: 'No funding agency profile found. Please register first.',
      });
    }

    const agency = await FundingAgency.findById(req.user.fundingAgency);
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Funding agency not found.',
      });
    }

    // Only approved agencies can publish
    if (agency.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Your agency is currently "${agency.status}". Only approved agencies can publish grant calls.`,
      });
    }

    const {
      title,
      description,
      grantType,
      categoryRaw,
      eligibilityText,
      applicationProcedure,
      deadline,        // ISO date string
      fundingAmount,   // { rawText, minINR, maxINR }
      duration,        // { rawText, months }
      focusAreas,      // string[] or comma-separated string
      eligibleApplicantTypes, // string[]
      infoUrl,
      applicationUrl,
      guidelinesUrl,
    } = req.body;

    // Parse focusAreas: accept array or comma-separated string
    let parsedFocusAreas = [];
    if (Array.isArray(focusAreas)) {
      parsedFocusAreas = focusAreas.map((s) => s.trim()).filter(Boolean);
    } else if (typeof focusAreas === 'string' && focusAreas.trim()) {
      parsedFocusAreas = focusAreas.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Build the deadline sub-document
    const deadlineDoc = {
      type: deadline ? 'fixed' : 'unknown',
      rawText: deadline
        ? new Date(deadline).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      parsedDate: deadline ? new Date(deadline) : null,
      lastVerifiedAt: new Date(),
    };

    // Build the funding amount sub-document
    const fundingAmountDoc = {
      rawText: fundingAmount?.rawText || '',
      minINR: fundingAmount?.minINR != null ? Number(fundingAmount.minINR) : null,
      maxINR: fundingAmount?.maxINR != null ? Number(fundingAmount.maxINR) : null,
      currency: 'INR',
    };

    // Build the duration sub-document
    const durationDoc = {
      rawText: duration?.rawText || '',
      months: duration?.months != null ? Number(duration.months) : null,
    };

    // Compute grantId
    const grantId = GrantListing.computeGrantId(agency.agencyName, title, infoUrl);

    // Check for duplicate
    const existing = await GrantListing.findOne({ grantId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A grant call with this title and URL already exists for your agency.',
      });
    }

    const grantData = {
      grantId,
      title: title.trim(),
      agency: {
        name: agency.agencyName,
        ref: agency._id,
        parentBody: '',
        implementingBody: '',
      },
      grantType: grantType || 'other',
      categoryRaw: categoryRaw || '',
      description: description || '',
      eligibilityText: eligibilityText || '',
      deadline: deadlineDoc,
      fundingAmount: fundingAmountDoc,
      duration: durationDoc,
      applicationProcedure: applicationProcedure || '',
      links: {
        infoUrl,
        applicationUrl: applicationUrl || '',
        guidelinesUrl: guidelinesUrl || '',
      },
      focusAreas: parsedFocusAreas,
      eligibleApplicantTypes: eligibleApplicantTypes || [],
      status: 'active',
      source: {
        type: 'agency_submitted',
        website: agency.website || '',
        extractionMethod: 'manual',
        confidenceScore: 1.0,
      },
      postedBy: req.user._id,
      isActive: true,
    };

    const grant = await GrantListing.create(grantData);

    res.status(201).json({
      success: true,
      message: 'Grant call published successfully! It is now discoverable by organizations.',
      grant: {
        id: grant._id,
        grantId: grant.grantId,
        title: grant.title,
        grantType: grant.grantType,
        status: grant.status,
        deadline: grant.deadline,
        fundingAmount: grant.fundingAmount,
        createdAt: grant.createdAt,
      },
    });
  } catch (error) {
    console.error('Publish grant call error:', error);

    // Handle Mongoose validation errors with friendly messages
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while publishing grant call',
    });
  }
};

// @desc    Get all grant calls published by the logged-in funding agency
// @route   GET /api/agency/grants
// @access  Private (funding_agency)
const getMyGrantCalls = async (req, res) => {
  try {
    if (!req.user.fundingAgency) {
      return res.status(404).json({
        success: false,
        message: 'No funding agency profile found.',
        grants: [],
      });
    }

    const grants = await GrantListing.find({
      'agency.ref': req.user.fundingAgency,
      'source.type': 'agency_submitted',
    })
      .sort({ createdAt: -1 })
      .select(
        'grantId title grantType categoryRaw description status deadline fundingAmount duration focusAreas eligibleApplicantTypes links isActive createdAt'
      );

    res.json({
      success: true,
      count: grants.length,
      grants,
    });
  } catch (error) {
    console.error('Get my grant calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching grant calls',
    });
  }
};

module.exports = { registerFundingAgency, getAgencyStatus, publishGrantCall, getMyGrantCalls };
