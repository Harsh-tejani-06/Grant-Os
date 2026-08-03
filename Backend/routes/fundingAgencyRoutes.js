const express = require('express');
const { body } = require('express-validator');
const {
  registerFundingAgency,
  getAgencyStatus,
} = require('../controllers/fundingAgencyController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/agency/register
router.post(
  '/register',
  protect,
  requireRole('funding_agency'),
  [
    body('agencyName')
      .trim()
      .notEmpty()
      .withMessage('Agency name is required'),
    body('agencyType')
      .isIn([
        'government_central',
        'government_state',
        'corporate_csr',
        'private_foundation',
        'international_agency',
      ])
      .withMessage('Invalid agency type'),
    body('establishedYear')
      .isNumeric()
      .withMessage('Established year must be a number'),
    body('headquarters.street')
      .trim()
      .notEmpty()
      .withMessage('Street address is required'),
    body('headquarters.city')
      .trim()
      .notEmpty()
      .withMessage('City is required'),
    body('headquarters.state')
      .trim()
      .notEmpty()
      .withMessage('State is required'),
    body('headquarters.pincode')
      .trim()
      .notEmpty()
      .withMessage('Pincode is required'),
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
  registerFundingAgency
);

// GET /api/agency/status
router.get('/status', protect, requireRole('funding_agency'), getAgencyStatus);

module.exports = router;
