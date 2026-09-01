/**
 * routes/grantAdminRoutes.js
 *
 * Admin routes for reviewing and managing scraped grants.
 * Protected by JWT auth + system_admin role.
 */

const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const {
  getGrantsForReview,
  getAllGrants,
  getGrantById,
  approveGrant,
  editGrant,
} = require('../controllers/grantAdminController');

const router = express.Router();

// All routes require system_admin
router.use(protect);
router.use(requireRole('system_admin'));

// GET /api/admin/grants/review — grants needing review
router.get('/review', getGrantsForReview);

// GET /api/admin/grants — all grants with filters
router.get('/', getAllGrants);

// GET /api/admin/grants/:id — single grant detail
router.get('/:id', getGrantById);

// PUT /api/admin/grants/:id/approve — mark as reviewed
router.put('/:id/approve', approveGrant);

// PUT /api/admin/grants/:id/edit — admin edit
router.put('/:id/edit', editGrant);

module.exports = router;
