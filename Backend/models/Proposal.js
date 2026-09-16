const mongoose = require('mongoose');

// ─── Comment Sub-Schema ───
const commentSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  senderName: {
    type: String,
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['org_admin', 'team_member', 'system_admin', 'funding_agency'],
    default: 'team_member',
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ─── Proposal Section Sub-Schema (17 sections) ───
const sectionSchema = new mongoose.Schema({
  sectionKey: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  assignedToName: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Ready for Review', 'Approved'],
    default: 'Not Started',
  },
  content: {
    type: String,
    default: '',
  },
  starterGuide: {
    type: String,
    default: '',
  },
  wordCountLimit: {
    type: Number,
    default: 500,
  },
  comments: [commentSchema],
  lastEditedAt: {
    type: Date,
    default: Date.now,
  },
});

// ─── Main Proposal Schema ───
const proposalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Proposal title is required'],
      trim: true,
    },
    grantTitle: {
      type: String,
      default: '',
    },
    grantAgency: {
      type: String,
      default: '',
    },
    fundingAmount: {
      type: String,
      default: '',
    },
    deadline: {
      type: String,
      default: '',
    },
    grantListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GrantListing',
      default: null,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    status: {
      type: String,
      enum: ['Draft', 'In Progress', 'Under Review', 'Submitted', 'Accepted', 'Rejected'],
      default: 'In Progress',
    },
    progress: {
      type: Number,
      default: 0,
    },
    comments: [commentSchema],
    sections: [sectionSchema],
  },
  {
    timestamps: true,
  }
);

// ─── Default 17-Section Template Generator ───
proposalSchema.statics.getDefaultSections = function () {
  return [
    {
      sectionKey: 'sec_1',
      title: '1. Project Title',
      starterGuide:
        '• Provide a precise, descriptive title.\n• Keep under 20 words.\n• Include key methodology and core domain.',
      wordCountLimit: 50,
    },
    {
      sectionKey: 'sec_2',
      title: '2. Executive Summary or Abstract',
      starterGuide:
        '• The problem\n• The project aim\n• The approach\n• The applicant or team\n• The requested support\n• The expected result',
      wordCountLimit: 500,
    },
    {
      sectionKey: 'sec_3',
      title: '3. Applicant or Organization',
      starterGuide:
        '• Applicant name\n• Institution or organization\n• Relevant mission\n• Qualifications\n• Previous related work\n• Facilities and support',
      wordCountLimit: 400,
    },
    {
      sectionKey: 'sec_4',
      title: '4. Problem, Need, or Research Gap',
      starterGuide:
        '• What is the current situation?\n• What is missing?\n• Who is affected?\n• What evidence demonstrates the need?\n• Why is action timely?',
      wordCountLimit: 800,
    },
    {
      sectionKey: 'sec_5',
      title: '5. Background and Context',
      starterGuide:
        '• Existing evidence\n• Previous initiatives\n• Limitations of existing approaches\n• Proposed contribution',
      wordCountLimit: 1000,
    },
    {
      sectionKey: 'sec_6',
      title: '6. Aim and Objectives',
      starterGuide:
        '• Aim: State the overall intended achievement.\n• Objectives:\n  - Specific objective 1\n  - Specific objective 2\n  - Specific objective 3',
      wordCountLimit: 600,
    },
    {
      sectionKey: 'sec_7',
      title: '7. Methods or Activities',
      starterGuide:
        '• Activity\n• Population or data\n• Procedure\n• Responsible person\n• Quality controls\n• Analysis or evaluation\n• Relevant ethics',
      wordCountLimit: 1500,
    },
    {
      sectionKey: 'sec_8',
      title: '8. Timeline and Milestones',
      starterGuide:
        '• Period | Activity | Responsibility | Milestone\n• Break project into phases with clear deliverables.',
      wordCountLimit: 500,
    },
    {
      sectionKey: 'sec_9',
      title: '9. Outputs, Outcomes, and Impact',
      starterGuide:
        '• Immediate outputs\n• Short-term outcomes\n• Potential longer-term impact\n• Intended beneficiaries\n• Dissemination or knowledge-exchange activities',
      wordCountLimit: 600,
    },
    {
      sectionKey: 'sec_10',
      title: '10. Evaluation',
      starterGuide:
        '• Objective | Indicator | Data source | Timing | Success criterion\n• Define measurable success metrics for each objective.',
      wordCountLimit: 500,
    },
    {
      sectionKey: 'sec_11',
      title: '11. Team and Management',
      starterGuide:
        '• Team roles\n• Expertise\n• Governance\n• Partnerships\n• Reporting arrangements',
      wordCountLimit: 500,
    },
    {
      sectionKey: 'sec_12',
      title: '12. Risks',
      starterGuide:
        '• Risk | Likelihood | Effect | Mitigation\n• Cover technical, financial, and operational risks.',
      wordCountLimit: 500,
    },
    {
      sectionKey: 'sec_13',
      title: '13. Ethics and Data Management',
      starterGuide:
        '• Approvals, consent, privacy\n• Storage, access, security\n• Retention, sharing\n• Safeguarding and integrity issues',
      wordCountLimit: 600,
    },
    {
      sectionKey: 'sec_14',
      title: '14. Budget',
      starterGuide:
        '• Cost | Calculation | Amount | Related activity\n• Cover Equipment, Personnel, Travel, Consumables, Contingency.',
      wordCountLimit: 600,
    },
    {
      sectionKey: 'sec_15',
      title: '15. Budget Justification',
      starterGuide:
        '• Explain why each cost is:\n  - Necessary\n  - Reasonable\n  - Allowable\n  - Proportionate',
      wordCountLimit: 800,
    },
    {
      sectionKey: 'sec_16',
      title: '16. Sustainability or Next Steps',
      starterGuide:
        '• What will happen after the award?\n• Continuity plan for project, service, partnership, dataset, or research programme.',
      wordCountLimit: 400,
    },
    {
      sectionKey: 'sec_17',
      title: '17. References and Attachments',
      starterGuide:
        '• Use the required citation style (IEEE, APA, etc.)\n• Include only permitted appendices.',
      wordCountLimit: 800,
    },
  ];
};

module.exports = mongoose.model('Proposal', proposalSchema);
