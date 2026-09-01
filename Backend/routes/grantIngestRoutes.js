/**
 * routes/grantIngestRoutes.js
 *
 * Internal-only routes for the Python scraping pipeline.  Protected by
 * a shared bearer token (INTERNAL_SCRAPER_TOKEN), NOT by the JWT auth
 * used for user-facing routes.
 *
 * These routes are mounted WITHOUT the public CORS config — they are
 * machine-to-machine (scraper → Node server on localhost) and should
 * not be reachable from a browser.
 */

const express = require('express');
const { verifyScraperToken } = require('../middleware/internalScraperAuth');
const {
  ingestGrant,
  markDelistedBatch,
  getIngestStats,
} = require('../controllers/grantIngestController');

const router = express.Router();

// All routes require the internal scraper bearer token
router.use(verifyScraperToken);

// POST /api/internal/grants/ingest — ingest a single scraped grant
router.post('/ingest', ingestGrant);

// POST /api/internal/grants/delist — batch soft-delete vanished grants
router.post('/delist', markDelistedBatch);

// GET /api/internal/grants/stats — pipeline run summary
router.get('/stats', getIngestStats);

module.exports = router;
