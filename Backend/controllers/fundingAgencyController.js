const { validationResult } = require('express-validator');
const FundingAgency = require('../models/FundingAgency');
const GrantProgram = require('../models/GrantProgram');
const Proposal = require('../models/Proposal');
const User = require('../models/User');

// Helper: ensure the logged-in user has an approved funding agency profile,
// and return it. Sends the appropriate error response itself if not.
const getApprovedAgencyOrRespond = async (req, res) => {
  if (!req.user.fundingAgency) {
    res.status(404).json({
      success: false,
      message: 'No funding agency found. Please register your agency first.',
      hasAgency: false,
    });
    return null;
  }

  const agency = await FundingAgency.findById(req.user.fundingAgency);
  if (!agency) {
    res.status(404).json({
      success: false,
      message: 'Funding agency not found',
      hasAgency: false,
    });
    return null;
  }

  return agency;
};

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
      shortName: req.body.shortName || '',
      agencyType: req.body.agencyType,
      organizationType: req.body.organizationType || '',
      ownershipType: req.body.ownershipType || '',
      registrationNumber: req.body.registrationNumber || '',
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
        cin: agency.cin || '',
        darpanId: agency.darpanId || '',
        isLegallyVerified: Boolean(agency.cin || agency.darpanId),
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

// Fields locked once a grant call is past Draft/Upcoming — substantive
// content is frozen at publish time; only light-touch fields stay editable.
const GRANT_LOCKED_AFTER_PUBLISH = [
  'category',
  'fundingType',
  'budget',
  'budgetAmount',
  'deadline',
  'startDate',
  'projectDurationMonths',
  'eligibility',
  'eligibilityRulesText',
  'evaluationCriteria',
  'shortTitle',
  'researchAreas',
  'projectRequirements',
  'allowableExpenses',
  'nonAllowableExpenses',
  'budgetRules',
  'proposalRequirements',
];
const GRANT_ALWAYS_EDITABLE = ['title', 'description', 'status', 'contactInformation', 'applicationProcess'];
const GRANT_ALL_EDITABLE_FIELDS = [...GRANT_ALWAYS_EDITABLE, ...GRANT_LOCKED_AFTER_PUBLISH];

// @desc    Create a new grant program as a Draft
// @route   POST /api/agency/programs
// @access  Private (funding_agency, agency must be approved)
const createGrantProgram = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    if (agency.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your agency must be approved before creating grant calls',
      });
    }

    const {
      title,
      shortTitle,
      category,
      fundingType,
      description,
      budget,
      budgetAmount,
      startDate,
      deadline,
      projectDurationMonths,
      eligibility,
      eligibilityRulesText,
      researchAreas,
      projectRequirements,
      allowableExpenses,
      nonAllowableExpenses,
      budgetRules,
      proposalRequirements,
      applicationProcess,
      contactInformation,
      evaluationCriteria,
    } = req.body;

    // Drafts are intentionally permissive — only title is required (enforced by
    // the route validator). No weight-total check here; that is enforced only
    // at publish time in publishGrantProgram. Ownership (fundingAgency,
    // createdBy) is always derived from the authenticated session — never
    // accepted from the request body.
    const program = await GrantProgram.create({
      title,
      shortTitle: shortTitle || '',
      category: category || null,
      fundingType: fundingType || 'Project Grant',
      description: description || '',
      budget: budget || '',
      budgetAmount: budgetAmount || 0,
      startDate: startDate || null,
      deadline: deadline || null,
      projectDurationMonths: projectDurationMonths || {},
      eligibility: eligibility || {},
      eligibilityRulesText: eligibilityRulesText || '',
      researchAreas: researchAreas || [],
      projectRequirements: projectRequirements || '',
      allowableExpenses: allowableExpenses || '',
      nonAllowableExpenses: nonAllowableExpenses || '',
      budgetRules: budgetRules || '',
      proposalRequirements: proposalRequirements || '',
      applicationProcess: applicationProcess || '',
      contactInformation: contactInformation || {},
      evaluationCriteria: evaluationCriteria || [],
      status: 'Draft',
      fundingAgency: agency._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Grant call saved as draft',
      program,
    });
  } catch (error) {
    console.error('Create grant program error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating grant program' });
  }
};

// @desc    Get all grant programs published by the logged-in agency
// @route   GET /api/agency/programs
// @access  Private (funding_agency)
const getMyGrantPrograms = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const programs = await GrantProgram.find({
      fundingAgency: agency._id,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    // Attach live proposal counts per program
    const programsWithCounts = await Promise.all(
      programs.map(async (p) => {
        const applicationsCount = await Proposal.countDocuments({ grantProgram: p._id });
        return { ...p.toObject(), applicationsCount };
      })
    );

    res.json({ success: true, programs: programsWithCounts });
  } catch (error) {
    console.error('Get grant programs error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching grant programs' });
  }
};

// @desc    Update a grant program (e.g. edit call, change status). This is the
//          endpoint used every time a draft is re-saved — the frontend always
//          calls PUT here once the program has an _id, never POST again.
//          Ownership is re-verified on every request via the scoped query.
// @route   PUT /api/agency/programs/:id
// @access  Private (funding_agency, must own the program)
const updateGrantProgram = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const program = await GrantProgram.findOne({
      _id: req.params.id,
      fundingAgency: agency._id,
      isDeleted: { $ne: true },
    });

    if (!program) {
      return res.status(404).json({ success: false, message: 'Grant program not found' });
    }

    const isLifecycleLocked = !['Draft', 'Upcoming'].includes(program.status);

    if (isLifecycleLocked) {
      const attemptedLockedEdit = GRANT_LOCKED_AFTER_PUBLISH.some((f) => req.body[f] !== undefined);
      if (attemptedLockedEdit) {
        return res.status(403).json({
          success: false,
          message: `This grant call is ${program.status} — core details can no longer be edited`,
        });
      }
    }

    const allowedFields = isLifecycleLocked ? GRANT_ALWAYS_EDITABLE : GRANT_ALL_EDITABLE_FIELDS;
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        program[field] = req.body[field];
        // Array/subdocument-array fields occasionally need an explicit nudge
        // so Mongoose reliably persists a full replacement — cheap insurance,
        // directly targets the evaluation-criteria save issue.
        if (Array.isArray(req.body[field]) || (req.body[field] && typeof req.body[field] === 'object')) {
          program.markModified(field);
        }
      }
    });

    // Audit: who last touched this record — always derived from the session.
    program.updatedBy = req.user._id;

    await program.save();

    res.json({ success: true, message: 'Grant program updated', program });
  } catch (error) {
    console.error('Update grant program error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating grant program' });
  }
};

// @desc    Validate and publish a Draft/Upcoming grant call, transitioning it to Active
// @route   PUT /api/agency/programs/:id/publish
// @access  Private (funding_agency, must own the program)
const publishGrantProgram = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    if (agency.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your agency must be approved before publishing grant calls',
      });
    }

    const program = await GrantProgram.findOne({
      _id: req.params.id,
      fundingAgency: agency._id,
      isDeleted: { $ne: true },
    });

    if (!program) {
      return res.status(404).json({ success: false, message: 'Grant program not found' });
    }

    if (!['Draft', 'Upcoming'].includes(program.status)) {
      return res.status(400).json({
        success: false,
        message: `Only Draft or Upcoming grant calls can be published (current status: ${program.status})`,
      });
    }

    // ─── Full publish validation ───
    const errors = [];

    if (!program.title || !program.title.trim()) errors.push('Grant title is required.');
    if (!program.category) errors.push('Category is required.');
    if (!program.budget || !program.budget.trim()) errors.push('Budget is required.');
    if (!program.budgetAmount || program.budgetAmount <= 0) {
      errors.push('A valid numeric budget amount is required.');
    }
    if (!program.deadline) {
      errors.push('Submission deadline is required.');
    } else if (new Date(program.deadline) <= new Date()) {
      errors.push('Submission deadline must be in the future.');
    }

    const criteria = program.evaluationCriteria || [];
    if (criteria.length === 0) {
      errors.push('At least one evaluation criterion is required.');
    } else {
      const total = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
      if (total !== 100) {
        errors.push(`Evaluation criteria weights must total exactly 100 (currently ${total}).`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Grant call cannot be published until all required information is valid',
        errors,
      });
    }

    program.status = 'Active';
    program.publishedAt = new Date();
    program.publishedBy = req.user._id;
    program.updatedBy = req.user._id;
    await program.save();

    res.json({ success: true, message: 'Grant call published successfully', program });
  } catch (error) {
    console.error('Publish grant program error:', error);
    res.status(500).json({ success: false, message: 'Server error while publishing grant program' });
  }
};

// @desc    Upload/replace the PDF document specific to a grant call
//          (e.g. guidelines). Distinct from the removed agency-level
//          Verification Document feature — this is per-grant-call and
//          viewable on the Grant Details page, no admin approval workflow.
// @route   POST /api/agency/programs/:id/document
// @access  Private (funding_agency, must own the program)
const uploadGrantDocument = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const program = await GrantProgram.findOne({
      _id: req.params.id,
      fundingAgency: agency._id,
      isDeleted: { $ne: true },
    });

    if (!program) {
      return res.status(404).json({ success: false, message: 'Grant program not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file was uploaded' });
    }

    program.document = {
      fileName: req.file.originalname,
      fileUrl: `/uploads/grant-documents/${req.file.filename}`,
      documentType: req.body.documentType || 'Guidelines',
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
    };
    program.updatedBy = req.user._id;
    await program.save();

    res.json({ success: true, message: 'Document uploaded successfully', document: program.document });
  } catch (error) {
    console.error('Upload grant document error:', error);
    res.status(500).json({ success: false, message: 'Server error while uploading document' });
  }
};

// @desc    Delete a grant program. If proposals already exist against it, the
//          record is soft-deleted (archived) to preserve application history;
//          otherwise it is permanently removed. Frontend is responsible for
//          the required two-step user confirmation before calling this at all.
// @route   DELETE /api/agency/programs/:id
// @access  Private (funding_agency, must own the program)
const deleteGrantProgram = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    // Ownership is enforced by scoping the query itself — a program that
    // belongs to a different agency simply won't match and returns 404,
    // regardless of what the request claims.
    const program = await GrantProgram.findOne({
      _id: req.params.id,
      fundingAgency: agency._id,
    });

    if (!program) {
      return res.status(404).json({ success: false, message: 'Grant program not found' });
    }

    const proposalCount = await Proposal.countDocuments({ grantProgram: program._id });

    if (proposalCount > 0) {
      // Proposals/applications exist — never hard-delete. Soft-delete instead
      // so downstream proposal/application data is preserved.
      program.isDeleted = true;
      program.deletedAt = new Date();
      program.deletedBy = req.user._id;
      program.deletionReason = (req.body && req.body.reason) || '';
      program.status = 'Archived';
      await program.save();

      return res.json({
        success: true,
        message: `Grant call archived — ${proposalCount} associated proposal(s) were preserved`,
        softDeleted: true,
      });
    }

    await GrantProgram.findByIdAndDelete(program._id);

    res.json({ success: true, message: 'Grant call permanently deleted', softDeleted: false });
  } catch (error) {
    console.error('Delete grant program error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting grant program' });
  }
};


// @desc    Get all proposals actually SUBMITTED to this agency's grant programs.
//          Proposals still 'In Progress' or 'Draft' on the org side never
//          appear here — only after the org admin explicitly submits.
// @route   GET /api/agency/proposals
// @access  Private (funding_agency)
const getAgencyProposals = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const programs = await GrantProgram.find({ fundingAgency: agency._id }).select('_id');
    const programIds = programs.map((p) => p._id);

    const proposals = await Proposal.find({
      grantProgram: { $in: programIds },
      status: { $in: ['Submitted', 'Under Review', 'Shortlisted', 'Rejected', 'Awarded', 'Not Awarded'] },
    })
      .populate(
        'organization',
        'organizationName organizationType registrationNumber establishedYear website address contactPerson'
      )
      .populate('grantProgram', 'title')
      .sort({ submittedAt: -1, createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Get agency proposals error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching proposals' });
  }
};

// @desc    Get one proposal in full detail, for the agency review page
//          (organization info, eligibility snapshot, AI score, sections, decision)
// @route   GET /api/agency/proposals/:id
// @access  Private (funding_agency, must own the underlying grant program)
const getAgencyProposalDetail = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const proposal = await Proposal.findById(req.params.id)
      .populate({
        path: 'organization',
        select:
          'organizationName organizationType registrationNumber establishedYear website address contactPerson naacAccreditation ugcRecognition focusAreas totalFaculty totalPhDScholars status',
      })
      .populate('grantProgram');

    if (!proposal || !proposal.grantProgram) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    // Ownership check: this proposal's grant program must belong to the logged-in agency
    if (proposal.grantProgram.fundingAgency.toString() !== agency._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this proposal' });
    }

    res.json({ success: true, proposal });
  } catch (error) {
    console.error('Get agency proposal detail error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching proposal' });
  }
};

// @desc    Record the agency's decision on a proposal (shortlist / reject / award / not_awarded)
// @route   PUT /api/agency/proposals/:id/decision
// @access  Private (funding_agency, must own the underlying grant program)
const updateProposalDecision = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const { status, notes, awardAmount } = req.body;
    const validStatuses = ['shortlisted', 'rejected', 'awarded', 'not_awarded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid decision status' });
    }

    const proposal = await Proposal.findById(req.params.id).populate('grantProgram');
    if (!proposal || !proposal.grantProgram) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.grantProgram.fundingAgency.toString() !== agency._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this proposal' });
    }

    if (status === 'awarded') {
      if (!awardAmount || Number(awardAmount) <= 0) {
        return res.status(400).json({ success: false, message: 'A valid award amount is required' });
      }
      proposal.awardAmount = Number(awardAmount);
    }

    proposal.decision = {
      status,
      notes: notes || '',
      decidedAt: new Date(),
      decidedBy: req.user._id,
    };

    // Mirror the decision onto the proposal's own status field so existing
    // status-based UI (badges, filters) reflects it without extra lookups.
    const statusMap = {
      shortlisted: 'Shortlisted',
      rejected: 'Rejected',
      awarded: 'Awarded',
      not_awarded: 'Not Awarded',
    };
    proposal.status = statusMap[status];

    await proposal.save();

    res.json({ success: true, message: 'Decision recorded', proposal });
  } catch (error) {
    console.error('Update proposal decision error:', error);
    res.status(500).json({ success: false, message: 'Server error while recording decision' });
  }
};

// @desc    Get aggregate dashboard stats for the agency (funding pool, counts, etc.)
// @route   GET /api/agency/stats
// @access  Private (funding_agency)
const getAgencyStats = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const programs = await GrantProgram.find({ fundingAgency: agency._id, isDeleted: { $ne: true } });
    const programIds = programs.map((p) => p._id);

    const activePrograms = programs.filter((p) => p.status === 'Active').length;
    const totalFundPool = programs.reduce((sum, p) => sum + (p.budgetAmount || 0), 0);

    const proposalsCount = await Proposal.countDocuments({
      grantProgram: { $in: programIds },
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newThisWeek = await Proposal.countDocuments({
      grantProgram: { $in: programIds },
      createdAt: { $gte: oneWeekAgo },
    });

    const scoredProposals = await Proposal.find({
      grantProgram: { $in: programIds },
      aiScore: { $ne: null },
    }).select('aiScore');

    const aiMatchAccuracy =
      scoredProposals.length > 0
        ? (
            scoredProposals.reduce((sum, p) => sum + p.aiScore, 0) / scoredProposals.length
          ).toFixed(1)
        : null;

    res.json({
      success: true,
      stats: {
        activePrograms,
        totalPrograms: programs.length,
        totalFundPool,
        proposalsCount,
        newThisWeek,
        aiMatchAccuracy,
      },
    });
  } catch (error) {
    console.error('Get agency stats error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching stats' });
  }
};

// @desc    Submit/update legal verification identifiers (CIN / Darpan ID)
// @route   PUT /api/agency/legal-verification
// @access  Private (funding_agency)
const updateLegalVerification = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const { cin, darpanId } = req.body;

    if (!cin?.trim() && !darpanId?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one of CIN or Darpan ID',
      });
    }

    if (cin !== undefined) agency.cin = cin.trim();
    if (darpanId !== undefined) agency.darpanId = darpanId.trim();
    await agency.save();

    res.json({
      success: true,
      message: 'Legal verification details saved',
      agency: {
        cin: agency.cin,
        darpanId: agency.darpanId,
        isLegallyVerified: Boolean(agency.cin || agency.darpanId),
      },
    });
  } catch (error) {
    console.error('Update legal verification error:', error);
    res.status(500).json({ success: false, message: 'Server error while saving verification details' });
  }
};

// Fields the agency is allowed to self-edit after approval.
// Everything else (agencyName, agencyType, establishedYear, contactPerson.email,
// status, cin/darpanId, registration documents) is locked — identity/legal
// fields go through admin review or the dedicated legal-verification endpoint.
const EDITABLE_HEADQUARTERS_FIELDS = ['street', 'city', 'state', 'pincode', 'country'];
const EDITABLE_CONTACT_FIELDS = ['designation', 'phone']; // name/email are identity-locked

// @desc    Get the full agency profile (for the Profile page)
// @route   GET /api/agency/profile
// @access  Private (funding_agency)
const getFullProfile = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    res.json({
      success: true,
      agency: {
        id: agency._id,
        agencyName: agency.agencyName,
        shortName: agency.shortName,
        agencyType: agency.agencyType,
        organizationType: agency.organizationType,
        ownershipType: agency.ownershipType,
        registrationNumber: agency.registrationNumber,
        establishedYear: agency.establishedYear,
        website: agency.website,
        description: agency.description,
        mission: agency.mission,
        vision: agency.vision,
        headquarters: agency.headquarters,
        cin: agency.cin,
        darpanId: agency.darpanId,
        csrRegistrationNumber: agency.csrRegistrationNumber,
        grantTypesOffered: agency.grantTypesOffered,
        fundingAmountMin: agency.fundingAmountMin,
        fundingAmountMax: agency.fundingAmountMax,
        fundingDurationMonths: agency.fundingDurationMonths,
        fundingFrequency: agency.fundingFrequency,
        eligibleApplicantTypes: agency.eligibleApplicantTypes,
        fundingScope: agency.fundingScope,
        fundingStates: agency.fundingStates,
        contactPerson: agency.contactPerson,
        authorizationLetterUrl: agency.authorizationLetterUrl,
        registrationCertificateUrl: agency.registrationCertificateUrl,
        status: agency.status,
        submittedAt: agency.submittedAt,
        reviewedAt: agency.reviewedAt,
        updatedAt: agency.updatedAt,
        isLegallyVerified: Boolean(agency.cin || agency.darpanId),
        profileCompletion: agency.profileCompletion,
      },
    });
  } catch (error) {
    console.error('Get full profile error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching profile' });
  }
};

// @desc    Update the editable subset of the agency profile
// @route   PUT /api/agency/profile
// @access  Private (funding_agency)
const updateProfile = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const {
      website,
      csrRegistrationNumber,
      description,
      mission,
      vision,
      grantTypesOffered,
      headquarters,
      contactPerson,
      fundingAmountMin,
      fundingAmountMax,
      fundingDurationMonths,
      fundingFrequency,
      eligibleApplicantTypes,
      fundingScope,
      fundingStates,
    } = req.body;

    // Simple top-level strings — allow clearing (empty string) as a deliberate "delete"
    if (website !== undefined) agency.website = website.trim();
    if (csrRegistrationNumber !== undefined) agency.csrRegistrationNumber = csrRegistrationNumber.trim();
    if (description !== undefined) agency.description = description.slice(0, 1000);
    if (mission !== undefined) agency.mission = mission.slice(0, 1000);
    if (vision !== undefined) agency.vision = vision.slice(0, 1000);

    // Arrays — full replace, lets the client add/remove entries (chip UI)
    if (Array.isArray(grantTypesOffered)) agency.grantTypesOffered = grantTypesOffered;
    if (Array.isArray(eligibleApplicantTypes)) agency.eligibleApplicantTypes = eligibleApplicantTypes;
    if (Array.isArray(fundingStates)) agency.fundingStates = fundingStates;

    // Funding range / duration / frequency / scope
    if (fundingAmountMin !== undefined) agency.fundingAmountMin = fundingAmountMin;
    if (fundingAmountMax !== undefined) agency.fundingAmountMax = fundingAmountMax;
    if (fundingDurationMonths && typeof fundingDurationMonths === 'object') {
      agency.fundingDurationMonths = {
        min: fundingDurationMonths.min ?? null,
        max: fundingDurationMonths.max ?? null,
      };
    }
    if (fundingFrequency !== undefined) agency.fundingFrequency = fundingFrequency;
    if (fundingScope !== undefined) agency.fundingScope = fundingScope;

    // Headquarters — only the whitelisted sub-fields
    if (headquarters && typeof headquarters === 'object') {
      EDITABLE_HEADQUARTERS_FIELDS.forEach((field) => {
        if (headquarters[field] !== undefined) {
          agency.headquarters[field] = String(headquarters[field]).trim();
        }
      });
    }

    // Contact person — only designation/phone; name and email stay locked
    if (contactPerson && typeof contactPerson === 'object') {
      EDITABLE_CONTACT_FIELDS.forEach((field) => {
        if (contactPerson[field] !== undefined) {
          agency.contactPerson[field] = String(contactPerson[field]).trim();
        }
      });
    }

    await agency.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      agency: agency.toObject({ virtuals: true }),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating profile' });
  }
};

module.exports = {
  registerFundingAgency,
  getAgencyStatus,
  createGrantProgram,
  publishGrantProgram,
  getMyGrantPrograms,
  updateGrantProgram,
  uploadGrantDocument,
  deleteGrantProgram,
  getAgencyProposals,
  getAgencyProposalDetail,
  updateProposalDecision,
  getAgencyStats,
  updateLegalVerification,
  getFullProfile,
  updateProfile,
};