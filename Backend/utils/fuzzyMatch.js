/**
 * utils/fuzzyMatch.js
 *
 * Lightweight token-sort-ratio string similarity utility used to match
 * scraped agency names against the FundingAgency collection.  No external
 * dependency — implements the same algorithm as Python's fuzzywuzzy
 * `token_sort_ratio`: tokenize → sort → Levenshtein ratio.
 *
 * Design choice: keep this self-contained rather than pulling in a full
 * NLP library for a single use-case.
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 * Standard O(m*n) dynamic programming implementation.
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;

  // Use a single-row DP approach for space efficiency
  const row = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(
        row[j] + 1,       // deletion
        prev + 1,          // insertion
        row[j - 1] + cost  // substitution
      );
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n];
}

/**
 * Compute a 0–100 similarity ratio between two strings using
 * Levenshtein distance.
 */
function ratio(a, b) {
  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * Token-sort ratio: tokenize both strings, sort tokens alphabetically,
 * rejoin, then compute Levenshtein ratio.  This is order-insensitive,
 * so "Department of Science and Technology" matches
 * "Science and Technology, Department of" equally well.
 */
function tokenSortRatio(str1, str2) {
  const normalize = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')  // strip punctuation
      .replace(/\s+/g, ' ');

  const sorted1 = normalize(str1).split(' ').sort().join(' ');
  const sorted2 = normalize(str2).split(' ').sort().join(' ');

  return ratio(sorted1, sorted2);
}

/**
 * Find the best match for `query` in an array of candidate strings.
 * Returns { match, score, index } or null if no candidate meets the
 * threshold.
 *
 * @param {string}   query      - The string to match
 * @param {string[]} candidates - Array of candidate strings
 * @param {number}   [threshold=90] - Minimum score (0-100) to consider a match
 * @returns {{ match: string, score: number, index: number } | null}
 */
function bestMatch(query, candidates, threshold = 90) {
  let best = null;

  for (let i = 0; i < candidates.length; i++) {
    const score = tokenSortRatio(query, candidates[i]);
    if (score >= threshold && (!best || score > best.score)) {
      best = { match: candidates[i], score, index: i };
    }
  }

  return best;
}

module.exports = { tokenSortRatio, bestMatch, levenshteinDistance, ratio };
