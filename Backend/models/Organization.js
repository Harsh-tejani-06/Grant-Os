const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    // ─── Basic Info ───
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
    },
    organizationType: {
      type: String,
      required: [true, 'Organization type is required'],
      enum: ['university', 'college', 'research_institute', 'ngo', 'other'],
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

    // ─── Address ───
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      country: { type: String, default: 'India', trim: true },
    },

    // ─── Contact Person ───
    contactPerson: {
      name: { type: String, required: true, trim: true },
      designation: { type: String, trim: true, default: '' },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },

    // ─── Academic Profile ───
    naacAccreditation: {
      type: String,
      enum: ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'N/A'],
      default: 'N/A',
    },
    ugcRecognition: {
      type: Boolean,
      default: false,
    },
    focusAreas: {
      type: [String],
      default: [],
    },
    grantCategories: {
      type: [
        {
          type: String,
          enum: ['research_grant', 'fellowship', 'institutional_infra'],
        },
      ],
      default: [],
    },
    totalFaculty: {
      type: Number,
      default: 0,
    },
    totalPhDScholars: {
      type: Number,
      default: 0,
    },

    // ─── Embedding (Grant Discovery) ───
    embedding: { type: [Number], default: [] },
    embeddingContentHash: { type: String, default: null },

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

module.exports = mongoose.model('Organization', organizationSchema);
