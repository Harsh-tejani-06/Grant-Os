const Proposal = require('../models/Proposal');
const GrantListing = require('../models/GrantListing');
const socketHelper = require('../socket');

// ─── Default sample proposals for first-time team members ───
const DEFAULT_SAMPLE_PROPOSALS = (userId, userName, orgId) => [
  {
    title: 'UGC Major Research Project Proposal',
    grantTitle: 'UGC Major Research Project in Science & Tech',
    grantAgency: 'University Grants Commission (UGC)',
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

// ─── Role-to-section mapping ───
const ROLE_SECTION_MAP = {
  principal_investigator: ['sec_1', 'sec_2', 'sec_3', 'sec_6', 'sec_11', 'sec_16'],
  senior_researcher: ['sec_4', 'sec_5', 'sec_7', 'sec_9', 'sec_17'],
  finance_manager: ['sec_14', 'sec_15'],
  compliance_manager: ['sec_8', 'sec_10', 'sec_12', 'sec_13'],
};

// @desc    Get all proposals with sections assigned to the logged-in team member
// @route   GET /api/proposals/my-assigned
// @access  Private (team_member / org_admin)
exports.getMyAssignedProposals = async (req, res) => {
  try {
    const userId = req.user._id;
    const userName = req.user.fullName;
    const orgId = req.user.organization;

    // Find proposals where this user has assigned sections OR belongs to same org
    let proposals = await Proposal.find({
      $or: [
        { 'sections.assignedTo': userId },
        { organization: orgId },
      ],
    }).sort({ updatedAt: -1 });

    // If no proposals exist yet, seed one for this user's org
    if (!proposals || proposals.length === 0) {
      const defaults = DEFAULT_SAMPLE_PROPOSALS(userId, userName, orgId);
      const inserted = [];
      for (const p of defaults) {
        const newP = await Proposal.create(p);
        inserted.push(newP);
      }
      proposals = inserted;
    }

    // Filter sections: team_members see ONLY their assigned sections, UNLESS they are Principal Investigator (PI) or Org Admin
    const isPIOrAdmin =
      req.user.role === 'org_admin' ||
      (req.user.jobTitle &&
        (req.user.jobTitle.toLowerCase().includes('principal investigator') ||
         req.user.jobTitle.toLowerCase().includes('pi'))) ||
      (req.user.fullName &&
        (req.user.fullName.toLowerCase().includes('principal investigator') ||
         req.user.fullName.toLowerCase().includes('pi'))) ||
      (req.user.email &&
        (req.user.email.toLowerCase().includes('pi.') ||
         req.user.email.toLowerCase().startsWith('pi@')));

    let result = proposals.map((p) => {
      const pObj = p.toObject();
      if (!isPIOrAdmin) {
        pObj.sections = pObj.sections.filter(
          (sec) =>
            sec.assignedTo &&
            sec.assignedTo.toString() === userId.toString()
        );
      }
      return pObj;
    });

    // Filter out proposals with 0 assigned sections for non-PI team members
    if (!isPIOrAdmin) {
      result = result.filter((p) => p.sections && p.sections.length > 0);
    }

    res.json({
      success: true,
      count: result.length,
      proposals: result,
    });
  } catch (error) {
    console.error('Error fetching assigned proposals:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a specific proposal section (content + status)
// @route   PUT /api/proposals/:proposalId/sections/:sectionId
// @access  Private
exports.updateSection = async (req, res) => {
  try {
    const { proposalId, sectionId } = req.params;
    const { content, status } = req.body;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (['Submitted to Admin', 'Submitted to Agency', 'Submitted'].includes(proposal.status)) {
      return res.status(403).json({
        success: false,
        message: 'This proposal has been officially submitted and is permanently locked for editing.',
      });
    }

    const section = proposal.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    if (content !== undefined) section.content = content;
    if (status !== undefined) section.status = status;
    section.lastEditedAt = new Date();

    // Recalculate overall proposal progress
    const totalSections = proposal.sections.length;
    const completedSections = proposal.sections.filter(
      (s) => s.status === 'Ready for Review' || s.status === 'Approved'
    ).length;
    proposal.progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

    await proposal.save();

    const updatedSecObj = section.toObject();
    const updatedPropObj = proposal.toObject();

    // Broadcast live update to team members in proposal room
    socketHelper.emitToProposal(proposalId, 'proposalSectionUpdated', {
      proposalId,
      sectionId,
      section: updatedSecObj,
      progress: proposal.progress,
      updatedBy: { id: req.user._id, name: req.user.fullName },
    });
    // Broadcast live update to organization admin dashboard
    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalSectionUpdated', {
        proposalId,
        sectionId,
        section: updatedSecObj,
        progress: proposal.progress,
      });
    }

    res.json({
      success: true,
      message: 'Section updated successfully',
      proposal: updatedPropObj,
      section: updatedSecObj,
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve all 17 sections of a proposal at once (PI or Org Admin)
// @route   PUT /api/proposals/:proposalId/approve-all
// @access  Private (PI or Org Admin)
exports.approveAllSections = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const isAuthorized = req.user.role === 'org_admin' ||
      (req.user.jobTitle && (
        req.user.jobTitle.toLowerCase().includes('principal investigator') ||
        req.user.jobTitle.toLowerCase().includes('pi')
      )) ||
      (req.user.fullName && (
        req.user.fullName.toLowerCase().includes('principal investigator') ||
        req.user.fullName.toLowerCase().includes('pi')
      )) ||
      (req.user.email && (
        req.user.email.toLowerCase().includes('pi.') ||
        req.user.email.toLowerCase().startsWith('pi@')
      ));

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Only Principal Investigator or Admin can approve all sections' });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (['Submitted to Admin', 'Submitted to Agency', 'Submitted'].includes(proposal.status)) {
      return res.status(403).json({
        success: false,
        message: 'This proposal has already been submitted and cannot be approved again.',
      });
    }

    proposal.sections.forEach((sec) => {
      sec.status = 'Approved';
      sec.lastEditedAt = new Date();
    });

    proposal.progress = 100;
    proposal.status = 'Under Review';
    await proposal.save();

    const updatedPropObj = proposal.toObject();

    // Broadcast live update to proposal room
    socketHelper.emitToProposal(proposalId, 'proposalAllSectionsApproved', {
      proposalId,
      sections: updatedPropObj.sections,
      progress: 100,
      status: proposal.status,
      approvedBy: { id: req.user._id, name: req.user.fullName },
    });
    // Broadcast live update to organization admin dashboard
    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalAllSectionsApproved', {
        proposalId,
        sections: updatedPropObj.sections,
        progress: 100,
        status: proposal.status,
      });
    }

    res.json({
      success: true,
      message: 'All sections approved successfully',
      proposal: updatedPropObj,
    });
  } catch (error) {
    console.error('Error approving all sections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    PI submits final completed proposal to Org Admin
// @route   PUT /api/proposals/:proposalId/submit-admin
// @access  Private (PI or Org Admin)
exports.submitToAdmin = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (['Submitted to Admin', 'Submitted to Agency', 'Submitted'].includes(proposal.status)) {
      return res.status(400).json({
        success: false,
        message: 'Proposal has already been submitted to the Admin / Agency.',
      });
    }

    proposal.status = 'Submitted to Admin';
    proposal.submittedByPIAt = new Date();
    await proposal.save();

    const updatedPropObj = proposal.toObject();

    // Broadcast live update to proposal room and org
    socketHelper.emitToProposal(proposalId, 'proposalSubmittedToAdmin', {
      proposalId,
      status: proposal.status,
      submittedByPIAt: proposal.submittedByPIAt,
    });
    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalSubmittedToAdmin', {
        proposalId,
        status: proposal.status,
        submittedByPIAt: proposal.submittedByPIAt,
      });
    }

    res.json({
      success: true,
      message: 'Proposal successfully submitted to Organization Admin',
      proposal: updatedPropObj,
    });
  } catch (error) {
    console.error('Error submitting proposal to admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Pre-Submission Institutional Checklist (Org Admin)
// @route   PUT /api/proposals/:proposalId/checklist
// @access  Private (org_admin)
exports.updatePreSubmissionChecklist = async (req, res) => {
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

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (proposal.status === 'Submitted to Agency') {
      return res.status(400).json({
        success: false,
        message: 'Proposal has already been submitted to the agency. Checklist cannot be altered.',
      });
    }

    proposal.preSubmissionChecklist = {
      endorsementLetter: endorsementLetter !== undefined ? Boolean(endorsementLetter) : Boolean(proposal.preSubmissionChecklist?.endorsementLetter),
      investigatorCvs: investigatorCvs !== undefined ? Boolean(investigatorCvs) : Boolean(proposal.preSubmissionChecklist?.investigatorCvs),
      ethicalClearance: ethicalClearance !== undefined ? Boolean(ethicalClearance) : Boolean(proposal.preSubmissionChecklist?.ethicalClearance),
      biosafetyClearance: biosafetyClearance !== undefined ? Boolean(biosafetyClearance) : Boolean(proposal.preSubmissionChecklist?.biosafetyClearance),
      financeAudit: financeAudit !== undefined ? Boolean(financeAudit) : Boolean(proposal.preSubmissionChecklist?.financeAudit),
      conflictOfInterest: conflictOfInterest !== undefined ? Boolean(conflictOfInterest) : Boolean(proposal.preSubmissionChecklist?.conflictOfInterest),
      lastUpdatedBy: req.user.fullName,
      lastUpdatedAt: new Date(),
    };

    await proposal.save();
    const updatedPropObj = proposal.toObject();

    // Broadcast live event
    socketHelper.emitToProposal(proposalId, 'proposalChecklistUpdated', {
      proposalId,
      checklist: updatedPropObj.preSubmissionChecklist,
      updatedBy: req.user.fullName,
    });
    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalChecklistUpdated', {
        proposalId,
        checklist: updatedPropObj.preSubmissionChecklist,
        updatedBy: req.user.fullName,
      });
    }

    res.json({
      success: true,
      message: 'Pre-submission checklist updated',
      checklist: updatedPropObj.preSubmissionChecklist,
      proposal: updatedPropObj,
    });
  } catch (error) {
    console.error('Error updating pre-submission checklist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit proposal to Funding Agency (Org Admin)
// @route   PUT /api/proposals/:proposalId/submit-agency
// @access  Private (org_admin)
exports.submitToAgency = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { agencySubmissionId, receiptNote } = req.body;

    if (!agencySubmissionId || !agencySubmissionId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Official Agency Reference ID / Confirmation ID is required (e.g., UGC/2026/MRP-8841).',
      });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (proposal.status === 'Submitted to Agency') {
      return res.status(400).json({
        success: false,
        message: 'This proposal has already been submitted to the funding agency.',
      });
    }

    // Verify institutional endorsement letter
    const checklist = proposal.preSubmissionChecklist || {};
    if (!checklist.endorsementLetter) {
      return res.status(400).json({
        success: false,
        message: 'Institutional Endorsement Letter must be verified before submitting to the funding agency.',
      });
    }

    proposal.status = 'Submitted to Agency';
    proposal.agencySubmission = {
      agencySubmissionId: agencySubmissionId.trim(),
      receiptNote: receiptNote ? receiptNote.trim() : '',
      submittedAt: new Date(),
      submittedBy: req.user._id,
      submittedByName: req.user.fullName,
    };

    // Add official audit notice into team chat
    const officialNotice = {
      senderId: req.user._id,
      senderName: `${req.user.fullName} (Org Admin)`,
      senderRole: 'org_admin',
      text: `🏛️ Official Submission: This proposal has been formally endorsed and submitted to ${proposal.grantAgency || 'the funding agency'}. Agency Reference ID: "${agencySubmissionId.trim()}". All proposal sections are now permanently locked and archived.`,
      createdAt: new Date(),
    };
    proposal.comments.push(officialNotice);

    await proposal.save();
    const updatedPropObj = proposal.toObject();

    // Broadcast live to proposal room and org room
    socketHelper.emitToProposal(proposalId, 'proposalSubmittedToAgency', {
      proposalId,
      status: 'Submitted to Agency',
      agencySubmission: updatedPropObj.agencySubmission,
      message: 'Your proposal has been officially endorsed and submitted to the funding agency by the Organization Admin.',
      submittedBy: { id: req.user._id, name: req.user.fullName },
      comment: officialNotice,
      comments: updatedPropObj.comments,
    });

    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalSubmittedToAgency', {
        proposalId,
        status: 'Submitted to Agency',
        agencySubmission: updatedPropObj.agencySubmission,
        submittedBy: { id: req.user._id, name: req.user.fullName },
      });
    }

    res.json({
      success: true,
      message: `Proposal successfully submitted to ${proposal.grantAgency || 'Funding Agency'}!`,
      proposal: updatedPropObj,
    });
  } catch (error) {
    console.error('Error submitting proposal to agency:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update post-submission tracking status & award details (Org Admin)
// @route   PUT /api/proposals/:proposalId/tracking-status
// @access  Private (org_admin)
exports.updateProposalTrackingStatus = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { status, notes, awardDetails } = req.body;

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
        message: `Invalid tracking status: ${status}`,
      });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const oldStatus = proposal.status;
    proposal.status = status;

    if (!proposal.trackingTimeline) {
      proposal.trackingTimeline = [];
    }

    proposal.trackingTimeline.push({
      stage: status,
      updatedBy: req.user.fullName,
      notes: notes || `Status changed from ${oldStatus} to ${status}`,
      timestamp: new Date(),
    });

    if (status === 'Awarded' && awardDetails) {
      proposal.awardDetails = {
        sanctionOrderNumber: awardDetails.sanctionOrderNumber?.trim() || proposal.awardDetails?.sanctionOrderNumber || '',
        sanctionedAmount: awardDetails.sanctionedAmount?.trim() || proposal.awardDetails?.sanctionedAmount || '',
        startDate: awardDetails.startDate || proposal.awardDetails?.startDate || null,
        durationMonths: Number(awardDetails.durationMonths) || proposal.awardDetails?.durationMonths || 0,
        sanctionNotes: awardDetails.sanctionNotes?.trim() || proposal.awardDetails?.sanctionNotes || '',
        awardedAt: new Date(),
        awardedBy: req.user.fullName,
      };
    }

    // Add notification into Proposal Team Chat
    const statusIcons = {
      'Under Evaluation': '🔍',
      'Revisions Requested': '⚠️',
      'Awarded': '🏆',
      'Rejected': '❌',
      'Submitted to Agency': '🏛️',
    };
    const icon = statusIcons[status] || '📋';
    const auditNotice = {
      senderId: req.user._id,
      senderName: `${req.user.fullName} (Org Admin)`,
      senderRole: 'org_admin',
      text: `${icon} Tracking Update: Proposal status updated to "${status}"${notes ? ` — Note: ${notes}` : ''}${status === 'Awarded' && proposal.awardDetails?.sanctionedAmount ? ` (Sanctioned: ${proposal.awardDetails.sanctionedAmount}, Order #${proposal.awardDetails.sanctionOrderNumber || 'Pending'})` : ''}.`,
      createdAt: new Date(),
    };
    proposal.comments.push(auditNotice);

    await proposal.save();
    const updatedPropObj = proposal.toObject();

    // Broadcast live event
    socketHelper.emitToProposal(proposalId, 'proposalTrackingStatusUpdated', {
      proposalId,
      status,
      awardDetails: updatedPropObj.awardDetails,
      trackingTimeline: updatedPropObj.trackingTimeline,
      comment: auditNotice,
      comments: updatedPropObj.comments,
      updatedBy: req.user.fullName,
    });

    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalTrackingStatusUpdated', {
        proposalId,
        status,
        awardDetails: updatedPropObj.awardDetails,
        trackingTimeline: updatedPropObj.trackingTimeline,
        updatedBy: req.user.fullName,
      });
    }

    res.json({
      success: true,
      message: `Proposal tracking status updated to ${status}`,
      proposal: updatedPropObj,
    });
  } catch (error) {
    console.error('Error updating tracking status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to a proposal section
// @route   POST /api/proposals/:proposalId/sections/:sectionId/comments
// @access  Private
exports.addSectionComment = async (req, res) => {
  try {
    const { proposalId, sectionId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const section = proposal.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
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

    const savedComment = section.comments[section.comments.length - 1];

    // Broadcast section comment
    socketHelper.emitToProposal(proposalId, 'sectionCommentAdded', {
      proposalId,
      sectionId,
      comment: savedComment,
      comments: section.comments,
    });

    res.json({
      success: true,
      message: 'Comment added',
      comments: section.comments,
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to proposal-wide team chat
// @route   POST /api/proposals/:proposalId/comments
// @access  Private
exports.addProposalComment = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
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

    const savedComment = proposal.comments[proposal.comments.length - 1];

    // Broadcast team chat comment instantaneously to all members viewing this proposal
    socketHelper.emitToProposal(proposalId, 'proposalCommentAdded', {
      proposalId,
      comment: savedComment,
      comments: proposal.comments,
    });

    res.json({
      success: true,
      message: 'Team comment added',
      comments: proposal.comments,
    });
  } catch (error) {
    console.error('Error adding proposal comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI Assistant for section drafting & refinement with real DB Grant & Proposal context
// @route   POST /api/proposals/ai-assist
// @access  Private
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

    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Fetch the Proposal from MongoDB if proposalId provided
    let proposal = null;
    if (proposalId) {
      try {
        proposal = await Proposal.findById(proposalId);
      } catch (e) {
        console.warn('Proposal lookup failed:', e.message);
      }
    }

    // 2. Fetch the REAL GrantListing from MongoDB
    let grantDoc = null;
    if (proposal?.grantListingId) {
      try {
        grantDoc = await GrantListing.findById(proposal.grantListingId);
      } catch (e) {}
    }

    if (!grantDoc) {
      const searchTitle = (grantTitle || proposal?.grantTitle || '').trim();
      const searchAgency = (grantAgency || proposal?.grantAgency || '').trim();

      if (searchTitle) {
        // Try exact match or clean word match
        const cleanTitleWords = searchTitle.replace(/[()[\]-]/g, ' ').trim().split(/\s+/).filter(w => w.length > 2);
        if (cleanTitleWords.length > 0) {
          const regexPattern = cleanTitleWords.slice(0, 3).join('.*');
          grantDoc = await GrantListing.findOne({
            title: { $regex: regexPattern, $options: 'i' },
          });
        }
        if (!grantDoc) {
          grantDoc = await GrantListing.findOne({
            title: { $regex: searchTitle.slice(0, 25), $options: 'i' },
          });
        }
      }

      if (!grantDoc && searchAgency) {
        grantDoc = await GrantListing.findOne({
          'agency.name': { $regex: searchAgency.slice(0, 25), $options: 'i' },
        });
      }
    }

    // 3. Consolidate genuine metadata from the database
    const realAgencyName = grantDoc?.agency?.name || grantAgency || proposal?.grantAgency || 'Funding Agency';
    const realImplementingBody = grantDoc?.agency?.implementingBody || '';
    const realGrantTitle = grantDoc?.title || grantTitle || proposal?.grantTitle || 'Research Grant';
    const realDescription = grantDoc?.description || '';
    const realEligibility = grantDoc?.eligibilityText || '';
    const realProcedure = grantDoc?.applicationProcedure || '';
    const realFocusAreas = (grantDoc?.focusAreas && grantDoc.focusAreas.length > 0)
      ? grantDoc.focusAreas.join(', ')
      : (grantDoc?.categoryRaw || '');
    const realFundingAmount = grantDoc?.fundingAmount?.rawText || fundingAmount || proposal?.fundingAmount || '';
    const realDuration = grantDoc?.duration?.rawText || '';
    const realDeadline = grantDoc?.deadline?.rawText || deadline || proposal?.deadline || '';
    const realGuidelines = grantDoc?.links?.guidelinesUrl || grantDoc?.links?.infoUrl || '';
    const effectiveProposalTitle = proposalTitle || proposal?.title || 'Academic Research Project';
    
    // Parse word limit from user's custom instructions or section limit
    let strictWordLimit = wordCountLimit || 500;
    const matchWords = prompt && prompt.match(/(?:under|within|less than|max|maximum|around)?\s*(\d+)\s*(?:words|word)/i);
    if (matchWords) {
      strictWordLimit = parseInt(matchWords[1], 10);
    } else if (wordCountLimit && wordCountLimit < strictWordLimit) {
      strictWordLimit = wordCountLimit;
    }
    const isShortTarget = strictWordLimit <= 100;

    // 4. Extract cross-section proposal coherence (Abstract, Objectives, etc.)
    let relatedProposalContext = '';
    if (proposal && proposal.sections) {
      const titleSec = proposal.sections.find(s => s.sectionKey === 'sec_1' || s.title?.toLowerCase().includes('title'));
      const abstractSec = proposal.sections.find(s => s.sectionKey === 'sec_2' || s.title?.toLowerCase().includes('abstract') || s.title?.toLowerCase().includes('summary'));
      if (titleSec?.content?.trim() && !sectionTitle?.toLowerCase().includes('title')) {
        relatedProposalContext += `\nExisting Proposed Title/Context: ${titleSec.content.trim().slice(0, 250)}`;
      }
      if (abstractSec?.content?.trim() && !sectionTitle?.toLowerCase().includes('abstract') && !sectionTitle?.toLowerCase().includes('summary')) {
        relatedProposalContext += `\nExisting Proposal Abstract: ${abstractSec.content.trim().slice(0, 450)}`;
      }
    }

    // 5. Build strict, academic, domain-specific System Instruction & Prompts
    const systemInstruction = `You are GrantOS AI Research Advisor, an elite proposal development specialist for premier funding bodies including India's DST, SERB, UGC, AICTE, CSIR, DBT, ICSSR, and international research foundations.
CRITICAL INSTRUCTION:
Your responses must be STRICTLY SPECIFIC and TAILORED to the real grant opportunity from the agency database and the selected proposal.
- Grant Scheme: "${realGrantTitle}"
- Funding Agency: "${realAgencyName}" ${realImplementingBody ? `(${realImplementingBody})` : ''}
- Proposal Title: "${effectiveProposalTitle}"
${realDescription ? `- Agency Scheme Focus: ${realDescription}` : ''}
${realFocusAreas ? `- Priority Focus Areas: ${realFocusAreas}` : ''}
${realEligibility ? `- Eligibility Mandate: ${realEligibility}` : ''}
${realFundingAmount ? `- Scheme Funding Envelope: ${realFundingAmount}` : ''}

${prompt ? `⭐⭐⭐ INVESTIGATOR'S MANDATORY CUSTOM INSTRUCTIONS (HIGHEST PRIORITY) ⭐⭐⭐
"${prompt}"
You MUST prioritize and strictly follow this instruction above all default behaviors.` : ''}

Rules:
1. STRICT WORD COUNT ENFORCEMENT: The output MUST be strictly UNDER ${strictWordLimit} WORDS (maximum ${strictWordLimit} words). Count your words carefully. Do NOT exceed ${strictWordLimit} words.
${isShortTarget ? `2. IMPORTANT FOR SHORT TARGETS: Because the requested length is ${strictWordLimit} words, do NOT include markdown headings, titles, or introductions (e.g. do NOT write "### Executive Summary..."). Output ONLY the direct, concise paragraph text itself so you do not waste words on headings.` : '2. Format with clean, structured Markdown (headings, bullet points, structured tables, bold text).'}
3. NEVER output generic placeholders (e.g. do NOT write "insert technology here", "XYZ organization", or "[project domain]").
4. Base all methodology, milestones, budget allocations, technical deliverables, and scientific justifications directly on the real grant mandate and the proposal title.
5. If drafting Budget or Timeline, use realistic academic norms (e.g., JRF/SRF/Research Associate fellowship slabs, consumables, contingency, overheads up to ${realFundingAmount || 'the scheme limit'}).`;

    let userPrompt = '';
    if (action === 'generate') {
      userPrompt = `Please write a publication-grade proposal section for:
**Section Title:** "${sectionTitle}"
**Grant Scheme:** "${realGrantTitle}" (${realAgencyName})
**Proposal Title:** "${effectiveProposalTitle}"
${relatedProposalContext}
${starterGuide ? `**Section Template Guidelines from Agency:**\n${starterGuide}\n` : ''}

${prompt ? `INVESTIGATOR'S CUSTOM INSTRUCTION (MANDATORY TO SATISFY):\n"${prompt}"\n` : ''}
STRICT CONSTRAINT: Total output MUST NOT exceed ${strictWordLimit} words. ${isShortTarget ? 'Do NOT include markdown headings. Output pure concise text.' : ''}`;
    } else if (action === 'improve') {
      userPrompt = `Please critique, elevate, and rewrite the following draft for the section "${sectionTitle}" to strictly align with "${realGrantTitle}" (${realAgencyName}):

${prompt ? `INVESTIGATOR'S CUSTOM INSTRUCTION (MANDATORY TO SATISFY):\n"${prompt}"\n` : ''}
STRICT CONSTRAINT: Total output MUST NOT exceed ${strictWordLimit} words. ${isShortTarget ? 'Do NOT include markdown headings.' : ''}

Draft Content:
${currentContent}`;
    } else if (action === 'summarize') {
      userPrompt = `Summarize the following draft for section "${sectionTitle}" regarding the grant "${realGrantTitle}" (${realAgencyName}).

${prompt ? `INVESTIGATOR'S CUSTOM INSTRUCTION (MANDATORY TO SATISFY):\n"${prompt}"\n` : ''}
STRICT WORD COUNT CONSTRAINT:
The summary MUST be strictly UNDER ${strictWordLimit} WORDS total (maximum ${strictWordLimit} words).
${isShortTarget ? 'Do NOT include any markdown headings or titles. Output ONLY the concise summary text.' : ''}

Content to Summarize:
${currentContent}`;
    } else if (action === 'compliance') {
      userPrompt = `Perform a formal compliance and quality review for the proposal draft of "${sectionTitle}" against the real guidelines of "${realGrantTitle}" (${realAgencyName}).
${realEligibility ? `Agency Eligibility & Requirements: ${realEligibility}\n` : ''}
${realFundingAmount ? `Funding Ceiling: ${realFundingAmount}\n` : ''}
${prompt ? `INVESTIGATOR'S CUSTOM REVIEW FOCUS: "${prompt}"\n` : ''}

Draft to Review:
${currentContent}

Provide:
1. Compliance Assessment (Check against agency priorities, word limits, and eligibility).
2. Strengths of the current draft.
3. Concrete, high-value improvements needed before final submission to ${realAgencyName}.`;
    } else {
      userPrompt = `Review and refine content for section "${sectionTitle}" for grant "${realGrantTitle}":\n\n${prompt ? `Custom request: ${prompt}\n\n` : ''}${currentContent}`;
    }

    // 6. Execute Gemini 3.6 / 3.7 / 3.5 API with real grant context
    if (apiKey) {
      const modelsToTry = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
      for (const modelName of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: systemInstruction },
                      { text: userPrompt },
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
            const geminiData = await response.json();
            let generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generatedText) {
              // Word limit post-processing guard to guarantee limit compliance
              const countWords = (str) => (str ? str.trim().split(/\s+/).filter(Boolean).length : 0);
              if (isShortTarget && generatedText.startsWith('#')) {
                generatedText = generatedText.replace(/^#+.*?\n+/s, '').trim();
              }
              const currentWordCount = countWords(generatedText);
              if (currentWordCount > strictWordLimit) {
                const wordsArr = generatedText.trim().split(/\s+/).filter(Boolean);
                let trimmed = wordsArr.slice(0, strictWordLimit).join(' ');
                const lastPeriod = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf('!'), trimmed.lastIndexOf('?'));
                if (lastPeriod > trimmed.length * 0.6) {
                  trimmed = trimmed.substring(0, lastPeriod + 1);
                }
                generatedText = trimmed;
              }

              return res.json({
                success: true,
                text: generatedText,
                modelUsed: modelName,
                matchedGrant: {
                  title: realGrantTitle,
                  agency: realAgencyName,
                  source: grantDoc ? 'database' : 'proposal',
                },
              });
            }
          } else {
            const errBody = await response.text();
            console.warn(`Gemini (${modelName}) returned ${response.status}:`, errBody.slice(0, 150));
          }
        } catch (geminiErr) {
          console.warn(`Gemini API (${modelName}) failed:`, geminiErr.message);
        }
      }
    }

    // 7. Dynamic Smart Fallback using Real Database Fields (never generic)
    const title = sectionTitle || 'Proposal Section';
    const lower = title.toLowerCase();
    let text = '';

    if (action === 'generate') {
      if (lower.includes('title')) {
        text = isShortTarget
          ? `${effectiveProposalTitle}: Next-Generation Research Architecture for ${realGrantTitle} (${realAgencyName})`
          : `## ${title}\n\n**Full Project Title:**\n${effectiveProposalTitle} under ${realGrantTitle}\n\n**Funding Body:**\n${realAgencyName} ${realImplementingBody ? `(${realImplementingBody})` : ''}\n\n**Primary Thematic Domain:**\n${realFocusAreas || 'Advanced Scientific & Technological Research'}\n\n**Target Duration:**\n${realDuration || '24 to 36 Months'}`;
      } else if (lower.includes('summary') || lower.includes('abstract')) {
        text = isShortTarget
          ? `This project, "${effectiveProposalTitle}", fulfills ${realAgencyName}'s ${realGrantTitle} mandate by delivering high-throughput experimental validation, statistical benchmarks, and institutional datasets across ${realFocusAreas || 'the target domain'}.`
          : `## ${title}\n\n### 1. Executive Overview & Problem Context\nThis project, titled **"${effectiveProposalTitle}"**, directly targets the core research mandate articulated by the **${realAgencyName}** for the **"${realGrantTitle}"** initiative.${realDescription ? ` Specifically, it addresses the agency's call regarding: ${realDescription.slice(0, 300)}...` : ''}\n\n### 2. Methodological Innovation & Core Objectives\n- **Objective 1 (Foundational Framework)**: Formulate baseline computational and empirical models tailored to ${realFocusAreas || 'the target domain'}.\n- **Objective 2 (Experimental Validation)**: Deploy a high-throughput testbed to benchmark parameters with statistical confidence.\n- **Objective 3 (Institutional Translation)**: Produce verifiable datasets, open-source architectures, and publication outputs adhering to ${realAgencyName} open-science norms.\n\n### 3. Expected National & Scientific Impact\nDirectly fulfills ${realAgencyName} evaluation criteria by advancing state-of-the-art capability, facilitating human resource development (JRF/SRF training), and generating tangible societal outcomes.`;
      } else if (lower.includes('budget') && !lower.includes('justification')) {
        const totalAmountStr = realFundingAmount || '₹25,00,000';
        text = `## ${title}\n\n*Budget formulation aligned with ${realAgencyName} funding norms for "${realGrantTitle}" (Envelope: ${totalAmountStr})*\n\n| Budget Head | Item / Personnel Description | Year 1 (₹) | Year 2 (₹) | Total (₹) |\n| :--- | :--- | :--- | :--- | :--- |\n| **A. Capital / Equipment** | Specialized Hardware & Experimental Node | 8,00,000 | 2,00,000 | 10,00,000 |\n| **B. Manpower / Personnel** | Junior/Senior Research Fellow (as per ${realAgencyName} norms) | 4,20,000 | 4,20,000 | 8,40,000 |\n| **C. Consumables & Cloud** | Computational Credits, Specialized Software & Lab Reagents | 1,50,000 | 1,50,000 | 3,00,000 |\n| **D. Travel & Fieldwork** | National/International Dissemination & Field Data Collection | 1,00,000 | 1,00,000 | 2,00,000 |\n| **E. Institutional Overhead** | Host Institution Indirect Cost & Contingency | 80,000 | 80,000 | 1,60,000 |\n| **GRAND TOTAL** | | **15,50,000** | **9,50,000** | **${totalAmountStr}** |`;
      } else if (lower.includes('timeline') || lower.includes('milestone')) {
        text = `## ${title}\n\n*Milestone delivery roadmap adhering to "${realGrantTitle}" guidelines (${realAgencyName})*\n\n| Phase | Target Window | Key Work Package & Technical Deliverable | Lead Responsibility | Milestone Verification |\n| :--- | :--- | :--- | :--- | :--- |\n| **Phase I** | Months 1–6 | Literature consolidation, baseline parameter setup & ethics clearance | Principal Investigator | Milestone 1 (${realAgencyName} Progress Report) |\n| **Phase II** | Months 7–15 | Core methodology implementation & prototype development | Senior Researcher | Milestone 2 (Working Testbed Demonstrated) |\n| **Phase III** | Months 16–24 | Extensive benchmarking, empirical validation & multi-site testing | Project Research Team | Milestone 3 (Peer-reviewed Paper Submitted) |\n| **Phase IV** | Months 25–36 | Institutional handover, open data release & final project audit | PI & Compliance Lead | Final Project Completion Certificate |`;
      } else if (lower.includes('risk')) {
        text = `## ${title}\n\n*Risk Assessment Matrix tailored to "${effectiveProposalTitle}" under ${realAgencyName}*\n\n| Risk Category | Specific Technical / Operational Risk | Severity | Proactive Mitigation Strategy |\n| :--- | :--- | :--- | :--- |\n| **Technical** | Complex parameter convergence or hardware limitations in ${realFocusAreas || 'target research'} | Medium | Maintain dual computational pipelines and pre-validated fallback algorithms |\n| **Operational** | Procurement timeline bottlenecks for specialized equipment | Low | Pre-qualify vendor tenders immediately upon sanction of ${realGrantTitle} funds |\n| **Regulatory** | Data access clearances or institutional ethics protocol delays | Medium | Pre-submit formal institutional clearance documentation in Month 1 |`;
      } else {
        text = `## ${title}\n\n### 1. Contextual Alignment with ${realGrantTitle}\nThis section establishes the specific scientific foundation of **"${effectiveProposalTitle}"**, directly addressing priorities outlined by **${realAgencyName}**${realDescription ? `: *"${realDescription.slice(0, 200)}..."*` : ''}.\n\n### 2. Implementation Methodology & Innovation\n- **Targeted Novelty**: Addresses critical gaps within ${realFocusAreas || 'the approved grant domain'}.\n- **Rigorous Verification**: Employs standardized empirical protocols fulfilling ${realAgencyName} evaluation criteria.\n- **Deliverables**: Phased outputs designed to generate high-impact scholarly publications and deployable knowledge.\n\n${prompt ? `### 3. Special Focus Notes\n*${prompt}*\n\n` : ''}### 4. Measurable Outcomes\nStructured to ensure compliance with ${realAgencyName} reporting and institutional audit requirements.`;
      }
    } else if (action === 'improve') {
      text = (currentContent || '') + `\n\n### Enhanced Scheme Alignment (${realAgencyName})\nFurthermore, this methodology is calibrated to satisfy the rigorous criteria of **"${realGrantTitle}"**, incorporating reproducible benchmarks, structured risk mitigation, and compliance with ${realAgencyName} data governance guidelines.`;
    } else if (action === 'summarize') {
      text = isShortTarget
        ? `Aligning with ${realAgencyName}'s ${realGrantTitle} mandate, this project advances ${realFocusAreas || 'advanced research'} through rigorous empirical validation and milestone reporting within the ${realFundingAmount || 'allocated'} envelope.`
        : `**Executive Summary for "${title}" (${realGrantTitle}):**\n- **Funding Body**: ${realAgencyName} ${realImplementingBody ? `(${realImplementingBody})` : ''}\n- **Project Focus**: ${effectiveProposalTitle}\n- **Core Deliverables**: Rigorous experimental outcomes aligned with ${realFocusAreas || 'priority research domains'}\n- **Compliance**: Fully conforms to ${realAgencyName} submission guidelines`;
    } else {
      text = `### Official Compliance & Evaluation Review for "${title}":\n*Scheme: ${realGrantTitle} | Agency: ${realAgencyName}*\n\n1. **Priority Alignment**: Verifies coverage of ${realFocusAreas || 'the target research themes'} as mandated by ${realAgencyName}.\n2. **Funding Envelope**: Ensure line-item allocations respect the funding boundary (${realFundingAmount || 'as stipulated in guidelines'}).\n3. **Scientific Impact**: Quantify milestones with clear, auditable KPIs suitable for ${realAgencyName} expert committee review.`;
    }

    res.json({
      success: true,
      text,
      modelUsed: 'database-smart-template',
      matchedGrant: {
        title: realGrantTitle,
        agency: realAgencyName,
        source: grantDoc ? 'database' : 'proposal',
      },
    });
  } catch (error) {
    console.error('Error in AI Assist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new proposal with 17 default sections (org_admin only)
// @route   POST /api/proposals/create
// @access  Private (org_admin)
exports.createProposal = async (req, res) => {
  try {
    const { title, grantTitle, grantAgency, fundingAmount, deadline, grantListingId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Proposal title is required' });
    }

    // Duplicate guard: prevent multiple active proposals for the same grant
    if (grantListingId) {
      const existing = await Proposal.findOne({
        organization: req.user.organization,
        grantListingId,
        status: { $nin: ['Rejected'] },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Your organization already has an active proposal for this grant',
        });
      }
    }

    const sections = Proposal.getDefaultSections();

    const proposal = await Proposal.create({
      title,
      grantTitle: grantTitle || '',
      grantAgency: grantAgency || '',
      fundingAmount: fundingAmount || '',
      deadline: deadline || '',
      grantListingId: grantListingId || null,
      organization: req.user.organization,
      status: 'In Progress',
      progress: 0,
      sections,
    });

    res.status(201).json({
      success: true,
      message: 'Proposal created with 17 sections',
      proposal,
    });
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all proposals for the org (org_admin view)
// @route   GET /api/proposals/org-proposals
// @access  Private (org_admin)
exports.getOrgProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({
      organization: req.user.organization,
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: proposals.length,
      proposals,
    });
  } catch (error) {
    console.error('Error fetching org proposals:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign a section to a team member
// @route   PUT /api/proposals/:proposalId/sections/:sectionId/assign
// @access  Private (org_admin)
exports.assignSection = async (req, res) => {
  try {
    const { proposalId, sectionId } = req.params;
    const { assignedTo, assignedToName } = req.body;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    const section = proposal.sections.id(sectionId);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    section.assignedTo = assignedTo || null;
    section.assignedToName = assignedToName || '';

    await proposal.save();

    const updatedPropObj = proposal.toObject();

    // Broadcast live update to proposal room and org
    socketHelper.emitToProposal(proposalId, 'proposalSectionsAssigned', {
      proposalId,
      proposal: updatedPropObj,
    });
    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalSectionsAssigned', {
        proposalId,
        proposal: updatedPropObj,
      });
    }

    res.json({
      success: true,
      message: `Section "${section.title}" assigned to ${assignedToName || 'unassigned'}`,
      proposal: updatedPropObj,
    });
  } catch (error) {
    console.error('Error assigning section:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk assign sections using role presets
// @route   PUT /api/proposals/:proposalId/bulk-assign
// @access  Private (org_admin)
exports.bulkAssignSections = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { assignments } = req.body;
    // assignments = [{ sectionId, assignedTo, assignedToName }, ...]

    if (!assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ success: false, message: 'Assignments array is required' });
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    for (const a of assignments) {
      const section = proposal.sections.id(a.sectionId);
      if (section) {
        section.assignedTo = a.assignedTo || null;
        section.assignedToName = a.assignedToName || '';
      }
    }

    await proposal.save();

    const updatedPropObj = proposal.toObject();

    // Broadcast live update to proposal room and org
    socketHelper.emitToProposal(proposalId, 'proposalSectionsAssigned', {
      proposalId,
      proposal: updatedPropObj,
    });
    if (proposal.organization) {
      socketHelper.emitToOrg(proposal.organization.toString(), 'proposalSectionsAssigned', {
        proposalId,
        proposal: updatedPropObj,
      });
    }

    res.json({
      success: true,
      message: `${assignments.length} sections assigned successfully`,
      proposal: updatedPropObj,
    });
  } catch (error) {
    console.error('Error bulk assigning sections:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a proposal (org_admin only)
// @route   DELETE /api/proposals/:proposalId
// @access  Private (org_admin)
exports.deleteProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    await Proposal.findByIdAndDelete(proposalId);
    res.json({
      success: true,
      message: 'Proposal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

