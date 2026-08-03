const mongoose = require('mongoose');

const fundingAgencySchema = new mongoose.Schema(
  {
    // ─── 🟢 Public: Agency Identity ───
    agencyName: {
      type: String,
      required: [true, 'Agency name is required'],
      trim: true,
    },
    agencyType: {
      type: String,
      required: [true, 'Agency type is required'],
      enum: [
        'government_central',
        'government_state',
        'corporate_csr',
        'private_foundation',
        'international_agency',
      ],
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
    fundingDomains: {
      type: [String],
      default: [],
    },
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

    // ─── 🟡 Semi-Sensitive: Contact Person (admin-only) ───
    contactPerson: {
      name: { type: String, required: true, trim: true },
      designation: { type: String, trim: true, default: '' },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },

    // ─── 🟡 Semi-Sensitive: Document Uploads (admin-only) ───
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

module.exports = mongoose.model('FundingAgency', fundingAgencySchema);
