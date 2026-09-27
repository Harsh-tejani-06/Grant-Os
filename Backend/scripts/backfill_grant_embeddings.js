/**
 * scripts/backfill_grant_embeddings.js
 *
 * One-time backfill script that computes embeddings for all GrantListing
 * documents whose embedding is missing or stale (content hash mismatch).
 *
 * Usage:
 *   node scripts/backfill_grant_embeddings.js            # real run
 *   node scripts/backfill_grant_embeddings.js --dry-run   # preview only
 *
 * At under 100 grants this runs in seconds with no batching or rate-limit
 * logic needed — keeping it simple per the build prompt.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GrantListing = require('../models/GrantListing');
const { embedGrantText, buildGrantText, contentHash } = require('../utils/embeddings');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`=== Backfill Grant Embeddings ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const grants = await GrantListing.find({});
  console.log(`📊 Total grants in collection: ${grants.length}\n`);

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const grant of grants) {
    const text = buildGrantText(grant);
    if (!text) {
      console.log(`  ⏭️  [skip] "${grant.title}" — no embeddable text`);
      skipped++;
      continue;
    }

    const hash = contentHash(text);

    // Skip if embedding already exists AND content hash matches
    if (
      grant.embedding &&
      grant.embedding.length === 768 &&
      grant.embeddingContentHash === hash
    ) {
      console.log(`  ⏭️  [skip] "${grant.title}" — embedding already current`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  🔍 [would embed] "${grant.title}"`);
      embedded++;
      continue;
    }

    try {
      const { embedding, hash: newHash } = await embedGrantText(grant);
      grant.embedding = embedding;
      grant.embeddingContentHash = newHash;
      await grant.save();
      console.log(`  ✅ [embedded] "${grant.title}" (${embedding.length} dims)`);
      embedded++;
    } catch (err) {
      console.error(`  ❌ [failed] "${grant.title}": ${err.message}`);
      failed++;
    }
  }

  console.log('\n─── Summary ───');
  console.log(`  Embedded:  ${embedded}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total:     ${grants.length}`);
  if (DRY_RUN) console.log('\n  (Dry run — no changes were written)');

  await mongoose.disconnect();
  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('❌ Backfill error:', err);
  process.exit(1);
});
