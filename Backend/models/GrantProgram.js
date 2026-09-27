const mongoose = require('mongoose');

const grantProgramSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Grant program title is required'],
      trim: true,
    },
    shortTitle: {
      type: String, // Program code, e.g. "IRF-ETG-2026"
      trim: true,
      default: '',
    },
    category: {
      // Not required at the schema level — a Draft can exist without a
      // category. Full validation is enforced at publish time instead
      // (see publishGrantProgram).
      type: String,
      enum: [
        'Science & Technology',
        'Healthcare & Medicine',
        'Environmental Sciences',
        'Social Sciences',
        'Agriculture & Rural',
        'Technology & Computing',
        'Medical Science',
        'Agriculture',
      ],
      default: null,
    },
    fundingType: {
      type: String,
      enum: [
        'Research & Commercialization',
        'Institutional Fellowship',
        'Project Grant',
        'Pre-Seed Grant',
      ],
      default: 'Project Grant',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },

    // ─── Financials ───
    budget: {
      // Not required at the schema level — see note on `category` above.
      type: String, // display string e.g. "₹10,00,000–₹50,00,000"
      default: '',
    },
    budgetAmount: {
      type: Number, // raw numeric value, for sorting/filtering
      default: 0,
    },

    // ─── Timeline ───
    startDate: {
      type: Date,
      default: null,
    },
    deadline: {
      // Not required at the schema level — see note on `category` above.
      type: Date,
      default: null,
    },
    projectDurationMonths: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },

    // ─── Status (lifecycle) ───
    status: {
      type: String,
      enum: ['Draft', 'Upcoming', 'Active', 'Closed', 'Under Review', 'Completed', 'Archived'],
      default: 'Draft',
    },

    // ─── Source (agency-created vs future external/scraped) ───
    source: {
      type: String,
      enum: ['AGENCY_CREATED', 'EXTERNAL'],
      default: 'AGENCY_CREATED',
    },

    // ─── Eligibility ───
    eligibility: {
      applicantTypes: {
        type: [String],
        enum: [
          'university',
          'college',
          'research_institution',
          'ngo',
          'startup',
          'government_organization',
          'private_company',
          'individual',
          'faculty_member',
          'student',
          'research_scholar',
          'hospital_medical_institution',
        ],
        default: [],
      },
      geographicScope: {
        type: String,
        enum: ['Local', 'State', 'National', 'International', ''],
        default: '',
      },
      eligibleStates: {
        type: [String],
        default: [],
      },
      minOrganizationAge: {
        type: Number,
        default: null,
      },
    },
    // Freeform eligibility criteria / rules / guidelines — supplements the
    // structured `eligibility` fields above, doesn't replace them.
    eligibilityRulesText: {
      type: String,
      default: '',
    },

    // ─── Grant detail fields ───
    researchAreas: {
      type: [String],
      default: [],
    },
    projectRequirements: {
      type: String,
      default: '',
    },
    allowableExpenses: {
      type: String,
      default: '',
    },
    nonAllowableExpenses: {
      type: String,
      default: '',
    },
    budgetRules: {
      type: String,
      default: '',
    },
    proposalRequirements: {
      type: String,
      default: '',
    },
    // NOTE: `requiredDocuments` was intentionally removed per spec.
    applicationProcess: {
      type: String,
      default: '',
    },
    contactInformation: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },

    // ─── Grant-specific PDF document (guidelines, etc.) ───
    document: {
      fileName: { type: String, default: '' },
      fileUrl: { type: String, default: '' },
      documentType: { type: String, default: 'Guidelines' },
      uploadedAt: { type: Date, default: null },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    // ─── Evaluation criteria (must total 100 before publish, not before draft save) ───
    evaluationCriteria: {
      type: [
        {
          label: { type: String, required: true },
          weight: { type: Number, required: true },
        },
      ],
      default: [],
    },

    // ─── Ownership ───
    fundingAgency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FundingAgency',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ─── Lifecycle / audit trail — always derived from the authenticated
    //      user on the backend, never trusted from the request body ───
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ─── Soft delete — preserves the record (and any linked proposals)
    //      instead of a hard delete when history exists ───
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Human-readable program ID, e.g. GP-2026-01 (kept for display; _id remains the real key)
grantProgramSchema.virtual('displayId').get(function () {
  const year = this.createdAt ? this.createdAt.getFullYear() : new Date().getFullYear();
  return `GP-${year}-${this._id.toString().slice(-4).toUpperCase()}`;
});

grantProgramSchema.set('toJSON', { virtuals: true });
grantProgramSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GrantProgram', grantProgramSchema);