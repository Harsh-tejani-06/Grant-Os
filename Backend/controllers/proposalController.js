const Proposal = require('../models/Proposal');
const GrantListing = require('../models/GrantListing');
const GrantProgram = require('../models/GrantProgram');
const FundingAgency = require('../models/FundingAgency');
const Organization = require('../models/Organization');
const socketHelper = require('../socket');

// ─────────────────────────────────────────────────────────────
// ORGANIZATION TYPE → GRANT APPLICANT TYPE MAPPING
// ─────────────────────────────────────────────────────────────

const ORG_TYPE_TO_APPLICANT_TYPE = {
  university: 'university',
  college: 'college',
  research_institute: 'research_institution',
  ngo: 'ngo',
  other: null,
};

// ─────────────────────────────────────────────────────────────
// ELIGIBILITY ENGINE
// ─────────────────────────────────────────────────────────────

async function evaluateEligibility(organization, grantProgram) {
  const checks = [];

  // Organization must be approved
  checks.push({
    label: 'Organization is approved on GrantOS',
    passed: organization.status === 'approved',
  });

  const rules = grantProgram.eligibility || {};

  // Applicant type
  if (rules.applicantTypes && rules.applicantTypes.length > 0) {
    const mapped = ORG_TYPE_TO_APPLICANT_TYPE[organization.organizationType];

    checks.push({
      label: `Organization type matches required type (${rules.applicantTypes.join(', ')})`,
      passed: Boolean(
        mapped && rules.applicantTypes.includes(mapped)
      ),
    });
  }

  // Geographic eligibility
  if (
    rules.geographicScope === 'State' &&
    rules.eligibleStates?.length > 0
  ) {
    const orgState = (
      organization.address?.state || ''
    ).trim().toLowerCase();

    checks.push({
      label: `Organization state is within eligible states (${rules.eligibleStates.join(', ')})`,
      passed: rules.eligibleStates.some(
        (s) => s.trim().toLowerCase() === orgState
      ),
    });
  } else if (
    rules.geographicScope === 'National' &&
    rules.eligibleStates?.length > 0
  ) {
    const orgState = (
      organization.address?.state || ''
    ).trim().toLowerCase();

    checks.push({
      label: `Organization state is within funded regions (${rules.eligibleStates.join(', ')})`,
      passed: rules.eligibleStates.some(
        (s) => s.trim().toLowerCase() === orgState
      ),
    });
  }

  // Organization age
  if (rules.minOrganizationAge) {
    const orgAge =
      new Date().getFullYear() -
      (organization.establishedYear || 0);

    checks.push({
      label: `Organization is at least ${rules.minOrganizationAge} year(s) old`,
      passed: orgAge >= rules.minOrganizationAge,
    });
  }

  const isEligible = checks.every((check) => check.passed);

  return {
    isEligible,
    checks,
    checkedAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────
// DEFAULT SAMPLE PROPOSALS
// ─────────────────────────────────────────────────────────────

const DEFAULT_SAMPLE_PROPOSALS = (
  userId,
  userName,
  orgId
) => [
  {
    title: 'UGC Major Research Project Proposal',
    grantTitle:
      'UGC Major Research Project in Science & Tech',
    grantAgency:
      'University Grants Commission (UGC)',
    fundingAmount: '₹25,00,000',
    deadline: '2026-09-15',
    organization: orgId,
    status: 'In Progress',
    progress: 35,

    sections: Proposal.getDefaultSections().map((sec) => ({
      ...sec,
      assignedTo: userId,
      assignedToName: userName,
      status: 'Not Started',
    })),
  },
];

// ─────────────────────────────────────────────────────────────
// ROLE → SECTION MAPPING
// ─────────────────────────────────────────────────────────────

const ROLE_SECTION_MAP = {
  principal_investigator: [
    'sec_1',
    'sec_2',
    'sec_3',
    'sec_6',
    'sec_11',
    'sec_16',
  ],

  senior_researcher: [
    'sec_4',
    'sec_5',
    'sec_7',
    'sec_9',
    'sec_17',
  ],

  finance_manager: [
    'sec_14',
    'sec_15',
  ],

  compliance_manager: [
    'sec_8',
    'sec_10',
    'sec_12',
    'sec_13',
  ],
};

// ─────────────────────────────────────────────────────────────
// GET MY ASSIGNED PROPOSALS
// ─────────────────────────────────────────────────────────────

// @route GET /api/proposals/my-assigned
exports.getMyAssignedProposals = async (req, res) => {
  try {
    const userId = req.user._id;
    const userName = req.user.fullName;
    const orgId = req.user.organization;

    let proposals = await Proposal.find({
      $or: [
        { 'sections.assignedTo': userId },
        { organization: orgId },
      ],
    }).sort({ updatedAt: -1 });

    // Seed sample proposal if none exist
    if (!proposals || proposals.length === 0) {
      const defaults = DEFAULT_SAMPLE_PROPOSALS(
        userId,
        userName,
        orgId
      );

      const inserted = [];

      for (const proposalData of defaults) {
        const newProposal = await Proposal.create(
          proposalData
        );

        inserted.push(newProposal);
      }

      proposals = inserted;
    }

    // PI / Admin can see all sections
    const isPIOrAdmin =
      req.user.role === 'org_admin' ||
      (
        req.user.jobTitle &&
        (
          req.user.jobTitle
            .toLowerCase()
            .includes('principal investigator') ||
          req.user.jobTitle
            .toLowerCase()
            .includes('pi')
        )
      ) ||
      (
        req.user.fullName &&
        (
          req.user.fullName
            .toLowerCase()
            .includes('principal investigator') ||
          req.user.fullName
            .toLowerCase()
            .includes('pi')
        )
      ) ||
      (
        req.user.email &&
        (
          req.user.email
            .toLowerCase()
            .includes('pi.') ||
          req.user.email
            .toLowerCase()
            .startsWith('pi@')
        )
      );

    let result = proposals.map((proposal) => {
      const proposalObj = proposal.toObject();

      if (!isPIOrAdmin) {
        proposalObj.sections =
          proposalObj.sections.filter(
            (section) =>
              section.assignedTo &&
              section.assignedTo.toString() ===
                userId.toString()
          );
      }

      return proposalObj;
    });

    if (!isPIOrAdmin) {
      result = result.filter(
        (proposal) =>
          proposal.sections &&
          proposal.sections.length > 0
      );
    }

    res.json({
      success: true,
      count: result.length,
      proposals: result,
    });
  } catch (error) {
    console.error(
      'Error fetching assigned proposals:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE SECTION
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/sections/:sectionId
exports.updateSection = async (req, res) => {
  try {
    const {
      proposalId,
      sectionId,
    } = req.params;

    const {
      content,
      status,
    } = req.body;

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    // Lock officially submitted proposals
    if (
      [
        'Submitted to Admin',
        'Submitted to Agency',
        'Submitted',
      ].includes(proposal.status)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'This proposal has been officially submitted and is permanently locked for editing.',
      });
    }

    const section =
      proposal.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    if (content !== undefined) {
      section.content = content;
    }

    if (status !== undefined) {
      section.status = status;
    }

    section.lastEditedAt = new Date();

    // Recalculate progress
    const totalSections =
      proposal.sections.length;

    const completedSections =
      proposal.sections.filter(
        (sectionItem) =>
          sectionItem.status === 'Ready for Review' ||
          sectionItem.status === 'Approved'
      ).length;

    proposal.progress =
      totalSections > 0
        ? Math.round(
            (completedSections / totalSections) * 100
          )
        : 0;

    await proposal.save();

    const updatedSection =
      section.toObject();

    const updatedProposal =
      proposal.toObject();

    // Socket: proposal room
    socketHelper.emitToProposal(
      proposalId,
      'proposalSectionUpdated',
      {
        proposalId,
        sectionId,
        section: updatedSection,
        progress: proposal.progress,
        updatedBy: {
          id: req.user._id,
          name: req.user.fullName,
        },
      }
    );

    // Socket: organization room
    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalSectionUpdated',
        {
          proposalId,
          sectionId,
          section: updatedSection,
          progress: proposal.progress,
        }
      );
    }

    res.json({
      success: true,
      message: 'Section updated successfully',
      proposal: updatedProposal,
      section: updatedSection,
    });
  } catch (error) {
    console.error(
      'Error updating section:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// ADD SECTION
// ─────────────────────────────────────────────────────────────

// @route POST /api/proposals/:proposalId/sections
exports.addSection = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const {
      title,
      wordCountLimit,
      starterGuide,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Section title is required',
      });
    }

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    proposal.sections.push({
      sectionKey: `custom_${Date.now()}`,
      title: title.trim(),
      wordCountLimit:
        wordCountLimit &&
        Number(wordCountLimit) > 0
          ? Number(wordCountLimit)
          : 500,
      starterGuide: starterGuide || '',
      status: 'Not Started',
      content: '',
    });

    const totalSections =
      proposal.sections.length;

    const completedSections =
      proposal.sections.filter(
        (section) =>
          section.status === 'Ready for Review' ||
          section.status === 'Approved'
      ).length;

    proposal.progress =
      totalSections > 0
        ? Math.round(
            (completedSections / totalSections) * 100
          )
        : 0;

    await proposal.save();

    res.status(201).json({
      success: true,
      message: 'Section added',
      proposal: proposal.toObject(),
    });
  } catch (error) {
    console.error(
      'Error adding section:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE SECTION
// ─────────────────────────────────────────────────────────────

// @route DELETE /api/proposals/:proposalId/sections/:sectionId
exports.deleteSection = async (req, res) => {
  try {
    const {
      proposalId,
      sectionId,
    } = req.params;

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    const section =
      proposal.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    section.deleteOne();

    const totalSections =
      proposal.sections.length;

    const completedSections =
      proposal.sections.filter(
        (sectionItem) =>
          sectionItem.status === 'Ready for Review' ||
          sectionItem.status === 'Approved'
      ).length;

    proposal.progress =
      totalSections > 0
        ? Math.round(
            (completedSections / totalSections) * 100
          )
        : 0;

    await proposal.save();

    res.json({
      success: true,
      message: 'Section deleted',
      proposal: proposal.toObject(),
    });
  } catch (error) {
    console.error(
      'Error deleting section:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// APPROVE ALL SECTIONS
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/approve-all
exports.approveAllSections = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const isAuthorized =
      req.user.role === 'org_admin' ||
      (
        req.user.jobTitle &&
        (
          req.user.jobTitle
            .toLowerCase()
            .includes('principal investigator') ||
          req.user.jobTitle
            .toLowerCase()
            .includes('pi')
        )
      ) ||
      (
        req.user.fullName &&
        (
          req.user.fullName
            .toLowerCase()
            .includes('principal investigator') ||
          req.user.fullName
            .toLowerCase()
            .includes('pi')
        )
      ) ||
      (
        req.user.email &&
        (
          req.user.email
            .toLowerCase()
            .includes('pi.') ||
          req.user.email
            .toLowerCase()
            .startsWith('pi@')
        )
      );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message:
          'Only Principal Investigator or Admin can approve all sections',
      });
    }

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    if (
      [
        'Submitted to Admin',
        'Submitted to Agency',
        'Submitted',
      ].includes(proposal.status)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'This proposal has already been submitted and cannot be approved again.',
      });
    }

    proposal.sections.forEach((section) => {
      section.status = 'Approved';
      section.lastEditedAt = new Date();
    });

    proposal.progress = 100;
    proposal.status = 'Under Review';

    await proposal.save();

    const updatedProposal =
      proposal.toObject();

    socketHelper.emitToProposal(
      proposalId,
      'proposalAllSectionsApproved',
      {
        proposalId,
        sections: updatedProposal.sections,
        progress: 100,
        status: proposal.status,
        approvedBy: {
          id: req.user._id,
          name: req.user.fullName,
        },
      }
    );

    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalAllSectionsApproved',
        {
          proposalId,
          sections: updatedProposal.sections,
          progress: 100,
          status: proposal.status,
        }
      );
    }

    res.json({
      success: true,
      message:
        'All sections approved successfully',
      proposal: updatedProposal,
    });
  } catch (error) {
    console.error(
      'Error approving all sections:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// SUBMIT TO ADMIN
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/submit-admin
exports.submitToAdmin = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    if (
      [
        'Submitted to Admin',
        'Submitted to Agency',
        'Submitted',
      ].includes(proposal.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Proposal has already been submitted to the Admin / Agency.',
      });
    }

    proposal.status = 'Submitted to Admin';
    proposal.submittedByPIAt = new Date();

    await proposal.save();

    const updatedProposal =
      proposal.toObject();

    socketHelper.emitToProposal(
      proposalId,
      'proposalSubmittedToAdmin',
      {
        proposalId,
        status: proposal.status,
        submittedByPIAt:
          proposal.submittedByPIAt,
      }
    );

    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalSubmittedToAdmin',
        {
          proposalId,
          status: proposal.status,
          submittedByPIAt:
            proposal.submittedByPIAt,
        }
      );
    }

    res.json({
      success: true,
      message:
        'Proposal successfully submitted to Organization Admin',
      proposal: updatedProposal,
    });
  } catch (error) {
    console.error(
      'Error submitting proposal to admin:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PRE-SUBMISSION CHECKLIST
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/checklist
exports.updatePreSubmissionChecklist = async (
  req,
  res
) => {
  try {
    const { proposalId } = req.params;

    const {
      endorsementLetter,
      investigatorCvs,
      ethicalClearance,
      biosafetyClearance,
      financeAudit,
      conflictOfInterest,
    } = req.body;

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    if (proposal.status === 'Submitted to Agency') {
      return res.status(400).json({
        success: false,
        message:
          'Proposal has already been submitted to the agency. Checklist cannot be altered.',
      });
    }

    proposal.preSubmissionChecklist = {
      endorsementLetter:
        endorsementLetter !== undefined
          ? Boolean(endorsementLetter)
          : Boolean(
              proposal.preSubmissionChecklist
                ?.endorsementLetter
            ),

      investigatorCvs:
        investigatorCvs !== undefined
          ? Boolean(investigatorCvs)
          : Boolean(
              proposal.preSubmissionChecklist
                ?.investigatorCvs
            ),

      ethicalClearance:
        ethicalClearance !== undefined
          ? Boolean(ethicalClearance)
          : Boolean(
              proposal.preSubmissionChecklist
                ?.ethicalClearance
            ),

      biosafetyClearance:
        biosafetyClearance !== undefined
          ? Boolean(biosafetyClearance)
          : Boolean(
              proposal.preSubmissionChecklist
                ?.biosafetyClearance
            ),

      financeAudit:
        financeAudit !== undefined
          ? Boolean(financeAudit)
          : Boolean(
              proposal.preSubmissionChecklist
                ?.financeAudit
            ),

      conflictOfInterest:
        conflictOfInterest !== undefined
          ? Boolean(conflictOfInterest)
          : Boolean(
              proposal.preSubmissionChecklist
                ?.conflictOfInterest
            ),

      lastUpdatedBy: req.user.fullName,
      lastUpdatedAt: new Date(),
    };

    await proposal.save();

    const updatedProposal =
      proposal.toObject();

    socketHelper.emitToProposal(
      proposalId,
      'proposalChecklistUpdated',
      {
        proposalId,
        checklist:
          updatedProposal.preSubmissionChecklist,
        updatedBy: req.user.fullName,
      }
    );

    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalChecklistUpdated',
        {
          proposalId,
          checklist:
            updatedProposal.preSubmissionChecklist,
          updatedBy: req.user.fullName,
        }
      );
    }

    res.json({
      success: true,
      message:
        'Pre-submission checklist updated',
      checklist:
        updatedProposal.preSubmissionChecklist,
      proposal: updatedProposal,
    });
  } catch (error) {
    console.error(
      'Error updating pre-submission checklist:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// SUBMIT TO FUNDING AGENCY
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/submit-agency
exports.submitToAgency = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const {
      agencySubmissionId,
      receiptNote,
    } = req.body;

    if (
      !agencySubmissionId ||
      !agencySubmissionId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Official Agency Reference ID / Confirmation ID is required (e.g., UGC/2026/MRP-8841).',
      });
    }

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    if (proposal.status === 'Submitted to Agency') {
      return res.status(400).json({
        success: false,
        message:
          'This proposal has already been submitted to the funding agency.',
      });
    }

    const checklist =
      proposal.preSubmissionChecklist || {};

    if (!checklist.endorsementLetter) {
      return res.status(400).json({
        success: false,
        message:
          'Institutional Endorsement Letter must be verified before submitting to the funding agency.',
      });
    }

    proposal.status = 'Submitted to Agency';

    proposal.agencySubmission = {
      agencySubmissionId:
        agencySubmissionId.trim(),

      receiptNote:
        receiptNote
          ? receiptNote.trim()
          : '',

      submittedAt: new Date(),
      submittedBy: req.user._id,
      submittedByName: req.user.fullName,
    };

    const officialNotice = {
      senderId: req.user._id,
      senderName: `${req.user.fullName} (Org Admin)`,
      senderRole: 'org_admin',
      text:
        `Official Submission: This proposal has been formally endorsed and submitted to ${
          proposal.grantAgency ||
          'the funding agency'
        }. Agency Reference ID: "${agencySubmissionId.trim()}". All proposal sections are now permanently locked and archived.`,
      createdAt: new Date(),
    };

    proposal.comments.push(
      officialNotice
    );

    await proposal.save();

    const updatedProposal =
      proposal.toObject();

    socketHelper.emitToProposal(
      proposalId,
      'proposalSubmittedToAgency',
      {
        proposalId,
        status: 'Submitted to Agency',
        agencySubmission:
          updatedProposal.agencySubmission,
        message:
          'Your proposal has been officially endorsed and submitted to the funding agency by the Organization Admin.',
        submittedBy: {
          id: req.user._id,
          name: req.user.fullName,
        },
        comment: officialNotice,
        comments:
          updatedProposal.comments,
      }
    );

    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalSubmittedToAgency',
        {
          proposalId,
          status: 'Submitted to Agency',
          agencySubmission:
            updatedProposal.agencySubmission,
          submittedBy: {
            id: req.user._id,
            name: req.user.fullName,
          },
        }
      );
    }

    res.json({
      success: true,
      message:
        `Proposal successfully submitted to ${
          proposal.grantAgency ||
          'Funding Agency'
        }!`,
      proposal: updatedProposal,
    });
  } catch (error) {
    console.error(
      'Error submitting proposal to agency:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// TRACKING STATUS
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/tracking-status
exports.updateProposalTrackingStatus = async (
  req,
  res
) => {
  try {
    const { proposalId } = req.params;

    const {
      status,
      notes,
      awardDetails,
    } = req.body;

    const allowedStatuses = [
      'Submitted to Admin',
      'Submitted to Agency',
      'Under Evaluation',
      'Revisions Requested',
      'Awarded',
      'Rejected',
      'Accepted',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          `Invalid tracking status: ${status}`,
      });
    }

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    const oldStatus = proposal.status;

    proposal.status = status;

    if (!proposal.trackingTimeline) {
      proposal.trackingTimeline = [];
    }

    proposal.trackingTimeline.push({
      stage: status,
      updatedBy: req.user.fullName,
      notes:
        notes ||
        `Status changed from ${oldStatus} to ${status}`,
      timestamp: new Date(),
    });

    if (
      status === 'Awarded' &&
      awardDetails
    ) {
      proposal.awardDetails = {
        sanctionOrderNumber:
          awardDetails.sanctionOrderNumber
            ?.trim() ||
          proposal.awardDetails
            ?.sanctionOrderNumber ||
          '',

        sanctionedAmount:
          awardDetails.sanctionedAmount
            ?.trim() ||
          proposal.awardDetails
            ?.sanctionedAmount ||
          '',

        startDate:
          awardDetails.startDate ||
          proposal.awardDetails
            ?.startDate ||
          null,

        durationMonths:
          Number(
            awardDetails.durationMonths
          ) ||
          proposal.awardDetails
            ?.durationMonths ||
          0,

        sanctionNotes:
          awardDetails.sanctionNotes
            ?.trim() ||
          proposal.awardDetails
            ?.sanctionNotes ||
          '',

        awardedAt: new Date(),
        awardedBy: req.user.fullName,
      };
    }

    const statusIcons = {
      'Under Evaluation': 'Review',
      'Revisions Requested': 'Revision',
      Awarded: 'Awarded',
      Rejected: 'Rejected',
      'Submitted to Agency': 'Submitted',
    };

    const icon =
      statusIcons[status] || 'Update';

    const auditNotice = {
      senderId: req.user._id,
      senderName:
        `${req.user.fullName} (Org Admin)`,
      senderRole: 'org_admin',

      text:
        `${icon} Tracking Update: Proposal status updated to "${status}"${
          notes
            ? ` — Note: ${notes}`
            : ''
        }${
          status === 'Awarded' &&
          proposal.awardDetails
            ?.sanctionedAmount
            ? ` (Sanctioned: ${proposal.awardDetails.sanctionedAmount}, Order #${
                proposal.awardDetails
                  .sanctionOrderNumber ||
                'Pending'
              })`
            : ''
        }.`,

      createdAt: new Date(),
    };

    proposal.comments.push(
      auditNotice
    );

    await proposal.save();

    const updatedProposal =
      proposal.toObject();

    socketHelper.emitToProposal(
      proposalId,
      'proposalTrackingStatusUpdated',
      {
        proposalId,
        status,
        awardDetails:
          updatedProposal.awardDetails,
        trackingTimeline:
          updatedProposal.trackingTimeline,
        comment: auditNotice,
        comments:
          updatedProposal.comments,
        updatedBy: req.user.fullName,
      }
    );

    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalTrackingStatusUpdated',
        {
          proposalId,
          status,
          awardDetails:
            updatedProposal.awardDetails,
          trackingTimeline:
            updatedProposal.trackingTimeline,
          updatedBy:
            req.user.fullName,
        }
      );
    }

    res.json({
      success: true,
      message:
        `Proposal tracking status updated to ${status}`,
      proposal: updatedProposal,
    });
  } catch (error) {
    console.error(
      'Error updating tracking status:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION COMMENT
// ─────────────────────────────────────────────────────────────

// @route POST /api/proposals/:proposalId/sections/:sectionId/comments
exports.addSectionComment = async (
  req,
  res
) => {
  try {
    const {
      proposalId,
      sectionId,
    } = req.params;

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    const section =
      proposal.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    const comment = {
      senderId: req.user._id,
      senderName: req.user.fullName,
      senderRole: req.user.role,
      text: text.trim(),
      createdAt: new Date(),
    };

    section.comments.push(comment);

    await proposal.save();

    const savedComment =
      section.comments[
        section.comments.length - 1
      ];

    socketHelper.emitToProposal(
      proposalId,
      'sectionCommentAdded',
      {
        proposalId,
        sectionId,
        comment: savedComment,
        comments: section.comments,
      }
    );

    res.json({
      success: true,
      message: 'Comment added',
      comments: section.comments,
    });
  } catch (error) {
    console.error(
      'Error adding comment:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PROPOSAL COMMENT
// ─────────────────────────────────────────────────────────────

// @route POST /api/proposals/:proposalId/comments
exports.addProposalComment = async (
  req,
  res
) => {
  try {
    const { proposalId } = req.params;

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    const proposal =
      await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    const comment = {
      senderId: req.user._id,
      senderName: req.user.fullName,
      senderRole: req.user.role,
      text: text.trim(),
      createdAt: new Date(),
    };

    proposal.comments.push(comment);

    await proposal.save();

    const savedComment =
      proposal.comments[
        proposal.comments.length - 1
      ];

    socketHelper.emitToProposal(
      proposalId,
      'proposalCommentAdded',
      {
        proposalId,
        comment: savedComment,
        comments: proposal.comments,
      }
    );

    res.json({
      success: true,
      message: 'Team comment added',
      comments: proposal.comments,
    });
  } catch (error) {
    console.error(
      'Error adding proposal comment:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// AI ASSISTANT
// ─────────────────────────────────────────────────────────────

// @route POST /api/proposals/ai-assist
exports.aiAssist = async (req, res) => {
  try {
    const {
      action,
      proposalId,
      proposalTitle,
      sectionKey,
      sectionTitle,
      wordCountLimit,
      starterGuide,
      currentContent,
      prompt,
      grantTitle,
      grantAgency,
      fundingAmount,
      deadline,
    } = req.body;

    const apiKey =
      process.env.GEMINI_API_KEY;

    // Fetch proposal
    let proposal = null;

    if (proposalId) {
      try {
        proposal =
          await Proposal.findById(
            proposalId
          );
      } catch (error) {
        console.warn(
          'Proposal lookup failed:',
          error.message
        );
      }
    }

    // Fetch linked scraped grant
    let grantDoc = null;

    if (proposal?.grantListingId) {
      try {
        grantDoc =
          await GrantListing.findById(
            proposal.grantListingId
          );
      } catch (error) {
        console.warn(
          'Grant lookup failed:',
          error.message
        );
      }
    }

    // Try searching by grant title
    if (!grantDoc) {
      const searchTitle = (
        grantTitle ||
        proposal?.grantTitle ||
        ''
      ).trim();

      const searchAgency = (
        grantAgency ||
        proposal?.grantAgency ||
        ''
      ).trim();

      if (searchTitle) {
        const cleanTitleWords =
          searchTitle
            .replace(
              /[()[\]-]/g,
              ' '
            )
            .trim()
            .split(/\s+/)
            .filter(
              (word) =>
                word.length > 2
            );

        if (
          cleanTitleWords.length > 0
        ) {
          const regexPattern =
            cleanTitleWords
              .slice(0, 3)
              .join('.*');

          grantDoc =
            await GrantListing.findOne({
              title: {
                $regex:
                  regexPattern,
                $options: 'i',
              },
            });
        }

        if (!grantDoc) {
          grantDoc =
            await GrantListing.findOne({
              title: {
                $regex:
                  searchTitle.slice(
                    0,
                    25
                  ),
                $options: 'i',
              },
            });
        }
      }

      if (
        !grantDoc &&
        searchAgency
      ) {
        grantDoc =
          await GrantListing.findOne({
            'agency.name': {
              $regex:
                searchAgency.slice(
                  0,
                  25
                ),
              $options: 'i',
            },
          });
      }
    }

    // Real database metadata
    const realAgencyName =
      grantDoc?.agency?.name ||
      grantAgency ||
      proposal?.grantAgency ||
      'Funding Agency';

    const realImplementingBody =
      grantDoc?.agency
        ?.implementingBody || '';

    const realGrantTitle =
      grantDoc?.title ||
      grantTitle ||
      proposal?.grantTitle ||
      'Research Grant';

    const realDescription =
      grantDoc?.description || '';

    const realEligibility =
      grantDoc?.eligibilityText || '';

    const realProcedure =
      grantDoc?.applicationProcedure ||
      '';

    const realFocusAreas =
      grantDoc?.focusAreas &&
      grantDoc.focusAreas.length > 0
        ? grantDoc.focusAreas.join(
            ', '
          )
        : grantDoc?.categoryRaw || '';

    const realFundingAmount =
      grantDoc?.fundingAmount
        ?.rawText ||
      fundingAmount ||
      proposal?.fundingAmount ||
      '';

    const realDuration =
      grantDoc?.duration?.rawText ||
      '';

    const realDeadline =
      grantDoc?.deadline?.rawText ||
      deadline ||
      proposal?.deadline ||
      '';

    const realGuidelines =
      grantDoc?.links
        ?.guidelinesUrl ||
      grantDoc?.links?.infoUrl ||
      '';

    const effectiveProposalTitle =
      proposalTitle ||
      proposal?.title ||
      'Academic Research Project';

    // Word limit
    let strictWordLimit =
      wordCountLimit || 500;

    const matchWords =
      prompt &&
      prompt.match(
        /(?:under|within|less than|max|maximum|around)?\s*(\d+)\s*(?:words|word)/i
      );

    if (matchWords) {
      strictWordLimit =
        parseInt(
          matchWords[1],
          10
        );
    } else if (
      wordCountLimit &&
      wordCountLimit <
        strictWordLimit
    ) {
      strictWordLimit =
        wordCountLimit;
    }

    const isShortTarget =
      strictWordLimit <= 100;

    // Cross-section proposal context
    let relatedProposalContext =
      '';

    if (
      proposal &&
      proposal.sections
    ) {
      const titleSec =
        proposal.sections.find(
          (section) =>
            section.sectionKey ===
              'sec_1' ||
            section.title
              ?.toLowerCase()
              .includes('title')
        );

      const abstractSec =
        proposal.sections.find(
          (section) =>
            section.sectionKey ===
              'sec_2' ||
            section.title
              ?.toLowerCase()
              .includes('abstract') ||
            section.title
              ?.toLowerCase()
              .includes('summary')
        );

      if (
        titleSec?.content?.trim() &&
        !sectionTitle
          ?.toLowerCase()
          .includes('title')
      ) {
        relatedProposalContext +=
          `\nExisting Proposed Title/Context: ${titleSec.content.trim().slice(0, 250)}`;
      }

      if (
        abstractSec?.content?.trim() &&
        !sectionTitle
          ?.toLowerCase()
          .includes('abstract') &&
        !sectionTitle
          ?.toLowerCase()
          .includes('summary')
      ) {
        relatedProposalContext +=
          `\nExisting Proposal Abstract: ${abstractSec.content.trim().slice(0, 450)}`;
      }
    }

    // Gemini system instruction
    const systemInstruction = `
You are GrantOS AI Research Advisor, an elite proposal development specialist for premier funding bodies including India's DST, SERB, UGC, AICTE, CSIR, DBT, ICSSR, and international research foundations.

CRITICAL INSTRUCTION:
Your responses must be STRICTLY SPECIFIC and TAILORED to the real grant opportunity from the agency database and the selected proposal.

- Grant Scheme: "${realGrantTitle}"
- Funding Agency: "${realAgencyName}" ${
      realImplementingBody
        ? `(${realImplementingBody})`
        : ''
    }
- Proposal Title: "${effectiveProposalTitle}"
${
  realDescription
    ? `- Agency Scheme Focus: ${realDescription}`
    : ''
}
${
  realFocusAreas
    ? `- Priority Focus Areas: ${realFocusAreas}`
    : ''
}
${
  realEligibility
    ? `- Eligibility Mandate: ${realEligibility}`
    : ''
}
${
  realFundingAmount
    ? `- Scheme Funding Envelope: ${realFundingAmount}`
    : ''
}

${
  prompt
    ? `INVESTIGATOR'S MANDATORY CUSTOM INSTRUCTIONS (HIGHEST PRIORITY):
"${prompt}"
You MUST prioritize and strictly follow this instruction above all default behaviors.`
    : ''
}

Rules:

1. STRICT WORD COUNT ENFORCEMENT:
The output MUST be strictly UNDER ${strictWordLimit} WORDS (maximum ${strictWordLimit} words).

${
  isShortTarget
    ? `2. IMPORTANT FOR SHORT TARGETS:
Because the requested length is ${strictWordLimit} words, do NOT include markdown headings, titles, or introductions. Output ONLY the direct, concise paragraph text itself.`
    : '2. Format with clean, structured Markdown (headings, bullet points, structured tables, bold text).'
}

3. NEVER output generic placeholders.

4. Base methodology, milestones, budget allocations, technical deliverables, and scientific justifications directly on the real grant mandate and proposal title.

5. If drafting Budget or Timeline, use realistic academic norms and the scheme funding limit.
`;

    // User prompt
    let userPrompt = '';

    if (action === 'generate') {
      userPrompt = `
Please write a publication-grade proposal section for:

Section Title: "${sectionTitle}"
Grant Scheme: "${realGrantTitle}" (${realAgencyName})
Proposal Title: "${effectiveProposalTitle}"

${relatedProposalContext}

${
  starterGuide
    ? `Section Template Guidelines from Agency:
${starterGuide}`
    : ''
}

${
  prompt
    ? `INVESTIGATOR'S CUSTOM INSTRUCTION:
"${prompt}"`
    : ''
}

STRICT CONSTRAINT:
Total output MUST NOT exceed ${strictWordLimit} words.
${
  isShortTarget
    ? 'Do NOT include markdown headings. Output pure concise text.'
    : ''
}
`;
    } else if (
      action === 'improve'
    ) {
      userPrompt = `
Please critique, elevate, and rewrite the following draft for the section "${sectionTitle}" to strictly align with "${realGrantTitle}" (${realAgencyName}).

${
  prompt
    ? `INVESTIGATOR'S CUSTOM INSTRUCTION:
"${prompt}"`
    : ''
}

STRICT CONSTRAINT:
Total output MUST NOT exceed ${strictWordLimit} words.

Draft Content:
${currentContent}
`;
    } else if (
      action === 'summarize'
    ) {
      userPrompt = `
Summarize the following draft for section "${sectionTitle}" regarding the grant "${realGrantTitle}" (${realAgencyName}).

${
  prompt
    ? `INVESTIGATOR'S CUSTOM INSTRUCTION:
"${prompt}"`
    : ''
}

STRICT WORD COUNT CONSTRAINT:
The summary MUST NOT exceed ${strictWordLimit} words.

Content to Summarize:
${currentContent}
`;
    } else if (
      action === 'compliance'
    ) {
      userPrompt = `
Perform a formal compliance and quality review for the proposal draft of "${sectionTitle}" against the real guidelines of "${realGrantTitle}" (${realAgencyName}).

${
  realEligibility
    ? `Agency Eligibility & Requirements: ${realEligibility}`
    : ''
}

${
  realFundingAmount
    ? `Funding Ceiling: ${realFundingAmount}`
    : ''
}

${
  prompt
    ? `INVESTIGATOR'S CUSTOM REVIEW FOCUS: "${prompt}"`
    : ''
}

Draft to Review:
${currentContent}

Provide:

1. Compliance Assessment
2. Strengths of the current draft
3. Concrete improvements needed before final submission to ${realAgencyName}
`;
    } else {
      userPrompt = `
Review and refine content for section "${sectionTitle}" for grant "${realGrantTitle}".

${
  prompt
    ? `Custom request: ${prompt}`
    : ''
}

${currentContent}
`;
    }

    // ─────────────────────────────────────────
    // GEMINI API
    // ─────────────────────────────────────────

    if (apiKey) {
      const modelsToTry = [
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest',
      ];

      for (
        const modelName of modelsToTry
      ) {
        try {
          const response =
            await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: systemInstruction,
                        },
                        {
                          text: userPrompt,
                        },
                      ],
                    },
                  ],

                  generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 1500,
                  },
                }),
              }
            );

          if (response.ok) {
            const geminiData =
              await response.json();

            let generatedText =
              geminiData
                ?.candidates?.[0]
                ?.content?.parts?.[0]
                ?.text;

            if (generatedText) {
              const countWords = (
                value
              ) =>
                value
                  ? value
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .length
                  : 0;

              if (
                isShortTarget &&
                generatedText.startsWith('#')
              ) {
                generatedText =
                  generatedText
                    .replace(
                      /^#+.*?\n+/s,
                      ''
                    )
                    .trim();
              }

              const currentWordCount =
                countWords(
                  generatedText
                );

              if (
                currentWordCount >
                strictWordLimit
              ) {
                const wordsArr =
                  generatedText
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

                let trimmed =
                  wordsArr
                    .slice(
                      0,
                      strictWordLimit
                    )
                    .join(' ');

                const lastPeriod =
                  Math.max(
                    trimmed.lastIndexOf(
                      '.'
                    ),
                    trimmed.lastIndexOf(
                      '!'
                    ),
                    trimmed.lastIndexOf(
                      '?'
                    )
                  );

                if (
                  lastPeriod >
                  trimmed.length *
                    0.6
                ) {
                  trimmed =
                    trimmed.substring(
                      0,
                      lastPeriod + 1
                    );
                }

                generatedText =
                  trimmed;
              }

              return res.json({
                success: true,
                text: generatedText,
                modelUsed:
                  modelName,

                matchedGrant: {
                  title:
                    realGrantTitle,
                  agency:
                    realAgencyName,
                  source: grantDoc
                    ? 'database'
                    : 'proposal',
                },
              });
            }
          } else {
            const errBody =
              await response.text();

            console.warn(
              `Gemini (${modelName}) returned ${response.status}:`,
              errBody.slice(
                0,
                150
              )
            );
          }
        } catch (
          geminiError
        ) {
          console.warn(
            `Gemini API (${modelName}) failed:`,
            geminiError.message
          );
        }
      }
    }

    // ─────────────────────────────────────────
    // DATABASE SMART FALLBACK
    // ─────────────────────────────────────────

    const title =
      sectionTitle ||
      'Proposal Section';

    const lower =
      title.toLowerCase();

    let text = '';

    if (
      action === 'generate'
    ) {
      if (
        lower.includes('title')
      ) {
        text = isShortTarget
          ? `${effectiveProposalTitle}: Next-Generation Research Architecture for ${realGrantTitle} (${realAgencyName})`
          : `## ${title}

**Full Project Title:**
${effectiveProposalTitle} under ${realGrantTitle}

**Funding Body:**
${realAgencyName} ${
              realImplementingBody
                ? `(${realImplementingBody})`
                : ''
            }

**Primary Thematic Domain:**
${
  realFocusAreas ||
  'Advanced Scientific & Technological Research'
}

**Target Duration:**
${realDuration || '24 to 36 Months'}`;
      } else if (
        lower.includes('summary') ||
        lower.includes('abstract')
      ) {
        text = isShortTarget
          ? `This project, "${effectiveProposalTitle}", fulfills ${realAgencyName}'s ${realGrantTitle} mandate by delivering high-throughput experimental validation, statistical benchmarks, and institutional datasets across ${
              realFocusAreas ||
              'the target domain'
            }.`
          : `## ${title}

### 1. Executive Overview & Problem Context

This project, titled **"${effectiveProposalTitle}"**, directly targets the core research mandate articulated by **${realAgencyName}** for the **"${realGrantTitle}"** initiative.

### 2. Methodological Innovation & Core Objectives

- **Objective 1:** Formulate baseline computational and empirical models.
- **Objective 2:** Deploy a high-throughput testbed for validation.
- **Objective 3:** Produce verifiable datasets and research outputs.

### 3. Expected Scientific Impact

The project is structured around measurable research outcomes, human resource development, and institutional knowledge creation aligned with ${realAgencyName}.`;
      } else if (
        lower.includes('budget') &&
        !lower.includes(
          'justification'
        )
      ) {
        const totalAmountStr =
          realFundingAmount ||
          '₹25,00,000';

        text = `## ${title}

*Budget formulation aligned with ${realAgencyName} funding norms for "${realGrantTitle}"*

| Budget Head | Item / Personnel Description | Year 1 (₹) | Year 2 (₹) | Total (₹) |
| :--- | :--- | ---: | ---: | ---: |
| **A. Capital / Equipment** | Specialized Hardware & Experimental Node | 8,00,000 | 2,00,000 | 10,00,000 |
| **B. Manpower / Personnel** | Junior/Senior Research Fellow | 4,20,000 | 4,20,000 | 8,40,000 |
| **C. Consumables & Cloud** | Computational Credits & Research Consumables | 1,50,000 | 1,50,000 | 3,00,000 |
| **D. Travel & Fieldwork** | Research Dissemination & Fieldwork | 1,00,000 | 1,00,000 | 2,00,000 |
| **E. Institutional Overhead** | Institutional Cost & Contingency | 80,000 | 80,000 | 1,60,000 |
| **GRAND TOTAL** | | **15,50,000** | **9,50,000** | **${totalAmountStr}** |`;
      } else if (
        lower.includes('timeline') ||
        lower.includes(
          'milestone'
        )
      ) {
        text = `## ${title}

*Milestone delivery roadmap for "${realGrantTitle}" (${realAgencyName})*

| Phase | Target Window | Key Work Package | Lead Responsibility | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Phase I** | Months 1–6 | Literature review, baseline setup & ethics clearance | Principal Investigator | Milestone 1 |
| **Phase II** | Months 7–15 | Core methodology & prototype development | Senior Researcher | Milestone 2 |
| **Phase III** | Months 16–24 | Benchmarking and empirical validation | Research Team | Milestone 3 |
| **Phase IV** | Months 25–36 | Handover, reporting & final audit | PI & Compliance Lead | Final Certificate |`;
      } else if (
        lower.includes('risk')
      ) {
        text = `## ${title}

| Risk Category | Specific Risk | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Technical** | Parameter convergence or hardware limitations | Medium | Maintain fallback algorithms and computational pipelines |
| **Operational** | Procurement delays | Low | Pre-qualify vendors and begin procurement planning early |
| **Regulatory** | Ethics or data-access delays | Medium | Submit clearance documentation early |`;
      } else {
        text = `## ${title}

### 1. Contextual Alignment

This section establishes the scientific foundation of **"${effectiveProposalTitle}"**, addressing the priorities of **${realAgencyName}** under **"${realGrantTitle}"**.

### 2. Implementation Methodology

- Targeted novelty within ${
          realFocusAreas ||
          'the approved grant domain'
        }.
- Rigorous empirical verification.
- Phased research deliverables.

${
  prompt
    ? `### 3. Special Focus Notes

${prompt}`
    : ''
}

### 4. Measurable Outcomes

Structured outputs aligned with ${realAgencyName} reporting and audit requirements.`;
      }
    } else if (
      action === 'improve'
    ) {
      text =
        (currentContent || '') +
        `

### Enhanced Scheme Alignment

This methodology is further aligned with **"${realGrantTitle}"**, incorporating reproducible benchmarks, structured risk mitigation, and compliance with ${realAgencyName} research requirements.`;
    } else if (
      action === 'summarize'
    ) {
      text = isShortTarget
        ? `Aligning with ${realAgencyName}'s ${realGrantTitle} mandate, this project advances ${
            realFocusAreas ||
            'advanced research'
          } through rigorous empirical validation and milestone reporting within the ${
            realFundingAmount ||
            'allocated'
          } envelope.`
        : `**Executive Summary for "${title}" (${realGrantTitle}):**

- **Funding Body:** ${realAgencyName}
- **Project Focus:** ${effectiveProposalTitle}
- **Core Deliverables:** Rigorous experimental outcomes
- **Compliance:** Aligned with ${realAgencyName} submission guidelines`;
    } else {
      text = `### Official Compliance & Evaluation Review for "${title}"

*Scheme: ${realGrantTitle} | Agency: ${realAgencyName}*

1. **Priority Alignment:** Verify coverage of ${
        realFocusAreas ||
        'target research themes'
      }.

2. **Funding Envelope:** Ensure allocations remain within ${
        realFundingAmount ||
        'scheme limits'
      }.

3. **Scientific Impact:** Quantify milestones using clear and auditable KPIs.`;
    }

    res.json({
      success: true,
      text,
      modelUsed:
        'database-smart-template',

      matchedGrant: {
        title:
          realGrantTitle,
        agency:
          realAgencyName,
        source: grantDoc
          ? 'database'
          : 'proposal',
      },
    });
  } catch (error) {
    console.error(
      'Error in AI Assist:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// CHECK ELIGIBILITY
// ─────────────────────────────────────────────────────────────

// @route GET /api/proposals/eligibility/:grantProgramId
exports.checkEligibility = async (
  req,
  res
) => {
  try {
    const {
      grantProgramId,
    } = req.params;

    if (!req.user.organization) {
      return res.status(400).json({
        success: false,
        message:
          'Complete your organization profile before checking eligibility',
      });
    }

    const [
      organization,
      grantProgram,
    ] = await Promise.all([
      Organization.findById(
        req.user.organization
      ),

      GrantProgram.findById(
        grantProgramId
      ),
    ]);

    if (!grantProgram) {
      return res.status(404).json({
        success: false,
        message:
          'Grant program not found',
      });
    }

    if (!organization) {
      return res.status(404).json({
        success: false,
        message:
          'Organization profile not found',
      });
    }

    const result =
      await evaluateEligibility(
        organization,
        grantProgram
      );

    res.json({
      success: true,
      eligibility: result,
    });
  } catch (error) {
    console.error(
      'Error checking eligibility:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// CREATE PROPOSAL
// Supports both GrantListing and GrantProgram
// ─────────────────────────────────────────────────────────────

// @route POST /api/proposals/create
exports.createProposal = async (
  req,
  res
) => {
  try {
    const {
      title,
      grantTitle,
      grantAgency,
      fundingAmount,
      deadline,
      grantListingId,
      grantProgramId,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message:
          'Proposal title is required',
      });
    }

    // Duplicate guard for scraped grants
    if (grantListingId) {
      const existing =
        await Proposal.findOne({
          organization:
            req.user.organization,

          grantListingId,

          status: {
            $nin: ['Rejected'],
          },
        });

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            'Your organization already has an active proposal for this grant',
        });
      }
    }

    let linkedProgram = null;

    let eligibilitySnapshot = {
      isEligible: null,
      checks: [],
      checkedAt: null,
    };

    let resolvedGrantTitle =
      grantTitle || '';

    let resolvedGrantAgency =
      grantAgency || '';

    let resolvedFundingAmount =
      fundingAmount || '';

    let resolvedDeadline =
      deadline || '';

    // GrantProgram flow
    if (grantProgramId) {
      linkedProgram =
        await GrantProgram.findById(
          grantProgramId
        );

      if (!linkedProgram) {
        return res.status(404).json({
          success: false,
          message:
            'Grant program not found',
        });
      }

      if (
        linkedProgram.status !==
        'Active'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This grant call is no longer accepting submissions',
        });
      }

      if (
        new Date(
          linkedProgram.deadline
        ) < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'The submission deadline for this grant call has passed',
        });
      }

      const organization =
        await Organization.findById(
          req.user.organization
        );

      if (!organization) {
        return res.status(400).json({
          success: false,
          message:
            'Complete your organization profile before submitting a proposal',
        });
      }

      const eligibility =
        await evaluateEligibility(
          organization,
          linkedProgram
        );

      if (
        !eligibility.isEligible
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Your organization is not eligible for this grant call',
          eligibility,
        });
      }

      eligibilitySnapshot =
        eligibility;

      const agency =
        await FundingAgency.findById(
          linkedProgram.fundingAgency
        );

      resolvedGrantTitle =
        linkedProgram.title;

      resolvedGrantAgency =
        agency
          ? agency.agencyName
          : resolvedGrantAgency;

      resolvedFundingAmount =
        resolvedFundingAmount ||
        linkedProgram.budget;

      resolvedDeadline =
        linkedProgram.deadline
          .toISOString()
          .split('T')[0];
    }

    const sections =
      Proposal.getDefaultSections();

    const proposal =
      await Proposal.create({
        title,

        grantTitle:
          resolvedGrantTitle,

        grantAgency:
          resolvedGrantAgency,

        fundingAmount:
          resolvedFundingAmount,

        deadline:
          resolvedDeadline,

        grantListingId:
          grantListingId ||
          null,

        grantProgram:
          linkedProgram
            ? linkedProgram._id
            : null,

        eligibilitySnapshot,

        organization:
          req.user.organization,

        status: 'In Progress',

        progress: 0,

        sections,
      });

    res.status(201).json({
      success: true,
      message:
        'Proposal created with 17 sections',
      proposal,
    });
  } catch (error) {
    console.error(
      'Error creating proposal:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// OPEN GRANT PROGRAMS
// ─────────────────────────────────────────────────────────────

// @route GET /api/proposals/open-grants
exports.getOpenGrantPrograms = async (
  req,
  res
) => {
  try {
    const programs =
      await GrantProgram.find({
        status: 'Active',
        isDeleted: {
          $ne: true,
        },
      })
        .populate(
          'fundingAgency',
          'agencyName shortName agencyType organizationType ownershipType establishedYear website description mission vision headquarters cin darpanId grantTypesOffered fundingScope fundingStates status'
        )
        .sort({
          deadline: 1,
        });

    const openPrograms =
      programs.filter(
        (program) =>
          program.fundingAgency &&
          program.fundingAgency
            .status === 'approved'
      );

    res.json({
      success: true,
      programs:
        openPrograms,
    });
  } catch (error) {
    console.error(
      'Error fetching open grant programs:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// SCRAPED GRANTS
// ─────────────────────────────────────────────────────────────

// @route GET /api/proposals/scraped-grants
exports.getScrapedGrants = async (
  req,
  res
) => {
  try {
    const grants =
      await GrantListing.find({
        isActive: true,
      })
        .sort({
          lastScrapedAt: -1,
        })
        .limit(100)
        .lean();

    res.json({
      success: true,
      grants,
    });
  } catch (error) {
    console.error(
      'Error fetching scraped grants:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// ORGANIZATION PROPOSALS
// ─────────────────────────────────────────────────────────────

// @route GET /api/proposals/org-proposals
exports.getOrgProposals = async (
  req,
  res
) => {
  try {
    const proposals =
      await Proposal.find({
        organization:
          req.user.organization,
      }).sort({
        updatedAt: -1,
      });

    res.json({
      success: true,
      count: proposals.length,
      proposals,
    });
  } catch (error) {
    console.error(
      'Error fetching org proposals:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// ASSIGN SECTION
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/sections/:sectionId/assign
exports.assignSection = async (
  req,
  res
) => {
  try {
    const {
      proposalId,
      sectionId,
    } = req.params;

    const {
      assignedTo,
      assignedToName,
    } = req.body;

    const proposal =
      await Proposal.findById(
        proposalId
      );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    const section =
      proposal.sections.id(
        sectionId
      );

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    section.assignedTo =
      assignedTo || null;

    section.assignedToName =
      assignedToName || '';

    await proposal.save();

    const updatedProposal =
      proposal.toObject();

    socketHelper.emitToProposal(
      proposalId,
      'proposalSectionsAssigned',
      {
        proposalId,
        proposal:
          updatedProposal,
      }
    );

    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalSectionsAssigned',
        {
          proposalId,
          proposal:
            updatedProposal,
        }
      );
    }

    res.json({
      success: true,
      message:
        `Section "${section.title}" assigned to ${
          assignedToName ||
          'unassigned'
        }`,
      proposal:
        updatedProposal,
    });
  } catch (error) {
    console.error(
      'Error assigning section:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// BULK ASSIGN
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/bulk-assign
exports.bulkAssignSections = async (
  req,
  res
) => {
  try {
    const { proposalId } =
      req.params;

    const { assignments } =
      req.body;

    if (
      !assignments ||
      !Array.isArray(assignments)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Assignments array is required',
      });
    }

    const proposal =
      await Proposal.findById(
        proposalId
      );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    for (
      const assignment of assignments
    ) {
      const section =
        proposal.sections.id(
          assignment.sectionId
        );

      if (section) {
        section.assignedTo =
          assignment.assignedTo ||
          null;

        section.assignedToName =
          assignment.assignedToName ||
          '';
      }
    }

    await proposal.save();

    const updatedProposal =
      proposal.toObject();

    socketHelper.emitToProposal(
      proposalId,
      'proposalSectionsAssigned',
      {
        proposalId,
        proposal:
          updatedProposal,
      }
    );

    if (proposal.organization) {
      socketHelper.emitToOrg(
        proposal.organization.toString(),
        'proposalSectionsAssigned',
        {
          proposalId,
          proposal:
            updatedProposal,
        }
      );
    }

    res.json({
      success: true,
      message:
        `${assignments.length} sections assigned successfully`,
      proposal:
        updatedProposal,
    });
  } catch (error) {
    console.error(
      'Error bulk assigning sections:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// SUBMIT PROPOSAL DIRECTLY TO LINKED GRANT PROGRAM
// ─────────────────────────────────────────────────────────────

// @route PUT /api/proposals/:proposalId/submit
exports.submitProposal = async (
  req,
  res
) => {
  try {
    const { proposalId } =
      req.params;

    const proposal =
      await Proposal.findById(
        proposalId
      );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    if (!proposal.grantProgram) {
      return res.status(400).json({
        success: false,
        message:
          'This proposal is not linked to a GrantOS funding agency grant call and cannot be submitted.',
      });
    }

    const alreadySubmittedStatuses = [
      'Submitted',
      'Under Review',
      'Shortlisted',
      'Rejected',
      'Awarded',
      'Not Awarded',
    ];

    if (
      alreadySubmittedStatuses.includes(
        proposal.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This proposal has already been submitted.',
      });
    }

    proposal.status =
      'Submitted';

    proposal.submittedAt =
      new Date();

    await proposal.save();

    res.json({
      success: true,
      message:
        'Proposal submitted to the funding agency',
      proposal:
        proposal.toObject(),
    });
  } catch (error) {
    console.error(
      'Error submitting proposal:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET MY ORGANIZATION
// ─────────────────────────────────────────────────────────────

// @route GET /api/proposals/my-organization
exports.getMyOrganization = async (
  req,
  res
) => {
  try {
    if (!req.user.organization) {
      return res.status(404).json({
        success: false,
        message:
          'No organization found for this user',
      });
    }

    const organization =
      await Organization.findById(
        req.user.organization
      );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message:
          'Organization not found',
      });
    }

    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error(
      'Error fetching organization:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE PROPOSAL
// ─────────────────────────────────────────────────────────────

// @route DELETE /api/proposals/:proposalId
exports.deleteProposal = async (
  req,
  res
) => {
  try {
    const { proposalId } =
      req.params;

    const proposal =
      await Proposal.findById(
        proposalId
      );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found',
      });
    }

    await Proposal.findByIdAndDelete(
      proposalId
    );

    res.json({
      success: true,
      message:
        'Proposal deleted successfully',
    });
  } catch (error) {
    console.error(
      'Error deleting proposal:',
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};