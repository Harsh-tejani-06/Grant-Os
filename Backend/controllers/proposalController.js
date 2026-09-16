const Proposal = require('../models/Proposal');

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

    // Filter sections: team_members see ONLY their assigned sections, org_admin sees all
    let result = proposals.map((p) => {
      const pObj = p.toObject();
      if (req.user.role !== 'org_admin') {
        pObj.sections = pObj.sections.filter(
          (sec) =>
            sec.assignedTo &&
            sec.assignedTo.toString() === userId.toString()
        );
      }
      return pObj;
    });

    // Filter out proposals with 0 assigned sections for team members
    if (req.user.role !== 'org_admin') {
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

    res.json({
      success: true,
      message: 'Section updated successfully',
      proposal: proposal.toObject(),
      section: section.toObject(),
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve all 17 sections of a proposal at once (Org Admin only)
// @route   PUT /api/proposals/:proposalId/approve-all
// @access  Private (Org Admin)
exports.approveAllSections = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    proposal.sections.forEach((sec) => {
      sec.status = 'Approved';
      sec.lastEditedAt = new Date();
    });

    proposal.progress = 100;
    proposal.status = 'Under Review';
    await proposal.save();

    res.json({
      success: true,
      message: 'All sections approved successfully',
      proposal: proposal.toObject(),
    });
  } catch (error) {
    console.error('Error approving all sections:', error);
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

// @desc    AI Assistant for section drafting & refinement
// @route   POST /api/proposals/ai-assist
// @access  Private
exports.aiAssist = async (req, res) => {
  try {
    const { action, sectionTitle, currentContent, prompt, grantTitle, grantAgency } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const systemInstruction = `You are GrantOS AI Assistant, an expert research proposal writer for Indian and international grant funding agencies like UGC, DST SERB, ICSSR, and CSIR.
Generate formal, highly academic, precise, structured markdown text. Include section headings, bullet points, and technical clarity.
Keep output concise and under 600 words unless the user specifically asks for more.`;

    let userPrompt = '';
    if (action === 'generate') {
      userPrompt = `Write a comprehensive, professional first draft for the proposal section titled "${sectionTitle}" for the grant "${grantTitle || 'Research Grant'}" by "${grantAgency || 'Funding Agency'}".
User focus: ${prompt || 'Focus on state-of-the-art methodology, clear milestones, and measurable outcomes.'}`;
    } else if (action === 'improve') {
      userPrompt = `Improve and polish the academic tone, scientific clarity, and persuasive structure of this draft:\n\n${currentContent}\n\nInstruction: ${prompt || 'Make it more impactful and rigorous.'}`;
    } else if (action === 'summarize') {
      userPrompt = `Provide a concise 150-word executive summary bullet list of the key highlights:\n\n${currentContent}`;
    } else if (action === 'compliance') {
      userPrompt = `Review this draft for compliance and suggest 3-5 improvements:\n\n${currentContent}`;
    } else {
      userPrompt = `Draft content for section "${sectionTitle}": ${prompt || currentContent}`;
    }

    // Try Gemini API if API key is configured in .env
    if (apiKey) {
      const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-3.1-flash-lite'];
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
              }),
            }
          );

          const geminiData = await response.json();
          const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return res.json({ success: true, text: generatedText, modelUsed: modelName });
          }
        } catch (geminiErr) {
          console.warn(`Gemini API (${modelName}) failed, trying next:`, geminiErr.message);
        }
      }
    }

    // Section-aware smart draft generator
    const title = sectionTitle || 'Proposal Section';
    const lower = title.toLowerCase();
    let text = '';

    if (action === 'generate') {
      if (lower.includes('title')) {
        text = `## ${title}\n\n**Proposed Project Title:**\nDevelopment of Next-Generation ${grantTitle || 'Quantum-AI Hybrid Architecture'} for Multi-Disciplinary Applications in ${grantAgency || 'National Research Domains'}\n\n**Short Acronym:**\nNEXT-GRANT-2026`;
      } else if (lower.includes('summary') || lower.includes('abstract')) {
        text = `## ${title}\n\n### 1. Project Background & Rationale\nThis project addresses critical technical gaps in "${grantTitle || 'the research domain'}" by implementing state-of-the-art methodology aligned with ${grantAgency || 'funding agency'} guidelines.\n\n### 2. Primary Objectives\n- **Objective 1**: Formulate novel theoretical framework and computational models.\n- **Objective 2**: Prototype and benchmark high-throughput experimental systems.\n- **Objective 3**: Disseminate open-access datasets and institutional knowledge.\n\n### 3. Expected Outcomes & Impact\nAchieve 40%+ performance optimization with scalable deployment across academic and industrial partner networks.`;
      } else if (lower.includes('budget') && !lower.includes('justification')) {
        text = `## ${title}\n\n| Budget Head | Item / Personnel Description | Year 1 (₹) | Year 2 (₹) | Total (₹) |\n| :--- | :--- | :--- | :--- | :--- |\n| **A. Equipment** | High-Performance Compute Node | 8,00,000 | 2,00,000 | 10,00,000 |\n| **B. Personnel** | Senior Research Fellow (SRF) | 4,20,000 | 4,20,000 | 8,40,000 |\n| **C. Consumables** | Lab Reagents & Cloud Credits | 1,50,000 | 1,50,000 | 3,00,000 |\n| **D. Travel** | National & Intl. Conferences | 1,00,000 | 1,00,000 | 2,00,000 |\n| **E. Overhead** | Institutional Contingency | 80,000 | 80,000 | 1,60,000 |\n| **TOTAL** | | **15,50,000** | **9,50,000** | **25,00,000** |`;
      } else if (lower.includes('timeline') || lower.includes('milestone')) {
        text = `## ${title}\n\n| Phase | Target Month | Work Package / Deliverable | Responsible Lead | Milestone Status |\n| :--- | :--- | :--- | :--- | :--- |\n| **Phase I** | Months 1–4 | Literature Review & Requirement Spec | Senior Researcher | Milestone 1 |\n| **Phase II** | Months 5–12 | Core System Architecture & Prototype | Principal Investigator | Milestone 2 |\n| **Phase III** | Months 13–18 | Experimental Testing & Optimization | Senior Researcher | Milestone 3 |\n| **Phase IV** | Months 19–24 | Final Reporting & Open Source Release | Compliance Manager | Milestone 4 |`;
      } else if (lower.includes('risk')) {
        text = `## ${title}\n\n| Risk Category | Potential Risk Description | Severity | Mitigation Strategy |\n| :--- | :--- | :--- | :--- |\n| **Technical** | Model convergence delays or hardware constraints | Medium | Implement fallback algorithm checkpoints and multi-GPU cluster |\n| **Operational** | Personnel turnover or procurement lag | Low | Cross-train team members and initiate vendor bidding in Month 1 |\n| **Compliance** | Ethics / Data privacy clearance delay | Medium | Submit institutional IRB review documents prior to Phase I |`;
      } else if (lower.includes('aim') || lower.includes('objective')) {
        text = `## ${title}\n\n### Overall Aim:\nTo design, implement, and validate an advanced framework for "${grantTitle || 'the research initiative'}" that significantly advances state-of-the-art performance.\n\n### Specific Objectives:\n1. **Objective 1 (SMART)**: Formulate baseline theoretical constraints within first 6 months.\n2. **Objective 2 (SMART)**: Build scalable experimental hardware/software testbed.\n3. **Objective 3 (SMART)**: Validate benchmarks with 95%+ statistical significance against standard datasets.`;
      } else {
        text = `## ${title}\n\n### 1. Overview & Context\nThis section addresses key technical aspects of "${title}" for "${grantTitle || 'the research project'}" as specified by ${grantAgency || 'the funding agency'}.\n\n### 2. Methodological Approach\n- **State of the Art**: Review existing approaches and baseline metrics.\n- **Core Contribution**: Detail scientific novelty, methodology, and resource utilization.\n- **Quality Control**: Define validation criteria and periodic evaluation benchmarks.\n\n### 3. Implementation Deliverables\n${prompt ? `*Custom Focus:* ${prompt}\n\n` : ''}Phase-wise implementation plan with assigned personnel responsibilities to ensure quality delivery.`;
      }
    } else if (action === 'improve') {
      text = (currentContent || '') + `\n\n### Enhanced Academic Justification\nFurthermore, the proposed methodology incorporates rigorous statistical verification and robust compliance protocols to align with ${grantAgency || 'funding agency'} guidelines and international research standards.`;
    } else if (action === 'summarize') {
      text = `**Executive Summary Highlights for ${title}:**\n- **Core Focus**: Aligned with ${grantAgency || 'funding agency'} objectives\n- **Methodology**: Phase-wise structured implementation\n- **Key Outcomes**: Measurable technical deliverables with defined milestones\n- **Compliance**: Adheres to institutional ethics and safety standards`;
    } else {
      text = `### Compliance Review Notes for ${title}:\n1. Ensure explicit mention of institutional clearances and IRB ethics approvals.\n2. Add quantifiable budget/resource metrics with calculation basis.\n3. Verify adherence to the word limit and citation formatting requirements.\n4. Include risk mitigation strategies for identified technical challenges.`;
    }

    res.json({ success: true, text });
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

    res.json({
      success: true,
      message: `Section "${section.title}" assigned to ${assignedToName || 'unassigned'}`,
      proposal: proposal.toObject(),
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

    res.json({
      success: true,
      message: `${assignments.length} sections assigned successfully`,
      proposal: proposal.toObject(),
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

