const express = require('express');
const { body } = require('express-validator');
const {
  registerFundingAgency,
  getAgencyStatus,
  createGrantProgram,
  publishGrantProgram,
  getMyGrantPrograms,
  updateGrantProgram,
  uploadGrantDocument,
  deleteGrantProgram,
  getAgencyProposals,
  getAgencyProposalDetail,
  updateProposalDecision,
  getAgencyStats,
  updateLegalVerification,
  getFullProfile,
  updateProfile,
} = require('../controllers/fundingAgencyController');
const { protect, requireRole } = require('../middleware/auth');
const { uploadGrantDoc } = require('../middleware/uploadGrantDocument');

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

// GET /api/agency/stats
router.get('/stats', protect, requireRole('funding_agency'), getAgencyStats);

// ─── Grant Programs (Grant Calls) ───

// POST /api/agency/programs — create as Draft (minimal validation: title only;
// full validation happens at publish time, see PUT /programs/:id/publish)
router.post(
  '/programs',
  protect,
  requireRole('funding_agency'),
  [body('title').trim().notEmpty().withMessage('Grant title is required')],
  createGrantProgram
);

// GET /api/agency/programs
router.get('/programs', protect, requireRole('funding_agency'), getMyGrantPrograms);

// PUT /api/agency/programs/:id — used every time a draft is re-saved
router.put('/programs/:id', protect, requireRole('funding_agency'), updateGrantProgram);

// PUT /api/agency/programs/:id/publish — validates and flips Draft/Upcoming -> Active
router.put('/programs/:id/publish', protect, requireRole('funding_agency'), publishGrantProgram);

// POST /api/agency/programs/:id/document — upload/replace the grant-specific PDF
router.post(
  '/programs/:id/document',
  protect,
  requireRole('funding_agency'),
  (req, res, next) => {
    uploadGrantDoc.single('document')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message:
            err.code === 'LIMIT_FILE_SIZE'
              ? 'File exceeds the 10 MB size limit'
              : err.message || 'File upload failed',
        });
      }
      next();
    });
  },
  uploadGrantDocument
);

// DELETE /api/agency/programs/:id — two-step confirmation happens on the
// frontend; this endpoint performs the actual (safe) delete once confirmed
router.delete('/programs/:id', protect, requireRole('funding_agency'), deleteGrantProgram);

// ─── Proposals submitted to this agency ───

// GET /api/agency/proposals
router.get('/proposals', protect, requireRole('funding_agency'), getAgencyProposals);

// GET /api/agency/proposals/:id
router.get('/proposals/:id', protect, requireRole('funding_agency'), getAgencyProposalDetail);

// PUT /api/agency/proposals/:id/decision
router.put('/proposals/:id/decision', protect, requireRole('funding_agency'), updateProposalDecision);

// PUT /api/agency/legal-verification
router.put(
  '/legal-verification',
  protect,
  requireRole('funding_agency'),
  updateLegalVerification
);

// ─── Profile (identity + editable operational details) ───

// GET /api/agency/profile
router.get('/profile', protect, requireRole('funding_agency'), getFullProfile);

// PUT /api/agency/profile
router.put('/profile', protect, requireRole('funding_agency'), updateProfile);

module.exports = router;
