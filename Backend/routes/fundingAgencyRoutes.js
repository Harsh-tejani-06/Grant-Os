const express = require('express');
const { body } = require('express-validator');
const {
  registerFundingAgency,
  getAgencyStatus,
  publishGrantCall,
  getMyGrantCalls,
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

// ─── Grant Call Routes ───

// POST /api/agency/grants — Publish a new grant call
router.post(
  '/grants',
  protect,
  requireRole('funding_agency'),
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Grant title is required')
      .isLength({ max: 300 })
      .withMessage('Title must be at most 300 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must be at most 2000 characters'),
    body('grantType')
      .optional()
      .isIn([
        'research_grant', 'fellowship', 'startup_funding', 'institutional_infra',
        'facility_access', 'science_communication', 'academic_programme', 'scholarship',
        'faculty_training', 'student_competition_travel', 'institutional_recognition',
        'general_scheme', 'travel_grant', 'other',
      ])
      .withMessage('Invalid grant type'),
    body('deadline')
      .notEmpty()
      .withMessage('Application deadline is required')
      .isISO8601()
      .withMessage('Deadline must be a valid date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Deadline must be a future date');
        }
        return true;
      }),
    body('infoUrl')
      .trim()
      .notEmpty()
      .withMessage('Info/Source URL is required')
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Info URL must be a valid http(s) URL'),
    body('applicationUrl')
      .optional({ values: 'falsy' })
      .trim()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Application URL must be a valid http(s) URL'),
    body('guidelinesUrl')
      .optional({ values: 'falsy' })
      .trim()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Guidelines URL must be a valid http(s) URL'),
  ],
  publishGrantCall
);

// GET /api/agency/grants — Get all grant calls by this agency
router.get('/grants', protect, requireRole('funding_agency'), getMyGrantCalls);

module.exports = router;

