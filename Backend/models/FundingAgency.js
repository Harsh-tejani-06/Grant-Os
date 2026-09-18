const mongoose = require('mongoose');

const fundingAgencySchema = new mongoose.Schema(
  {
    // ─── 🟢 Public: Agency Identity ───
    agencyName: {
      type: String,
      required: [true, 'Agency name is required'],
      trim: true,
    },
    shortName: {
      type: String,
      trim: true,
      default: '',
    },
    agencyType: {
      type: String,
      required: [true, 'Agency type is required'],
      enum: [
        'government_central',
        'government_state',
        'private_foundation',
        'international_agency',
      ],
    },
    organizationType: {
      type: String,
      trim: true,
      default: '', // e.g. "Private Limited Company"
    },
    ownershipType: {
      type: String,
      trim: true,
      default: '', // e.g. "Privately Held"
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    establishedYear: {
      type: Number,
      required: [true, 'Established year is required'],
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    mission: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    vision: {
      type: String,
      default: '',
      maxlength: 1000,
    },

    // ─── 🟢 Public: Headquarters Address ───
    headquarters: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      country: { type: String, default: 'India', trim: true },
    },

    // ─── 🟢 Public: Legal Verification IDs ───
    cin: {
      type: String,
      trim: true,
      default: '',
    },
    darpanId: {
      type: String,
      trim: true,
      default: '',
    },
    csrRegistrationNumber: {
      type: String,
      trim: true,
      default: '',
    },

    // ─── 🟢 Public: Funding Profile ───
    grantTypesOffered: {
      type: [
        {
          type: String,
          enum: [
            'research_grant',
            'fellowship',
            'travel_grant',
            'startup_seed',
            'institutional_infra',
          ],
        },
      ],
      default: [],
    },
    fundingAmountMin: {
      type: Number,
      default: null,
    },
    fundingAmountMax: {
      type: Number,
      default: null,
    },
    fundingDurationMonths: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
    fundingFrequency: {
      type: String,
      enum: ['Annual', 'Biannual', 'Quarterly', 'Rolling', ''],
      default: '',
    },
    eligibleApplicantTypes: {
      type: [String],
      enum: [
        'universities',
        'research_institutions',
        'ngos',
        'startups',
        'government_organizations',
        'individuals',
        'private_companies',
      ],
      default: [],
    },
    fundingScope: {
      type: String,
      enum: ['Local', 'State', 'National', 'International', ''],
      default: '',
    },
    fundingStates: {
      type: [String],
      default: [],
    },

    // ─── 🟡 Semi-Sensitive: Contact Person (admin-only) ───
    contactPerson: {
      name: { type: String, required: true, trim: true },
      designation: { type: String, trim: true, default: '' },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },

    // ─── 🟡 Semi-Sensitive: Registration Document Uploads (admin-only) ───
    authorizationLetterUrl: {
      type: String,
      default: '',
    },
    registrationCertificateUrl: {
      type: String,
      default: '',
    },

    // ─── Approval Status ───
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ─── Owner ───
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Computes which profile sections are meaningfully filled in, for the
// Profile page's completion tracker. Never a hardcoded/arbitrary number.
fundingAgencySchema.virtual('profileCompletion').get(function () {
  const sections = {
    identity: Boolean(this.agencyName && this.agencyType && this.establishedYear),
    about: Boolean(this.description && this.description.trim().length > 0),
    operationalDetails: Boolean(
      this.website || (this.headquarters && this.headquarters.city && this.headquarters.state)
    ),
    fundingProfile: Boolean(
      (this.grantTypesOffered && this.grantTypesOffered.length > 0) ||
        this.fundingAmountMin ||
        this.fundingAmountMax
    ),
    contactPerson: Boolean(
      this.contactPerson &&
        this.contactPerson.name &&
        this.contactPerson.email &&
        (this.contactPerson.designation || this.contactPerson.phone)
    ),
    legalVerification: Boolean(this.cin || this.darpanId),
  };

  const total = Object.keys(sections).length;
  const done = Object.values(sections).filter(Boolean).length;

  return {
    percent: Math.round((done / total) * 100),
    sections,
  };
});

fundingAgencySchema.set('toJSON', { virtuals: true });
fundingAgencySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FundingAgency', fundingAgencySchema);