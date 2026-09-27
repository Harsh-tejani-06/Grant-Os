/**
 * scripts/backfill_org_embeddings.js
 *
 * One-time backfill script that computes embeddings for all approved
 * Organization documents whose embedding is missing or stale.
 *
 * Usage:
 *   node scripts/backfill_org_embeddings.js            # real run
 *   node scripts/backfill_org_embeddings.js --dry-run   # preview only
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const { embedOrgProfile, buildOrgText, contentHash } = require('../utils/embeddings');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`=== Backfill Org Embeddings ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const orgs = await Organization.find({ status: 'approved' });
  console.log(`📊 Approved organizations: ${orgs.length}\n`);

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const org of orgs) {
    const text = buildOrgText(org);
    if (!text) {
      console.log(`  ⏭️  [skip] "${org.organizationName}" — no embeddable text`);
      skipped++;
      continue;
    }

    const hash = contentHash(text);

    if (
      org.embedding &&
      org.embedding.length === 768 &&
      org.embeddingContentHash === hash
    ) {
      console.log(`  ⏭️  [skip] "${org.organizationName}" — embedding already current`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  🔍 [would embed] "${org.organizationName}"`);
      embedded++;
      continue;
    }

    try {
      const { embedding, hash: newHash } = await embedOrgProfile(org);
      org.embedding = embedding;
      org.embeddingContentHash = newHash;
      await org.save();
      console.log(`  ✅ [embedded] "${org.organizationName}" (${embedding.length} dims)`);
      embedded++;
    } catch (err) {
      console.error(`  ❌ [failed] "${org.organizationName}": ${err.message}`);
      failed++;
    }
  }

  console.log('\n─── Summary ───');
  console.log(`  Embedded:  ${embedded}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total:     ${orgs.length}`);
  if (DRY_RUN) console.log('\n  (Dry run — no changes were written)');

  await mongoose.disconnect();
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('❌ Backfill error:', err);
  process.exit(1);
});
