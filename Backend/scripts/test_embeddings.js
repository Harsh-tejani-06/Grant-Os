/**
 * scripts/test_embeddings.js
 *
 * Throwaway verification script for Phase 1.
 * Connects to MongoDB, grabs one GrantListing and one Organization,
 * calls the embedding functions, and confirms 768-length arrays are returned.
 *
 * Run:  node scripts/test_embeddings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GrantListing = require('../models/GrantListing');
const Organization = require('../models/Organization');
const { embedGrantText, embedOrgProfile, cosineSimilarity } = require('../utils/embeddings');

async function main() {
  console.log('=== Phase 1: Embedding Verification ===\n');

  // Connect
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // --- Test grant embedding ---
  const grant = await GrantListing.findOne({ isActive: true });
  if (!grant) {
    console.log('⚠️  No active grant found in DB — skipping grant embedding test');
  } else {
    console.log(`📄 Grant: "${grant.title}"`);
    const { embedding: grantVec, hash: grantHash } = await embedGrantText(grant);
    console.log(`   Embedding length: ${grantVec.length}`);
    console.log(`   Content hash:     ${grantHash.slice(0, 16)}…`);
    console.log(`   First 5 values:   [${grantVec.slice(0, 5).map((v) => v.toFixed(6)).join(', ')}]`);
    if (grantVec.length === 768) {
      console.log('   ✅ Grant embedding OK (768 dims)\n');
    } else {
      console.log(`   ❌ UNEXPECTED length: ${grantVec.length} (expected 768)\n`);
    }
  }

  // --- Test org embedding ---
  const org = await Organization.findOne({ status: 'approved' });
  if (!org) {
    console.log('⚠️  No approved org found — testing with a mock org object');
    const mockOrg = {
      organizationType: 'university',
      focusAreas: ['Artificial Intelligence', 'Machine Learning', 'Computer Science'],
      grantCategories: ['research_grant', 'fellowship'],
      naacAccreditation: 'A+',
      ugcRecognition: true,
    };
    const { embedding: orgVec, hash: orgHash } = await embedOrgProfile(mockOrg);
    console.log(`   Mock org embedding length: ${orgVec.length}`);
    console.log(`   Content hash:              ${orgHash.slice(0, 16)}…`);
    console.log(`   First 5 values:            [${orgVec.slice(0, 5).map((v) => v.toFixed(6)).join(', ')}]`);
    if (orgVec.length === 768) {
      console.log('   ✅ Org embedding OK (768 dims)\n');
    } else {
      console.log(`   ❌ UNEXPECTED length: ${orgVec.length} (expected 768)\n`);
    }

    // --- Test cosine similarity ---
    if (grant) {
      const { embedding: grantVec } = await embedGrantText(grant);
      const sim = cosineSimilarity(orgVec, grantVec);
      console.log(`🔗 Cosine similarity (mock org vs "${grant.title}"): ${sim.toFixed(4)} (${Math.round(sim * 100)}%)`);
    }
  } else {
    console.log(`🏢 Org: "${org.organizationName}" (${org.organizationType})`);
    const { embedding: orgVec, hash: orgHash } = await embedOrgProfile(org);
    console.log(`   Embedding length: ${orgVec.length}`);
    console.log(`   Content hash:     ${orgHash.slice(0, 16)}…`);
    console.log(`   First 5 values:   [${orgVec.slice(0, 5).map((v) => v.toFixed(6)).join(', ')}]`);
    if (orgVec.length === 768) {
      console.log('   ✅ Org embedding OK (768 dims)\n');
    } else {
      console.log(`   ❌ UNEXPECTED length: ${orgVec.length} (expected 768)\n`);
    }

    // --- Test cosine similarity ---
    if (grant) {
      const { embedding: grantVec } = await embedGrantText(grant);
      const sim = cosineSimilarity(orgVec, grantVec);
      console.log(`🔗 Cosine similarity (org vs "${grant.title}"): ${sim.toFixed(4)} (${Math.round(sim * 100)}%)`);
    }
  }

  // --- Test edge cases ---
  console.log('\n--- Edge case tests ---');
  console.log(`cosineSimilarity([], [])  = ${cosineSimilarity([], [])}`);
  console.log(`cosineSimilarity(null, [1,2,3]) = ${cosineSimilarity(null, [1, 2, 3])}`);
  console.log(`cosineSimilarity([1,0], [0,1])  = ${cosineSimilarity([1, 0], [0, 1])}`);
  console.log(`cosineSimilarity([1,0], [1,0])  = ${cosineSimilarity([1, 0], [1, 0])}`);

  console.log('\n=== Phase 1 verification complete ===');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
