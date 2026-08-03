const express = require('express');
const { body } = require('express-validator');
const {
  registerMember,
  getMembers,
  verifyMember,
  rejectMember,
  assignTask,
} = require('../controllers/memberController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/member/register (Public — org validation happens inside)
router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('organizationName')
      .trim()
      .notEmpty()
      .withMessage('Organization name is required'),
  ],
  registerMember
);

// GET /api/member/list — org_admin only
router.get('/list', protect, requireRole('org_admin'), getMembers);

// PUT /api/member/:id/verify — org_admin only
router.put('/:id/verify', protect, requireRole('org_admin'), verifyMember);

// DELETE /api/member/:id/reject — org_admin only
router.delete('/:id/reject', protect, requireRole('org_admin'), rejectMember);

// PUT /api/member/:id/assign-task — org_admin only
router.put('/:id/assign-task', protect, requireRole('org_admin'), assignTask);

module.exports = router;
