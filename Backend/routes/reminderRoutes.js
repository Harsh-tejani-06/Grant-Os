const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getReminders,
  createReminder,
  toggleReminder,
  deleteReminder,
  sendManualDeadlineAlertEmail,
} = require('../controllers/reminderController');

// All reminder endpoints require authentication
router.use(protect);

router.route('/')
  .get(getReminders)
  .post(createReminder);

router.put('/:id/toggle', toggleReminder);
router.delete('/:id', deleteReminder);
router.post('/proposals/:proposalId/send-email-alert', sendManualDeadlineAlertEmail);

module.exports = router;
