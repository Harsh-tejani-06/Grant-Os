const express = require('express');
const {
  getAllOrganizations,
  getOrganizationById,
  approveOrganization,
  rejectOrganization,
  getAllAgencies,
  getAgencyById,
  approveAgency,
  rejectAgency,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require system_admin role
router.use(protect, requireRole('system_admin'));

// ─── Organization Routes ───
router.get('/organizations', getAllOrganizations);
router.get('/organizations/:id', getOrganizationById);
router.put('/organizations/:id/approve', approveOrganization);
router.put('/organizations/:id/reject', rejectOrganization);

// ─── Funding Agency Routes ───
router.get('/agencies', getAllAgencies);
router.get('/agencies/:id', getAgencyById);
router.put('/agencies/:id/approve', approveAgency);
router.put('/agencies/:id/reject', rejectAgency);

module.exports = router;
