const { validationResult } = require('express-validator');
const FundingAgency = require('../models/FundingAgency');
const GrantProgram = require('../models/GrantProgram');
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const { embedGrantText } = require('../utils/embeddings');
const socketHelper = require('../socket');

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

    // Pre-compute embedding for grant discovery (fire-and-forget; non-blocking)
    embedGrantText(program)
      .then(({ embedding, hash }) => {
        program.embedding = embedding;
        program.embeddingContentHash = hash;
        return program.save();
      })
      .catch((err) => console.error('Grant embedding computation failed (non-fatal):', err.message));

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

// ─────────────────────────────────────────────────────────────
// PROPOSAL TRACKING PIPELINE (agency side)
// ─────────────────────────────────────────────────────────────
//
// Status vocabulary is shared with the org-side Proposal Tracking
// Dashboard (TRACKING_STAGES). The agency can only move a proposal
// along the transitions below; Awarded / Rejected / Not Awarded /
// Accepted are terminal for the agency.
//
//   Submitted to Agency ──► Under Evaluation ──► Awarded
//          │                    │   ▲            Rejected
//          │                    ▼   │            Not Awarded
//          │             Revisions Requested
//          └──► Rejected (desk rejection)

const AGENCY_VISIBLE_STATUSES = [
  'Submitted to Agency',
  'Submitted',
  'Under Evaluation',
  'Revisions Requested',
  'Awarded',
  'Accepted',
  'Rejected',
  'Not Awarded',
];

const AWAITING_REVIEW_STATUSES = ['Submitted to Agency', 'Submitted'];
const AWARDED_STATUSES = ['Awarded', 'Accepted'];
const REJECTED_STATUSES = ['Rejected', 'Not Awarded'];

const AGENCY_TRANSITIONS = {
  'Submitted to Agency': ['Under Evaluation', 'Rejected'],
  Submitted: ['Under Evaluation', 'Rejected'],
  'Under Evaluation': ['Revisions Requested', 'Awarded', 'Rejected', 'Not Awarded'],
  'Revisions Requested': ['Under Evaluation', 'Rejected'],
};

// Accepts the UI vocabulary and the legacy lowercase decision codes.
const DECISION_ALIASES = {
  'Under Evaluation': 'Under Evaluation',
  under_evaluation: 'Under Evaluation',
  shortlisted: 'Under Evaluation', // legacy
  'Revisions Requested': 'Revisions Requested',
  revisions_requested: 'Revisions Requested',
  Awarded: 'Awarded',
  awarded: 'Awarded',
  Rejected: 'Rejected',
  rejected: 'Rejected',
  'Not Awarded': 'Not Awarded',
  not_awarded: 'Not Awarded',
};

// Mirrors the proposal status onto the legacy `decision.status` enum.
const LEGACY_DECISION_CODE = {
  'Under Evaluation': 'under_evaluation',
  'Revisions Requested': 'revisions_requested',
  Awarded: 'awarded',
  Rejected: 'rejected',
  'Not Awarded': 'not_awarded',
};

const REVIEW_SLA_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Proposal.fundingAmount is a display string ("₹25,00,000", "25 Lakh", "1.5 Cr").
// Prefer the numeric field when present, otherwise parse the string.
const parseAmountToNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value) return 0;
  const s = String(value).toLowerCase().replace(/,/g, '');
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (/crore|\bcr\b/.test(s)) n *= 1e7;
  else if (/lakh|\blac\b|\bl\b/.test(s)) n *= 1e5;
  return Math.round(n);
};

const requestedAmountOf = (p) =>
  p.requestedAmountValue || parseAmountToNumber(p.fundingAmount);

const submittedDateOf = (p) =>
  p.agencySubmission?.submittedAt || p.submittedAt || p.createdAt || null;

const daysBetween = (from, to) => (new Date(to) - new Date(from)) / MS_PER_DAY;

const round1 = (n) => Math.round(n * 10) / 10;
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

// All programmes owned by this agency. Archived (soft-deleted) programmes are
// included on purpose: deleting a grant call with proposals only archives it,
// and those proposals must stay visible and reviewable.
const getAgencyProgramIds = async (agencyId) => {
  const programs = await GrantProgram.find({ fundingAgency: agencyId }).select('_id');
  return programs.map((p) => p._id);
};

// @desc    Get all proposals actually SUBMITTED to this agency's grant programs.
//          Proposals still 'In Progress' or 'Draft' on the org side never
//          appear here — only after the org admin explicitly submits.
//          Heavy fields (sections, comments) are omitted; the review page
//          loads them through the detail endpoint.
// @route   GET /api/agency/proposals
// @access  Private (funding_agency)
const getAgencyProposals = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    const programIds = await getAgencyProgramIds(agency._id);

    const proposals = await Proposal.find({
      grantProgram: { $in: programIds },
      status: { $in: AGENCY_VISIBLE_STATUSES },
    })
      .select('-sections -comments')
      .populate(
        'organization',
        'organizationName organizationType registrationNumber establishedYear website address contactPerson'
      )
      .populate('grantProgram', 'title budgetAmount')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Get agency proposals error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching proposals' });
  }
};

// Funding pool position for one grant program: budget, already awarded, remaining.
const getProgramFunding = async (program, excludeProposalId = null) => {
  const budget = program.budgetAmount || 0;
  const filter = {
    grantProgram: program._id,
    status: { $in: AWARDED_STATUSES },
  };
  if (excludeProposalId) filter._id = { $ne: excludeProposalId };
  const awardedDocs = await Proposal.find(filter).select('awardAmount').lean();
  const awarded = awardedDocs.reduce((sum, p) => sum + (p.awardAmount || 0), 0);
  return { budget, awarded, remaining: budget > 0 ? Math.max(budget - awarded, 0) : null };
};

// @desc    Get one proposal in full detail, for the agency review page
//          (organization info, eligibility snapshot, AI score, sections,
//          decision, tracking timeline, programme funding position)
// @route   GET /api/agency/proposals/:id
// @access  Private (funding_agency, must own the underlying grant program)
// @desc    Get one proposal in full detail, for the agency review page
//          (organization info, eligibility snapshot, AI score, sections,
//          decision, tracking timeline, programme funding position)
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

    // Proposals the org has not submitted yet are not visible to the agency.
    if (!AGENCY_VISIBLE_STATUSES.includes(proposal.status)) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const programFunding = await getProgramFunding(proposal.grantProgram, proposal._id);

    // The agency only sees what the organization submitted: internal team
    // discussion (proposal comments and per-section comments) stays private.
    // Only the agency's own official notices are returned.
    const doc = proposal.toObject();
    doc.comments = (doc.comments || []).filter((c) => c.senderRole === 'funding_agency');
    doc.sections = (doc.sections || []).map(({ comments, starterGuide, ...rest }) => rest); // eslint-disable-line no-unused-vars

    // Pre-filled "requested by" contact for decision dialogs (editable in the UI).
    const reviewer = {
      name: req.user.fullName || agency.contactPerson?.name || '',
      email: req.user.email || agency.contactPerson?.email || '',
      designation: agency.contactPerson?.designation || '',
      phone: agency.contactPerson?.phone || '',
      agencyName: agency.agencyName,
    };

    res.json({ success: true, proposal: doc, programFunding, reviewer });
  } catch (error) {
    console.error('Get agency proposal detail error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching proposal' });
  }
};

// @desc    Record the agency's decision on a proposal and move it along the
//          tracking pipeline. Writes the audit trail (trackingTimeline), posts
//          an official note into the proposal's comment thread, and notifies
//          the organization live over Socket.io.
// @route   PUT /api/agency/proposals/:id/decision
// @body    { status, notes, awardAmount, sanctionOrderNumber, startDate,
//            durationMonths, sanctionNotes }
// @access  Private (funding_agency, must own the underlying grant program)
const REVISION_PRIORITIES = ['Minor', 'Moderate', 'Major'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTES_LENGTH = 5000;

const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const formatDateLong = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Validates the "requested by" contact block sent from the decision dialog.
// Returns { value } (possibly null when nothing was sent) or { error }.
const parseContact = (raw) => {
  if (!raw || typeof raw !== 'object') return { value: null };
  const value = {
    name: cleanText(raw.name, 120),
    designation: cleanText(raw.designation, 120),
    email: cleanText(raw.email, 160),
    phone: cleanText(raw.phone, 40),
  };
  if (value.email && !EMAIL_RE.test(value.email)) {
    return { error: 'Please enter a valid contact email address.' };
  }
  if (!value.name && !value.email && !value.phone) return { value: null };
  return { value };
};

const formatContactLine = (contact) => {
  if (!contact) return '';
  const who = contact.name
    ? contact.designation
      ? `${contact.name} (${contact.designation})`
      : contact.name
    : '';
  const parts = [who, contact.email, contact.phone].filter(Boolean);
  return parts.length ? `Contact for queries: ${parts.join(' • ')}` : '';
};

// @desc    Record the agency's decision on a proposal and move it along the
//          tracking pipeline. Writes the audit trail (trackingTimeline), posts
//          an official note into the proposal's comment thread, and notifies
//          the organization live over Socket.io.
// @route   PUT /api/agency/proposals/:id/decision
// @body    { status, notes, contact{name,designation,email,phone},
//            // Revisions Requested:
//            priority, dueDate, sections[],
//            // Awarded:
//            awardAmount, sanctionOrderNumber, startDate, durationMonths, sanctionNotes }
// @access  Private (funding_agency, must own the underlying grant program)
const updateProposalDecision = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    if (agency.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your agency must be approved before recording decisions.',
      });
    }

    const nextStatus = DECISION_ALIASES[req.body.status];
    if (!nextStatus) {
      return res.status(400).json({ success: false, message: 'Invalid decision status' });
    }

    if (typeof req.body.notes === 'string' && req.body.notes.trim().length > MAX_NOTES_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Notes are too long (maximum ${MAX_NOTES_LENGTH} characters).`,
      });
    }
    const notes = cleanText(req.body.notes, MAX_NOTES_LENGTH);

    const parsedContact = parseContact(req.body.contact);
    if (parsedContact.error) {
      return res.status(400).json({ success: false, message: parsedContact.error });
    }
    const contact = parsedContact.value;

    const proposal = await Proposal.findById(req.params.id).populate('grantProgram');
    if (!proposal || !proposal.grantProgram) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.grantProgram.fundingAgency.toString() !== agency._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this proposal' });
    }

    // ─── Transition guard ───
    const previousStatus = proposal.status;
    const allowedNext = AGENCY_TRANSITIONS[previousStatus];
    if (!allowedNext) {
      return res.status(409).json({
        success: false,
        message: AGENCY_VISIBLE_STATUSES.includes(previousStatus)
          ? `This proposal is already "${previousStatus}" and can no longer be changed.`
          : 'This proposal has not been submitted to the agency yet.',
      });
    }
    if (!allowedNext.includes(nextStatus)) {
      return res.status(409).json({
        success: false,
        message: `A proposal that is "${previousStatus}" cannot move to "${nextStatus}". Allowed: ${allowedNext.join(', ')}.`,
      });
    }

    // ─── Per-decision validation ───
    if (['Revisions Requested', 'Rejected', 'Not Awarded'].includes(nextStatus) && !notes) {
      return res.status(400).json({
        success: false,
        message:
          nextStatus === 'Revisions Requested'
            ? 'Please describe the revisions or queries for the organization.'
            : 'Please provide a reason; it is shared with the organization.',
      });
    }

    // Revision requests carry structured context so the organization knows
    // what to fix, by when, and who to contact.
    let revision = null;
    if (nextStatus === 'Revisions Requested') {
      if (!contact || !contact.name || !(contact.email || contact.phone)) {
        return res.status(400).json({
          success: false,
          message:
            'Please add the contact person (name and email or phone) the organization should reach out to about this revision request.',
        });
      }

      const priority = REVISION_PRIORITIES.includes(req.body.priority) ? req.body.priority : 'Moderate';

      let dueDate = null;
      if (req.body.dueDate) {
        dueDate = new Date(req.body.dueDate);
        if (Number.isNaN(dueDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid response due date.' });
        }
        // Compare in UTC: the date input is a plain YYYY-MM-DD (parsed as UTC midnight).
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        if (dueDate < startOfToday) {
          return res.status(400).json({ success: false, message: 'The response due date cannot be in the past.' });
        }
      }

      const sections = Array.isArray(req.body.sections)
        ? req.body.sections.map((t) => cleanText(t, 150)).filter(Boolean).slice(0, 25)
        : [];

      const round =
        (proposal.trackingTimeline || []).filter((t) => t.stage === 'Revisions Requested').length + 1;

      revision = { priority, dueDate, sections, round };
    }

    let awardAmount = null;
    if (nextStatus === 'Awarded') {
      awardAmount = Number(req.body.awardAmount);
      if (!Number.isFinite(awardAmount) || awardAmount <= 0) {
        return res.status(400).json({ success: false, message: 'A valid award amount is required' });
      }

      const durationMonths =
        req.body.durationMonths === undefined || req.body.durationMonths === ''
          ? null
          : Number(req.body.durationMonths);
      if (durationMonths !== null && (!Number.isFinite(durationMonths) || durationMonths <= 0)) {
        return res.status(400).json({ success: false, message: 'Project duration must be a positive number of months' });
      }

      const startDate = req.body.startDate ? new Date(req.body.startDate) : null;
      if (startDate && Number.isNaN(startDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid project start date' });
      }

      // Never allocate more than the programme's fund pool.
      const funding = await getProgramFunding(proposal.grantProgram, proposal._id);
      if (funding.budget > 0 && awardAmount > funding.remaining) {
        return res.status(400).json({
          success: false,
          message: `Award exceeds the remaining fund pool for this programme (${formatINR(
            funding.remaining
          )} of ${formatINR(funding.budget)} left).`,
        });
      }

      proposal.awardAmount = awardAmount;
      proposal.awardDetails = {
        sanctionOrderNumber: cleanText(req.body.sanctionOrderNumber, 100),
        sanctionedAmount: formatINR(awardAmount),
        startDate,
        durationMonths,
        sanctionNotes: cleanText(req.body.sanctionNotes, MAX_NOTES_LENGTH) || notes,
        awardedAt: new Date(),
        awardedBy: agency.agencyName,
      };
    }

    // ─── Apply ───
    const now = new Date();

    proposal.decision = {
      status: LEGACY_DECISION_CODE[nextStatus],
      notes,
      decidedAt: now,
      decidedBy: req.user._id,
    };
    proposal.status = nextStatus;

    const resumedFromRevision =
      previousStatus === 'Revisions Requested' && nextStatus === 'Under Evaluation';

    const contactLine = formatContactLine(contact);

    const revisionHeader = revision
      ? [
          `Revision round ${revision.round} • Priority: ${revision.priority}${
            revision.dueDate ? ` • Response due: ${formatDateLong(revision.dueDate)}` : ''
          }`,
          revision.sections.length ? `Sections to revise: ${revision.sections.join('; ')}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '';

    // Timeline entry (audit trail, shown on both dashboards)
    const timelineNote = [
      revisionHeader,
      notes ||
        (resumedFromRevision
          ? 'Evaluation resumed after revisions'
          : `Status changed from ${previousStatus} to ${nextStatus}`),
      contactLine,
    ]
      .filter(Boolean)
      .join('\n\n');

    proposal.trackingTimeline.push({
      stage: nextStatus,
      notes: timelineNote,
      updatedBy: `${req.user.fullName} (${agency.agencyName})`,
      source: 'funding_agency',
      timestamp: now,
    });

    const messageByStatus = {
      'Under Evaluation': resumedFromRevision
        ? 'Evaluation has resumed after your revisions.'
        : 'Your proposal is now under evaluation.',
      'Revisions Requested': 'Revisions have been requested.',
      Awarded: `Congratulations, the proposal has been awarded ${formatINR(awardAmount)}.`,
      Rejected: 'The proposal was not selected.',
      'Not Awarded': 'The proposal was not awarded funding.',
    };

    // Official notice posted into the organization's comment thread
    const officialNotice = {
      senderId: req.user._id,
      senderName: `${agency.agencyName} (Funding Agency)`,
      senderRole: 'funding_agency',
      text: [
        messageByStatus[nextStatus],
        revisionHeader,
        notes ? `Note from agency: ${notes}` : '',
        nextStatus === 'Awarded' && proposal.awardDetails.sanctionOrderNumber
          ? `Sanction order: ${proposal.awardDetails.sanctionOrderNumber}.`
          : '',
        contactLine,
      ]
        .filter(Boolean)
        .join('\n'),
      createdAt: now,
    };
    proposal.comments.push(officialNotice);

    await proposal.save();

    // ─── Live notification (same event the org dashboard already listens to) ───
    const updated = proposal.toObject();
    const payload = {
      proposalId: proposal._id.toString(),
      status: nextStatus,
      awardDetails: updated.awardDetails,
      trackingTimeline: updated.trackingTimeline,
      comment: officialNotice,
      comments: updated.comments,
      updatedBy: agency.agencyName,
      source: 'funding_agency',
    };
    socketHelper.emitToProposal(proposal._id.toString(), 'proposalTrackingStatusUpdated', payload);
    if (proposal.organization) {
      // The org-room payload omits comments, matching the org-side handler.
      const { comments, comment, ...orgPayload } = payload; // eslint-disable-line no-unused-vars
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalTrackingStatusUpdated', orgPayload);
    }

    // Return a slim proposal (no sections, no internal comments) to keep the response small.
    const { sections, comments: _comments, ...slim } = updated; // eslint-disable-line no-unused-vars
    res.json({ success: true, message: 'Decision recorded', proposal: slim });
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

    const allPrograms = await GrantProgram.find({ fundingAgency: agency._id });
    const programIds = allPrograms.map((p) => p._id);
    const programs = allPrograms.filter((p) => p.isDeleted !== true);

    const activePrograms = programs.filter((p) => p.status === 'Active').length;
    const totalFundPool = programs.reduce((sum, p) => sum + (p.budgetAmount || 0), 0);

    // Only proposals the organization actually submitted count as "received".
    const received = { grantProgram: { $in: programIds }, status: { $in: AGENCY_VISIBLE_STATUSES } };

    const oneWeekAgo = new Date(Date.now() - 7 * MS_PER_DAY);

    const [proposalsCount, newThisWeek, awaitingReview, underEvaluation, awardedDocs, scoredProposals] =
      await Promise.all([
        Proposal.countDocuments(received),
        Proposal.countDocuments({
          ...received,
          $or: [
            { 'agencySubmission.submittedAt': { $gte: oneWeekAgo } },
            { 'agencySubmission.submittedAt': null, createdAt: { $gte: oneWeekAgo } },
          ],
        }),
        Proposal.countDocuments({ grantProgram: { $in: programIds }, status: { $in: AWAITING_REVIEW_STATUSES } }),
        Proposal.countDocuments({ grantProgram: { $in: programIds }, status: 'Under Evaluation' }),
        Proposal.find({ grantProgram: { $in: programIds }, status: { $in: AWARDED_STATUSES } })
          .select('awardAmount')
          .lean(),
        Proposal.find({ ...received, aiScore: { $ne: null } }).select('aiScore').lean(),
      ]);

    const totalAwarded = awardedDocs.reduce((sum, p) => sum + (p.awardAmount || 0), 0);

    const aiMatchAccuracy =
      scoredProposals.length > 0
        ? (scoredProposals.reduce((sum, p) => sum + p.aiScore, 0) / scoredProposals.length).toFixed(1)
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
        awaitingReview,
        underEvaluation,
        awardedCount: awardedDocs.length,
        totalAwarded,
      },
    });
  } catch (error) {
    console.error('Get agency stats error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching stats' });
  }
};

// @desc    Aggregated analytics for the authenticated agency, derived
//          entirely from existing Proposal/GrantProgram documents — no new
//          model, no fabricated metrics.
// @route   GET /api/agency/analytics
// @access  Private (funding_agency)
const STAGE_CONFIG = [
  { stage: 'pending', statuses: ['Submitted to Agency', 'Submitted'], label: 'Pending Review', icon: '📥', color: 'bg-blue-500', bgColor: 'bg-blue-50/60', borderColor: 'border-blue-200', textColor: 'text-blue-700' },
  { stage: 'evaluation', statuses: ['Under Evaluation'], label: 'Under Evaluation', icon: '🔍', color: 'bg-purple-500', bgColor: 'bg-purple-50/60', borderColor: 'border-purple-200', textColor: 'text-purple-700' },
  { stage: 'revisions', statuses: ['Revisions Requested'], label: 'Revisions Requested', icon: '⚠️', color: 'bg-amber-500', bgColor: 'bg-amber-50/60', borderColor: 'border-amber-200', textColor: 'text-amber-800' },
  { stage: 'awarded', statuses: AWARDED_STATUSES, label: 'Awarded', icon: '🏆', color: 'bg-emerald-600', bgColor: 'bg-emerald-50/60', borderColor: 'border-emerald-200', textColor: 'text-emerald-800' },
  { stage: 'rejected', statuses: REJECTED_STATUSES, label: 'Rejected', icon: '❌', color: 'bg-rose-500', bgColor: 'bg-rose-50/60', borderColor: 'border-rose-200', textColor: 'text-rose-700' },
];

const getAgencyAnalytics = async (req, res) => {
  try {
    const agency = await getApprovedAgencyOrRespond(req, res);
    if (!agency) return;

    // Archived (soft-deleted) programmes are included on purpose: their
    // proposals remain part of the agency's history.
    const programs = await GrantProgram.find({ fundingAgency: agency._id })
      .select('_id title shortTitle status budget budgetAmount')
      .lean();
    const programIds = programs.map((p) => p._id);

    const proposals = await Proposal.find({
      grantProgram: { $in: programIds },
      status: { $in: AGENCY_VISIBLE_STATUSES },
    })
      .select(
        'title status grantProgram organization awardAmount aiScore fundingAmount requestedAmountValue createdAt submittedAt agencySubmission decision trackingTimeline'
      )
      .populate('organization', 'organizationName')
      .lean();

    const now = new Date();

    // ─── Per-proposal derived facts (turnaround, waiting time) ───
    const enriched = proposals.map((p) => {
      const submittedAt = submittedDateOf(p);
      const timeline = p.trackingTimeline || [];
      const agencyEntries = timeline.filter((t) => t.source === 'funding_agency');
      const firstEval = agencyEntries.find((t) => t.stage === 'Under Evaluation');
      const lastAgencyEntry = agencyEntries[agencyEntries.length - 1];
      // A resubmission restarts the wait: use the latest organization entry too.
      const lastOrgSubmit = [...timeline].reverse().find((t) => t.stage === 'Submitted to Agency');
      const lastTouch =
        [lastAgencyEntry?.timestamp, lastOrgSubmit?.timestamp, submittedAt]
          .filter(Boolean)
          .map((d) => new Date(d))
          .sort((a, b) => b - a)[0] || null;
      const isAwarded = AWARDED_STATUSES.includes(p.status);
      const isRejected = REJECTED_STATUSES.includes(p.status);
      return {
        p,
        submittedAt,
        lastTouch,
        isAwarded,
        isRejected,
        awaiting: AWAITING_REVIEW_STATUSES.includes(p.status),
        daysToFirstReview:
          firstEval && submittedAt ? Math.max(daysBetween(submittedAt, firstEval.timestamp), 0) : null,
        daysToDecision:
          (isAwarded || isRejected) && p.decision?.decidedAt && submittedAt
            ? Math.max(daysBetween(submittedAt, p.decision.decidedAt), 0)
            : null,
        requested: requestedAmountOf(p),
      };
    });

    const totalProposals = proposals.length;
    const countByStatuses = (statuses) => proposals.filter((p) => statuses.includes(p.status)).length;

    const pendingCount = countByStatuses(AWAITING_REVIEW_STATUSES);
    const underEvaluationCount = countByStatuses(['Under Evaluation']);
    const revisionsCount = countByStatuses(['Revisions Requested']);
    const awardedCount = countByStatuses(AWARDED_STATUSES);
    const rejectedCount = countByStatuses(REJECTED_STATUSES);
    const decidedCount = awardedCount + rejectedCount;
    const awardRate = decidedCount > 0 ? Math.round((awardedCount / decidedCount) * 100) : 0;

    const awardedAmountOf = (p) =>
      AWARDED_STATUSES.includes(p.status) && typeof p.awardAmount === 'number' ? p.awardAmount : 0;

    const totalAwardedCapital = proposals.reduce((sum, p) => sum + awardedAmountOf(p), 0);
    const totalRequestedCapital = enriched.reduce((sum, e) => sum + e.requested, 0);
    const totalFundPool = programs.reduce(
      (sum, p) => sum + (typeof p.budgetAmount === 'number' ? p.budgetAmount : 0),
      0
    );

    // ─── Review turnaround / SLA ───
    const firstReviewDays = enriched.filter((e) => e.daysToFirstReview !== null).map((e) => e.daysToFirstReview);
    const decisionDays = enriched.filter((e) => e.daysToDecision !== null).map((e) => e.daysToDecision);
    const avgDaysToFirstReview = firstReviewDays.length ? round1(avg(firstReviewDays)) : null;
    const avgDaysToDecision = decisionDays.length ? round1(avg(decisionDays)) : null;
    const overdueReviews = enriched.filter(
      (e) => e.awaiting && e.lastTouch && daysBetween(e.lastTouch, now) > REVIEW_SLA_DAYS
    ).length;

    // ─── Status Distribution (5-stage pipeline, matches the frontend's stage cards) ───
    const statusDistribution = STAGE_CONFIG.map((cfg) => {
      const count = countByStatuses(cfg.statuses);
      return {
        ...cfg,
        count,
        percentage: totalProposals > 0 ? Math.round((count / totalProposals) * 100) : 0,
      };
    });

    // ─── Submission Trends (actual months present in the data, last 6) ───
    const monthMap = {};
    proposals.forEach((p) => {
      const d = submittedDateOf(p);
      if (!d) return;
      const dt = new Date(d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = {
          key,
          label: dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          count: 0,
          awarded: 0,
          sortDate: dt,
        };
      }
      monthMap[key].count++;
      if (AWARDED_STATUSES.includes(p.status)) monthMap[key].awarded++;
    });
    const submissionTrends = Object.values(monthMap)
      .sort((a, b) => a.sortDate - b.sortDate)
      .slice(-6)
      .map(({ key, label, count, awarded }) => ({ key, label, count, awarded }));

    // ─── Grant Call Performance Matrix ───
    const programPerformance = programs.map((program) => {
      const progProposals = proposals.filter((p) => p.grantProgram?.toString() === program._id.toString());
      const progAwardedCapital = progProposals.reduce((sum, p) => sum + awardedAmountOf(p), 0);
      const budgetAmount = typeof program.budgetAmount === 'number' ? program.budgetAmount : 0;

      return {
        id: program._id.toString(),
        title: program.title,
        shortTitle: program.shortTitle || '',
        status: program.status,
        budget: program.budget || (budgetAmount ? `₹${budgetAmount.toLocaleString('en-IN')}` : '—'),
        budgetAmount,
        proposalsCount: progProposals.length,
        underEvaluationCount: progProposals.filter((p) => p.status === 'Under Evaluation').length,
        revisionsCount: progProposals.filter((p) => p.status === 'Revisions Requested').length,
        awardedCount: progProposals.filter((p) => AWARDED_STATUSES.includes(p.status)).length,
        rejectedCount: progProposals.filter((p) => REJECTED_STATUSES.includes(p.status)).length,
        totalAwardedCapital: progAwardedCapital,
        utilisationPct: budgetAmount > 0 ? round1((progAwardedCapital / budgetAmount) * 100) : null,
      };
    });

    // ─── AI Matching / Evaluation Analytics (only if aiScore is actually populated) ───
    const scoredProposals = proposals.filter((p) => typeof p.aiScore === 'number');
    let aiAnalytics = { hasData: false };
    if (scoredProposals.length > 0) {
      const scores = scoredProposals.map((p) => p.aiScore);
      const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const high = scores.filter((s) => s >= 75).length;
      const moderate = scores.filter((s) => s >= 50 && s < 75).length;
      const low = scores.filter((s) => s < 50).length;
      const pct = (n) => Math.round((n / scores.length) * 100);
      aiAnalytics = {
        hasData: true,
        averageScore,
        tiers: {
          high: { label: 'Strong Alignment (75%+)', count: high, pct: pct(high) },
          moderate: { label: 'Moderate Alignment (50–74%)', count: moderate, pct: pct(moderate) },
          low: { label: 'Low Alignment (<50%)', count: low, pct: pct(low) },
        },
      };
    }

    // ─── Oldest proposals still waiting on the agency ───
    const programTitle = Object.fromEntries(programs.map((p) => [p._id.toString(), p.title]));
    const agingQueue = enriched
      .filter((e) => (e.awaiting || e.p.status === 'Under Evaluation') && e.lastTouch)
      .map((e) => {
        const waited = daysBetween(e.lastTouch, now);
        return {
          proposalId: e.p._id.toString(),
          title: e.p.title,
          institution: e.p.organization?.organizationName || 'Unknown institution',
          programTitle: programTitle[e.p.grantProgram?.toString()] || '',
          status: e.p.status,
          daysWaiting: Math.floor(Math.max(waited, 0)),
          overdue: e.awaiting && waited > REVIEW_SLA_DAYS,
        };
      })
      .sort((a, b) => b.daysWaiting - a.daysWaiting)
      .slice(0, 5);

    res.json({
      success: true,
      analytics: {
        totalPrograms: programs.filter((p) => p.status !== 'Archived').length,
        activePrograms: programs.filter((p) => p.status === 'Active').length,
        totalProposals,
        pendingCount,
        underEvaluationCount,
        revisionsCount,
        awardedCount,
        rejectedCount,
        decidedCount,
        awardRate,
        totalAwardedCapital,
        totalRequestedCapital,
        totalFundPool,
        avgDaysToFirstReview,
        avgDaysToDecision,
        overdueReviews,
        reviewSlaDays: REVIEW_SLA_DAYS,
        statusDistribution,
        submissionTrends,
        programPerformance,
        aiAnalytics,
        agingQueue,
      },
    });
  } catch (error) {
    console.error('Get agency analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error while computing analytics' });
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
  getAgencyAnalytics,
  updateLegalVerification,
  getFullProfile,
  updateProfile,
};