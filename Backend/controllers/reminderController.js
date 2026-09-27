const Reminder = require('../models/Reminder');
const Proposal = require('../models/Proposal');
const socketHelper = require('../socket');
const User = require('../models/User');

// @desc    Get all reminders for requesting user's organization
// @route   GET /api/reminders
// @access  Private (org_admin, team_member)
const getReminders = async (req, res) => {
  try {
    const orgId = req.user.organization;
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'No organization linked to account' });
    }

    const reminders = await Reminder.find({ organization: orgId })
      .populate('proposal', 'title grantAgency grantTitle status deadline agencySubmission')
      .sort({ targetDate: 1 })
      .lean();

    res.json({
      success: true,
      reminders,
    });
  } catch (error) {
    console.error('getReminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
  }
};

// @desc    Create a new scheduled reminder
// @route   POST /api/reminders
// @access  Private (org_admin, team_member)
const createReminder = async (req, res) => {
  try {
    const orgId = req.user.organization;
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'No organization linked to account' });
    }

    const { proposalId, title, targetDate, reminderType, priority, notes, recipientRole, recipientName } = req.body;

    if (!title || !targetDate) {
      return res.status(400).json({ success: false, message: 'Title and target date are required' });
    }

    let proposal = null;
    if (proposalId) {
      proposal = await Proposal.findOne({ _id: proposalId, organization: orgId });
    }

    const reminder = await Reminder.create({
      organization: orgId,
      proposal: proposal ? proposal._id : null,
      title: title.trim(),
      targetDate: new Date(targetDate),
      reminderType: reminderType || 'custom',
      priority: priority || 'medium',
      notes: notes || '',
      recipientRole: recipientRole || 'all',
      recipientName: recipientName || '',
      createdBy: req.user._id,
      createdByName: req.user.fullName || 'Admin',
    });

    const populated = await Reminder.findById(reminder._id)
      .populate('proposal', 'title grantAgency grantTitle status deadline agencySubmission')
      .lean();

    // Broadcast via Socket.io to organization room
    socketHelper.emitToOrg(orgId.toString(), 'reminderCreated', { reminder: populated });

    res.status(201).json({
      success: true,
      reminder: populated,
      message: 'Reminder scheduled successfully',
    });
  } catch (error) {
    console.error('createReminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to create reminder' });
  }
};

// @desc    Toggle completion state of a reminder
// @route   PUT /api/reminders/:id/toggle
// @access  Private (org_admin, team_member)
const toggleReminder = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { id } = req.params;

    const reminder = await Reminder.findOne({ _id: id, organization: orgId });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    reminder.isCompleted = !reminder.isCompleted;
    reminder.completedAt = reminder.isCompleted ? new Date() : null;
    await reminder.save();

    const populated = await Reminder.findById(reminder._id)
      .populate('proposal', 'title grantAgency grantTitle status deadline agencySubmission')
      .lean();

    socketHelper.emitToOrg(orgId.toString(), 'reminderUpdated', { reminder: populated });

    res.json({
      success: true,
      reminder: populated,
    });
  } catch (error) {
    console.error('toggleReminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle reminder' });
  }
};

// @desc    Delete a scheduled reminder
// @route   DELETE /api/reminders/:id
// @access  Private (org_admin, team_member)
const deleteReminder = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { id } = req.params;

    const reminder = await Reminder.findOneAndDelete({ _id: id, organization: orgId });
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    socketHelper.emitToOrg(orgId.toString(), 'reminderDeleted', { reminderId: id });

    res.json({
      success: true,
      message: 'Reminder deleted successfully',
      reminderId: id,
    });
  } catch (error) {
    console.error('deleteReminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete reminder' });
  }
};

// @desc    Manually dispatch critical deadline email to Lead PI / Team
// @route   POST /api/reminders/proposals/:proposalId/send-email-alert
// @access  Private (org_admin, team_member)
const sendManualDeadlineAlertEmail = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { proposalId } = req.params;

    let proposal = await Proposal.findById(proposalId)
      .populate('createdBy', 'fullName email')
      .populate('sections.assignedTo', 'fullName email');

    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    if (proposal.organization && orgId && proposal.organization.toString() !== orgId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to send alerts for this proposal' });
    }

    if (!proposal.deadline) {
      return res.status(400).json({ success: false, message: 'Proposal has no deadline set' });
    }

    const targetDate = new Date(proposal.deadline);
    const daysRemaining = Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const unapprovedSectionsCount = (proposal.sections || []).filter((s) => s.status !== 'Approved').length;

    // Identify recipient: Lead PI / creator / assigned member / requesting user
    let recipientEmail = proposal.createdBy?.email;
    let recipientName = proposal.createdBy?.fullName || proposal.leadPIName || 'Lead Principal Investigator';

    const firstAssignedWithEmail = (proposal.sections || []).find((s) => s.assignedTo?.email);
    if (!recipientEmail && firstAssignedWithEmail) {
      recipientEmail = firstAssignedWithEmail.assignedTo.email;
      recipientName = firstAssignedWithEmail.assignedTo.fullName || recipientName;
    }

    if (!recipientEmail) {
      recipientEmail = req.user.email;
    }

    const { sendCriticalDeadlineEmail } = require('../utils/sendEmail');
    const workspaceUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/org`;

    const sent = await sendCriticalDeadlineEmail({
      recipientEmail,
      recipientName,
      proposalTitle: proposal.title,
      grantAgency: proposal.grantAgency,
      grantTitle: proposal.grantTitle,
      deadlineDate: proposal.deadline,
      daysRemaining,
      unapprovedSectionsCount,
      workspaceUrl,
    });

    if (sent) {
      proposal.lastCriticalEmailAlertSentAt = new Date();
      await proposal.save();

      socketHelper.emitToOrg(orgId.toString(), 'deadlineAlertEmailSent', {
        proposalId: proposal._id,
        proposalTitle: proposal.title,
        recipientEmail,
        recipientName,
        sentAt: new Date(),
      });

      return res.json({
        success: true,
        message: `Critical deadline alert email dispatched to ${recipientName} (${recipientEmail})`,
        recipientEmail,
        recipientName,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Could not deliver email. Please check server email SMTP configuration.',
      });
    }
  } catch (error) {
    console.error('sendManualDeadlineAlertEmail error:', error);
    res.status(500).json({ success: false, message: 'Failed to send deadline email alert' });
  }
};

// Function to check and send automatic deadline emails for critical proposals (<= 7 days)
const runAutomatedCriticalDeadlineCheck = async () => {
  try {
    const { sendCriticalDeadlineEmail } = require('../utils/sendEmail');
    const activeProposals = await Proposal.find({
      status: { $in: ['Draft', 'In Progress', 'Under Review', 'Submitted to Admin'] },
      deadline: { $ne: '' },
    })
      .populate('createdBy', 'fullName email')
      .populate('sections.assignedTo', 'fullName email')
      .populate('organization', 'name');

    let dispatchedCount = 0;
    for (const proposal of activeProposals) {
      if (!proposal.deadline) continue;
      const target = new Date(proposal.deadline);
      if (isNaN(target.getTime())) continue;

      const daysRemaining = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      // Only trigger if critical (<= 7 days and >= 0)
      if (daysRemaining <= 7 && daysRemaining >= 0) {
        // Skip if already alerted within the past 24 hours to prevent inbox spam
        if (proposal.lastCriticalEmailAlertSentAt) {
          const hoursSinceLastAlert = (Date.now() - new Date(proposal.lastCriticalEmailAlertSentAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastAlert < 24) continue;
        }

        let recipientEmail = proposal.createdBy?.email;
        let recipientName = proposal.createdBy?.fullName || proposal.leadPIName || 'Investigator';

        const firstAssigned = (proposal.sections || []).find((s) => s.assignedTo?.email);
        if (!recipientEmail && firstAssigned) {
          recipientEmail = firstAssigned.assignedTo.email;
          recipientName = firstAssigned.assignedTo.fullName;
        }

        if (recipientEmail) {
          const unapprovedCount = (proposal.sections || []).filter((s) => s.status !== 'Approved').length;
          const sent = await sendCriticalDeadlineEmail({
            recipientEmail,
            recipientName,
            proposalTitle: proposal.title,
            grantAgency: proposal.grantAgency,
            grantTitle: proposal.grantTitle,
            deadlineDate: proposal.deadline,
            daysRemaining,
            unapprovedSectionsCount: unapprovedCount,
            workspaceUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/org`,
          });
          if (sent) {
            proposal.lastCriticalEmailAlertSentAt = new Date();
            await proposal.save();
            dispatchedCount++;
          }
        }
      }
    }
    if (dispatchedCount > 0) {
      console.log(`⏰ [CRON] Automated critical deadline email checker dispatched ${dispatchedCount} alerts.`);
    }
  } catch (err) {
    console.error('Error in runAutomatedCriticalDeadlineCheck:', err);
  }
};

module.exports = {
  getReminders,
  createReminder,
  toggleReminder,
  deleteReminder,
  sendManualDeadlineAlertEmail,
  runAutomatedCriticalDeadlineCheck,
};