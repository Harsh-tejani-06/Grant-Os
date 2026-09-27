const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['org_admin', 'team_member', 'system_admin', 'funding_agency'],
      default: 'org_admin',
    },
    jobTitle: {
      type: String,
      default: '',
      trim: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    fundingAgency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FundingAgency',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ─── Member Verification (for team_member role) ───
    isVerified: {
      type: Boolean,
      default: true, // org_admin is auto-verified; set to false on team_member creation
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },

    // ─── Assigned Tasks (for team_member role) ───
    assignedTasks: {
      type: [
        {
          type: String,
          enum: [
            'proposal_writing',
            'budget_planning',
            'research',
            'compliance',
            'reporting',
            'grant_discovery',
          ],
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);