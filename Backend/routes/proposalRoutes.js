const express = require('express');
const {
  getMyAssignedProposals,
  updateSection,
  addSection,
  deleteSection,
  addSectionComment,
  addProposalComment,
  aiAssist,
  createProposal,
  submitProposal,
  getOrgProposals,
  assignSection,
  bulkAssignSections,
  approveAllSections,
  deleteProposal,
  getOpenGrantPrograms,
  checkEligibility,
  getScrapedGrants,
  getMyOrganization,
} = require('../controllers/proposalController');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// ─── Team Member Routes ───
// GET /api/proposals/my-assigned — Get proposals & assigned sections for logged-in user
router.get('/my-assigned', protect, getMyAssignedProposals);

// PUT /api/proposals/:proposalId/sections/:sectionId — Update section content/status
router.put('/:proposalId/sections/:sectionId', protect, updateSection);

// POST /api/proposals/:proposalId/comments — Add proposal team comment
router.post('/:proposalId/comments', protect, addProposalComment);

// POST /api/proposals/:proposalId/sections/:sectionId/comments — Add comment
router.post('/:proposalId/sections/:sectionId/comments', protect, addSectionComment);

// POST /api/proposals/ai-assist — Gemini AI assistance
router.post('/ai-assist', protect, aiAssist);

// GET /api/proposals/open-grants — Browse all active grant calls from approved agencies
router.get('/open-grants', protect, getOpenGrantPrograms);

// GET /api/proposals/scraped-grants — Browse active scraped/government grant listings
router.get('/scraped-grants', protect, getScrapedGrants);

// GET /api/proposals/eligibility/:grantProgramId — Check org eligibility for a grant call
router.get('/eligibility/:grantProgramId', protect, checkEligibility);

// GET /api/proposals/my-organization — view own organization's details (any authenticated org member)
router.get('/my-organization', protect, getMyOrganization);

// ─── Org Admin Routes ───
// POST /api/proposals/create — Create new proposal with 17 sections
router.post('/create', protect, requireRole('org_admin'), createProposal);

// PUT /api/proposals/:proposalId/submit — Submit proposal to its linked funding agency
router.put('/:proposalId/submit', protect, requireRole('org_admin'), submitProposal);

// GET /api/proposals/org-proposals — Get all proposals for the org
router.get('/org-proposals', protect, requireRole('org_admin'), getOrgProposals);

// PUT /api/proposals/:proposalId/approve-all — Approve all sections (internal check)
router.put('/:proposalId/approve-all', protect, requireRole('org_admin'), approveAllSections);

// POST /api/proposals/:proposalId/sections — Add a dynamic (custom) section
router.post('/:proposalId/sections', protect, requireRole('org_admin'), addSection);

// DELETE /api/proposals/:proposalId/sections/:sectionId — Remove a section
router.delete('/:proposalId/sections/:sectionId', protect, requireRole('org_admin'), deleteSection);

// PUT /api/proposals/:proposalId/sections/:sectionId/assign — Assign section to member
router.put('/:proposalId/sections/:sectionId/assign', protect, requireRole('org_admin'), assignSection);

// PUT /api/proposals/:proposalId/bulk-assign — Bulk assign sections
router.put('/:proposalId/bulk-assign', protect, requireRole('org_admin'), bulkAssignSections);

// DELETE /api/proposals/:proposalId — Delete proposal
router.delete('/:proposalId', protect, requireRole('org_admin'), deleteProposal);

module.exports = router;