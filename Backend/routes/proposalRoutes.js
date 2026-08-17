const express = require('express');
const {
  getMyAssignedProposals,
  updateSection,
  addSectionComment,
  addProposalComment,
  aiAssist,
  createProposal,
  getOrgProposals,
  assignSection,
  bulkAssignSections,
  approveAllSections,
  deleteProposal,
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

// ─── Org Admin Routes ───
// POST /api/proposals/create — Create new proposal with 17 sections
router.post('/create', protect, requireRole('org_admin'), createProposal);

// GET /api/proposals/org-proposals — Get all proposals for the org
router.get('/org-proposals', protect, requireRole('org_admin'), getOrgProposals);

// PUT /api/proposals/:proposalId/approve-all — Approve all 17 sections
router.put('/:proposalId/approve-all', protect, requireRole('org_admin'), approveAllSections);

// PUT /api/proposals/:proposalId/sections/:sectionId/assign — Assign section to member
router.put('/:proposalId/sections/:sectionId/assign', protect, requireRole('org_admin'), assignSection);

// PUT /api/proposals/:proposalId/bulk-assign — Bulk assign sections
router.put('/:proposalId/bulk-assign', protect, requireRole('org_admin'), bulkAssignSections);

// DELETE /api/proposals/:proposalId — Delete proposal
router.delete('/:proposalId', protect, requireRole('org_admin'), deleteProposal);

module.exports = router;
