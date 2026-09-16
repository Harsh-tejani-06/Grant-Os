const express = require('express');
const { body } = require('express-validator');
const {
  registerOrganization,
  getOrgStatus,
  discoverGrants,
} = require('../controllers/orgController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/org/register
router.post(
  '/register',
  protect,
  requireRole('org_admin'),
  [
    body('organizationName')
      .trim()
      .notEmpty()
      .withMessage('Organization name is required'),
    body('registrationNumber')
      .trim()
      .notEmpty()
      .withMessage('Registration number is required'),
    body('organizationType')
      .isIn(['university', 'college', 'research_institute', 'ngo', 'other'])
      .withMessage('Invalid organization type'),
    body('establishedYear')
      .isNumeric()
      .withMessage('Established year must be a number'),
    body('address.street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),
    body('address.city').trim().notEmpty().withMessage('City is required'),
    body('address.state').trim().notEmpty().withMessage('State is required'),
    body('address.pincode').trim().notEmpty().withMessage('Pincode is required'),
    body('contactPerson.name')
      .trim()
      .notEmpty()
      .withMessage('Contact person name is required'),
    body('contactPerson.email')
      .isEmail()
      .withMessage('Valid contact email is required'),
    body('contactPerson.phone')
      .trim()
      .notEmpty()
      .withMessage('Contact phone is required'),
  ],
  registerOrganization
);

// GET /api/org/status
router.get('/status', protect, requireRole('org_admin'), getOrgStatus);

// GET /api/org/grants/discover
router.get(
  '/grants/discover',
  protect,
  requireRole('org_admin', 'team_member'),
  discoverGrants
);

module.exports = router;
