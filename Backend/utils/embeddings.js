/**
 * utils/embeddings.js
 *
 * Embedding utilities for the Grant Discovery feature.
 * Uses Google's Gemini embedding API (`gemini-embedding-001`) to produce
 * 768-dimensional vectors for grants and organization profiles, plus a
 * brute-force cosine similarity function for ranking.
 *
 * Design decisions:
 *   - `RETRIEVAL_DOCUMENT` task type for grants (they are the "corpus").
 *   - `RETRIEVAL_QUERY` task type for org profiles (the org acts as the
 *     "query" that retrieves matching grants).
 *   - Output dimensionality fixed at 768.  The model does NOT pre-normalize,
 *     so cosine similarity must divide by both norms (not a raw dot product).
 *   - A content-hash (SHA-256) of the concatenated source text is returned
 *     alongside the vector so callers can skip re-embedding when the text
 *     hasn't changed.  Same pattern as `GrantListing.computeGrantId`.
 */

const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Gemini client — lazily initialised from GEMINI_API_KEY env var
// ---------------------------------------------------------------------------

let _ai = null;
function getAI() {
  if (!_ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment');
    }
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _ai;
}

const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMS = 768;

// ---------------------------------------------------------------------------
// Text builders
// ---------------------------------------------------------------------------

/**
 * Build the concatenated text that represents a grant for embedding.
 * Fields: title + description + eligibilityText + focusAreas + categoryRaw + grantType
 */
function buildGrantText(grantDoc) {
  const parts = [
    grantDoc.title || '',
    grantDoc.description || '',
    grantDoc.eligibilityText || '',
    Array.isArray(grantDoc.focusAreas) ? grantDoc.focusAreas.join(', ') : '',
    grantDoc.categoryRaw || '',
    grantDoc.grantType || '',
  ];
  return parts.filter(Boolean).join(' ').trim();
}

/**
 * Build the concatenated text that represents an organization profile.
 * Fields: organizationType + focusAreas + grantCategories + naacAccreditation + ugcRecognition phrase
 */
function buildOrgText(orgDoc) {
  const ugcPhrase = orgDoc.ugcRecognition ? 'UGC recognized' : 'not UGC recognized';
  const parts = [
    orgDoc.organizationType || '',
    Array.isArray(orgDoc.focusAreas) ? orgDoc.focusAreas.join(', ') : '',
    Array.isArray(orgDoc.grantCategories) ? orgDoc.grantCategories.join(', ') : '',
    orgDoc.naacAccreditation || '',
    ugcPhrase,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

// ---------------------------------------------------------------------------
// Content hash — same SHA-256 approach as GrantListing.computeGrantId
// ---------------------------------------------------------------------------

function contentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ---------------------------------------------------------------------------
// Gemini embedding call (with one retry on transient failure)
// ---------------------------------------------------------------------------

async function callEmbedAPI(text, taskType) {
  const ai = getAI();

  const request = {
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: OUTPUT_DIMS,
    },
  };

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await ai.models.embedContent(request);
      return result.embeddings[0].values;
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        // Brief back-off before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Embed a grant document.
 * @param {Object} grantDoc - a GrantListing document (or plain object with the same shape)
 * @returns {Promise<{ embedding: number[], hash: string }>}
 */
async function embedGrantText(grantDoc) {
  const text = buildGrantText(grantDoc);
  if (!text) return { embedding: [], hash: '' };
  const hash = contentHash(text);
  const embedding = await callEmbedAPI(text, 'RETRIEVAL_DOCUMENT');
  return { embedding, hash };
}

/**
 * Embed an organization profile.
 * @param {Object} orgDoc - an Organization document (or plain object with the same shape)
 * @returns {Promise<{ embedding: number[], hash: string }>}
 */
async function embedOrgProfile(orgDoc) {
  const text = buildOrgText(orgDoc);
  if (!text) return { embedding: [], hash: '' };
  const hash = contentHash(text);
  const embedding = await callEmbedAPI(text, 'RETRIEVAL_QUERY');
  return { embedding, hash };
}

/**
 * True cosine similarity: dot(a,b) / (|a| * |b|).
 * Returns 0 safely if either vector is empty or missing.
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} similarity in [-1, 1]
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

module.exports = {
  embedGrantText,
  embedOrgProfile,
  cosineSimilarity,
  // Exposed for testing / backfill scripts
  buildGrantText,
  buildOrgText,
  contentHash,
};
