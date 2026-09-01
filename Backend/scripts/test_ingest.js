// Test script for Phase 1 verification of the grant ingest endpoint
// Run: node test_ingest.js

const http = require('http');

const TOKEN = 'sk_scraper_7f3a9c2e1b4d6e8f0a2c4e6b8d0f1a3c5e7b9d1f3a5c7e9b0d2f4a6c8e0b2d';
const BASE_URL = 'http://localhost:5000';

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    };
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('=== Phase 1 Verification Tests ===\n');

  // Test 1: Fresh insert
  console.log('--- Test 1: Fresh insert ---');
  const grant1 = {
    title: 'SERB Core Research Grant (CRG)',
    agency: {
      name: 'Department of Science and Technology',
      implementingBody: 'SERB',
    },
    grantType: 'research_grant',
    categoryRaw: 'R&D Programmes',
    links: { infoUrl: 'https://dst.gov.in/serb-crg' },
    source: {
      type: 'scraped',
      website: 'dst.gov.in',
      extractionMethod: 'html_table',
      confidenceScore: 0.85,
    },
    eligibilityText: 'Faculty members of recognized academic institutions and R&D labs',
    deadline: { rawText: 'Rolling - accepted round the year', type: 'rolling' },
    status: 'active',
  };

  const res1 = await post('/api/internal/grants/ingest', grant1);
  console.log(`  Status: ${res1.status}`);
  console.log(`  Response:`, JSON.stringify(res1.body, null, 2));
  console.log(`  ✓ Expected: status=inserted, needsReview=false (all critical fields present)\n`);

  // Test 2: Non-destructive update (same grant, should not blank fields)
  console.log('--- Test 2: Non-destructive re-insert (same grant, no changes) ---');
  const res2 = await post('/api/internal/grants/ingest', grant1);
  console.log(`  Status: ${res2.status}`);
  console.log(`  Response:`, JSON.stringify(res2.body, null, 2));
  console.log(`  ✓ Expected: status=updated, same grantId\n`);

  // Test 3: Non-destructive update — adding applicationProcedure, NOT blanking eligibilityText
  console.log('--- Test 3: Non-destructive update (fill gap, don\'t blank existing) ---');
  const grant3 = {
    title: 'SERB Core Research Grant (CRG)',
    agency: { name: 'Department of Science and Technology' },
    links: { infoUrl: 'https://dst.gov.in/serb-crg' },
    source: { type: 'scraped', website: 'dst.gov.in', extractionMethod: 'html_table' },
    applicationProcedure: 'Apply through e-PMS portal at www.serbonline.in',
    // Note: eligibilityText is NOT sent — it should NOT be blanked
  };
  const res3 = await post('/api/internal/grants/ingest', grant3);
  console.log(`  Status: ${res3.status}`);
  console.log(`  Response:`, JSON.stringify(res3.body, null, 2));
  console.log(`  ✓ Expected: status=updated, applicationProcedure filled, eligibilityText preserved\n`);

  // Test 4: Grant with missing critical fields → needsReview = true
  console.log('--- Test 4: Grant with missing fields (should flag needsReview) ---');
  const grant4 = {
    title: 'Innovation in Science Pursuit for Inspired Research (INSPIRE)',
    agency: { name: 'Department of Science and Technology' },
    grantType: 'fellowship',
    links: { infoUrl: 'https://online-inspire.gov.in' },
    source: {
      type: 'scraped',
      website: 'online-inspire.gov.in',
      extractionMethod: 'html_text',
      confidenceScore: 0.4,
    },
    // Missing: eligibilityText, applicationProcedure, deadline.rawText
    status: 'active',
  };
  const res4 = await post('/api/internal/grants/ingest', grant4);
  console.log(`  Status: ${res4.status}`);
  console.log(`  Response:`, JSON.stringify(res4.body, null, 2));
  console.log(`  ✓ Expected: status=inserted, needsReview=true, missingFields has entries\n`);

  // Test 5: Rejected — missing required field (no title)
  console.log('--- Test 5: Rejected — missing required field ---');
  const res5 = await post('/api/internal/grants/ingest', {
    agency: { name: 'DST' },
    links: { infoUrl: 'https://dst.gov.in/some-page' },
    source: { type: 'scraped' },
  });
  console.log(`  Status: ${res5.status}`);
  console.log(`  Response:`, JSON.stringify(res5.body, null, 2));
  console.log(`  ✓ Expected: status=rejected, title required\n`);

  // Test 6: Auth — missing token
  console.log('--- Test 6: Auth — no token ---');
  const noAuthRes = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ title: 'test' });
    const options = {
      hostname: 'localhost', port: 5000,
      path: '/api/internal/grants/ingest',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(chunks) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  console.log(`  Status: ${noAuthRes.status}`);
  console.log(`  Response:`, JSON.stringify(noAuthRes.body, null, 2));
  console.log(`  ✓ Expected: 401 unauthorized\n`);

  // Test 7: Get stats
  console.log('--- Test 7: Get ingestion stats ---');
  const res7 = await get('/api/internal/grants/stats');
  console.log(`  Status: ${res7.status}`);
  console.log(`  Response:`, JSON.stringify(res7.body, null, 2));
  console.log(`  ✓ Expected: stats with counts\n`);

  console.log('=== All Phase 1 tests complete ===');
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
