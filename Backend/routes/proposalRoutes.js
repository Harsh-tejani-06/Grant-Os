const express = require('express');

const {
  // Team Member / Common Routes
  getMyAssignedProposals,
  updateSection,
  addSectionComment,
  addProposalComment,
  aiAssist,

  // Proposal Creation / Organization
  createProposal,
  getOrgProposals,

  // Section Management
  addSection,
  deleteSection,
  assignSection,
  bulkAssignSections,
  approveAllSections,

  // Proposal Submission / Tracking
  submitProposal,
  submitToAdmin,
  updatePreSubmissionChecklist,
  submitToAgency,
  updateProposalTrackingStatus,

  // Proposal Management
  deleteProposal,

  // Grant / Organization Routes
  getOpenGrantPrograms,
  checkEligibility,
  getScrapedGrants,
  getMyOrganization,
} = require('../controllers/proposalController');

const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();


// ============================================================
// TEAM MEMBER / COMMON ROUTES
// ============================================================

// GET /api/proposals/my-assigned
// Get proposals & sections assigned to logged-in user
router.get(
  '/my-assigned',
  protect,
  getMyAssignedProposals
);


// PUT /api/proposals/:proposalId/sections/:sectionId
// Update section content/status
router.put(
  '/:proposalId/sections/:sectionId',
  protect,
  updateSection
);


// POST /api/proposals/:proposalId/comments
// Add proposal team comment
router.post(
  '/:proposalId/comments',
  protect,
  addProposalComment
);


// POST /api/proposals/:proposalId/sections/:sectionId/comments
// Add comment to a specific section
router.post(
  '/:proposalId/sections/:sectionId/comments',
  protect,
  addSectionComment
);


// POST /api/proposals/ai-assist
// Gemini AI assistance
router.post(
  '/ai-assist',
  protect,
  aiAssist
);


// ============================================================
// GRANT / ORGANIZATION ROUTES
// ============================================================

// GET /api/proposals/open-grants
// Browse all active grant calls from approved agencies
router.get(
  '/open-grants',
  protect,
  getOpenGrantPrograms
);


// GET /api/proposals/scraped-grants
// Browse active scraped/government grant listings
router.get(
  '/scraped-grants',
  protect,
  getScrapedGrants
);


// GET /api/proposals/eligibility/:grantProgramId
// Check organization eligibility for a grant call
router.get(
  '/eligibility/:grantProgramId',
  protect,
  checkEligibility
);


// GET /api/proposals/my-organization
// View own organization's details
router.get(
  '/my-organization',
  protect,
  getMyOrganization
);


// ============================================================
// ORG ADMIN ROUTES
// ============================================================

// POST /api/proposals/create
// Create a new proposal with 17 sections
router.post(
  '/create',
  protect,
  requireRole('org_admin'),
  createProposal
);


// GET /api/proposals/org-proposals
// Get all proposals for the organization
router.get(
  '/org-proposals',
  protect,
  requireRole('org_admin'),
  getOrgProposals
);


// ============================================================
// PROPOSAL SUBMISSION / LIFECYCLE
// ============================================================

// PUT /api/proposals/:proposalId/submit
// Submit proposal to its linked funding agency
router.put(
  '/:proposalId/submit',
  protect,
  requireRole('org_admin'),
  submitProposal
);


// PUT /api/proposals/:proposalId/submit-admin
// PI submits final proposal to Admin
router.put(
  '/:proposalId/submit-admin',
  protect,
  submitToAdmin
);


// PUT /api/proposals/:proposalId/checklist
// Update Pre-Submission Checklist
router.put(
  '/:proposalId/checklist',
  protect,
  requireRole('org_admin'),
  updatePreSubmissionChecklist
);


// PUT /api/proposals/:proposalId/submit-agency
// Org Admin submits proposal to Funding Agency
router.put(
  '/:proposalId/submit-agency',
  protect,
  requireRole('org_admin'),
  submitToAgency
);


// PUT /api/proposals/:proposalId/tracking-status
// Update proposal lifecycle tracking status
router.put(
  '/:proposalId/tracking-status',
  protect,
  requireRole('org_admin'),
  updateProposalTrackingStatus
);


// ============================================================
// SECTION MANAGEMENT
// ============================================================

// PUT /api/proposals/:proposalId/approve-all
// Approve all proposal sections
router.put(
  '/:proposalId/approve-all',
  protect,
  approveAllSections
);


// POST /api/proposals/:proposalId/sections
// Add a dynamic/custom section
router.post(
  '/:proposalId/sections',
  protect,
  requireRole('org_admin'),
  addSection
);


// DELETE /api/proposals/:proposalId/sections/:sectionId
// Delete a dynamic/custom section
router.delete(
  '/:proposalId/sections/:sectionId',
  protect,
  requireRole('org_admin'),
  deleteSection
);


// PUT /api/proposals/:proposalId/sections/:sectionId/assign
// Assign section to an organization member
router.put(
  '/:proposalId/sections/:sectionId/assign',
  protect,
  requireRole('org_admin'),
  assignSection
);


// PUT /api/proposals/:proposalId/bulk-assign
// Bulk assign proposal sections
router.put(
  '/:proposalId/bulk-assign',
  protect,
  requireRole('org_admin'),
  bulkAssignSections
);


// ============================================================
// PROPOSAL MANAGEMENT
// ============================================================

// DELETE /api/proposals/:proposalId
// Delete proposal
router.delete(
  '/:proposalId',
  protect,
  requireRole('org_admin'),
  deleteProposal
);


module.exports = router;