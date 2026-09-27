const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    proposal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proposal',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
    },
    targetDate: {
      type: Date,
      required: [true, 'Target reminder date is required'],
    },
    reminderType: {
      type: String,
      enum: ['call_deadline', 'internal_review', 'ethical_clearance', 'agency_followup', 'budget_audit', 'custom'],
      default: 'custom',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    recipientRole: {
      type: String,
      default: 'all',
    },
    recipientName: {
      type: String,
      default: '',
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);
module.exports =mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
