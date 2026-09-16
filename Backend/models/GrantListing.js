/**
 * models/GrantListing.js
 *
 * Canonical schema for grants that are discoverable in GrantOS, regardless of
 * whether they were (a) scraped from a public agency portal/PDF, or
 * (b) entered directly by a verified `funding_agency` user.
 *
 * Design goals this schema encodes:
 *   1. One shared shape for every source site (DST, DBT, AICTE, UGC, ...),
 *      even though each site labels its columns differently
 *      (e.g. "DST Category" vs "DBT Area" vs "UGC Scheme/Bureau").
 *      -> see `categoryRaw` + `agency.name`.
 *   2. Fields that are genuinely absent for a given grant are left null/empty,
 *      never fabricated. `missingFields` + `needsReview` make that visible
 *      to admins instead of hiding it.
 *   3. A deterministic `grantId` hash is the dedup key, so re-running the
 *      scraper daily inserts only NEW grants and never overwrites a field
 *      with blank data (see `upsertFromScrape`).
 *   4. A grant can link to a `FundingAgency` doc already in the system, OR
 *      remain unlinked-but-discoverable if that agency hasn't registered.
 *   5. Scraped grants and agency-submitted grants live in the same
 *      collection and are told apart by `source.type`.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Schema } = mongoose;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

// Kept broad on purpose: union of every label used across DST/DBT/AICTE/UGC
// in Grant_Schemes.docx, plus labels already live in the FundingAgency
// collection (e.g. "travel_grant") that aren't in that doc. `other` is the
// escape hatch so the pipeline never has to drop a real grant for want of
// an enum value.
const GRANT_TYPES = [
  'research_grant',
  'fellowship',
  'startup_funding',
  'institutional_infra',
  'facility_access',
  'science_communication',
  'academic_programme',
  'scholarship',
  'faculty_training',
  'student_competition_travel',
  'institutional_recognition',
  'general_scheme',
  'travel_grant',
  'other',
];

// Most of these sites do NOT give a clean ISO date. "Annual call, historically
// opened around Teachers' Day (5 Sep)... reconfirm each cycle" is a realistic
// value. `type` captures the *shape* of the deadline; `rawText` preserves the
// original sentence; `parsedDate` is best-effort and may legitimately be null.
const DEADLINE_TYPES = [
  'fixed', // a specific date was extracted
  'rolling', // "accepted round the year, no fixed call deadline"
  'annual_pattern', // recurring yearly window, exact date varies by cycle
  'periodic_irregular', // "periodic calls", "irregular thematic calls"
  'suspended', // e.g. UGC-BSR: "applications suspended... until further notice"
  'closed', // e.g. TRC: "closed cohort — not open for application"
  'unknown', // could not determine from source text
];

const GRANT_STATUS = ['active', 'closed', 'suspended', 'unknown'];

const EXTRACTION_METHODS = [
  'html_table',
  'html_text',
  'pdf_table',
  'pdf_text',
  'manual',
];

const SOURCE_TYPES = ['scraped', 'agency_submitted'];

// Canonical fields whose absence should trigger a review flag. Everything
// else is "nice to have" and can be blank without flagging the record.
const REVIEW_CRITICAL_FIELDS = [
  'eligibilityText',
  'applicationProcedure',
  'deadline.rawText',
  'links.infoUrl',
];

const URL_REGEX = /^https?:\/\/[^\s]+$/i;

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const AgencySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'agency.name is required (raw name as scraped, e.g. "Department of Science and Technology (DST)")'],
      trim: true,
      maxlength: 200,
    },
    // Populated only when the scraped/submitted agency name is matched
    // (exactly or via an alias table) to a document already approved in
    // the FundingAgency collection. Left null otherwise -- the grant is
    // still fully discoverable and searchable by `agency.name`.
    ref: {
      type: Schema.Types.ObjectId,
      ref: 'FundingAgency',
      default: null,
    },
    // Derived, not set directly -- see pre-validate hook below.
    isLinked: {
      type: Boolean,
      default: false,
    },
    // e.g. "Government of India" -- optional context, not used for matching.
    parentBody: { type: String, trim: true, default: '' },
    // e.g. "BIRAC" (implements DBT startup schemes), "KIRAN Division",
    // "STRIDE Cell", "FRPS cell". Several sources route the same parent
    // agency's schemes through a named sub-body; keep it distinct from
    // `name` so filtering by parent agency still works.
    implementingBody: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const DeadlineSchema = new Schema(
  {
    type: { type: String, enum: DEADLINE_TYPES, default: 'unknown' },
    rawText: { type: String, trim: true, default: '' },
    parsedDate: { type: Date, default: null },
    lastVerifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const FundingAmountSchema = new Schema(
  {
    rawText: { type: String, trim: true, default: '' }, // e.g. "up to ₹50 lakh"
    minINR: { type: Number, default: null, min: 0 },
    maxINR: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        // `this` is the FundingAmountSchema subdocument here (not an array
        // element), so sibling-path access works.
        validator: function (v) {
          if (v == null || this.minINR == null) return true;
          return v >= this.minINR;
        },
        message: 'fundingAmount.maxINR cannot be less than fundingAmount.minINR',
      },
    },
    currency: { type: String, default: 'INR' },
  },
  { _id: false }
);

const DurationSchema = new Schema(
  {
    rawText: { type: String, trim: true, default: '' }, // e.g. "up to 5 yrs"
    months: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const LinksSchema = new Schema(
  {
    // The page a scraper actually found this grant on. Required -- every
    // grant must be traceable back to a real source, scraped or not.
    infoUrl: {
      type: String,
      required: [true, 'links.infoUrl is required'],
      trim: true,
      validate: { validator: (v) => URL_REGEX.test(v), message: 'links.infoUrl must be a valid http(s) URL' },
    },
    applicationUrl: {
      type: String,
      trim: true,
      default: '',
      validate: { validator: (v) => v === '' || URL_REGEX.test(v), message: 'links.applicationUrl must be a valid http(s) URL' },
    },
    guidelinesUrl: {
      type: String,
      trim: true,
      default: '',
      validate: { validator: (v) => v === '' || URL_REGEX.test(v), message: 'links.guidelinesUrl must be a valid http(s) URL' },
    },
  },
  { _id: false }
);

const SourceSchema = new Schema(
  {
    type: { type: String, enum: SOURCE_TYPES, required: true },
    website: { type: String, trim: true, default: '' }, // domain, e.g. "dst.gov.in"
    scraperVersion: { type: String, trim: true, default: '' },
    extractionMethod: { type: String, enum: EXTRACTION_METHODS, default: 'html_text' },
    // 0-1 self-reported confidence from the extraction step (regex-only
    // extraction should self-report lower than an LLM-normalized field).
    confidenceScore: { type: Number, min: 0, max: 1, default: null },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

const GrantListingSchema = new Schema(
  {
    // Deterministic hash of (agency name + title + infoUrl). This is the
    // dedup key the pipeline upserts on -- see `computeGrantId` /
    // `upsertFromScrape`. Never edit by hand.
    grantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      immutable: true,
    },

    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: 300,
    },

    agency: { type: AgencySchema, required: true },

    grantType: {
      type: String,
      enum: GRANT_TYPES,
      required: true,
      default: 'other',
    },

    // The source site's own taxonomy label, kept verbatim because it does
    // NOT mean the same thing across agencies (DST's "R&D Programmes" vs
    // AICTE's "Student Development" are different classification schemes).
    // `grantType` above is GrantOS's normalized cross-agency label.
    categoryRaw: { type: String, trim: true, default: '' },

    description: { type: String, trim: true, default: '', maxlength: 2000 },

    eligibilityText: { type: String, trim: true, default: '' },

    deadline: { type: DeadlineSchema, default: () => ({}) },

    fundingAmount: { type: FundingAmountSchema, default: () => ({}) },

    duration: { type: DurationSchema, default: () => ({}) },

    // Many sources fold "how to apply" + review workflow into one prose
    // paragraph (e.g. "e-PMS submission → screening → PI presentation").
    // Keep it as one field rather than forcing a step-by-step structure
    // the source text doesn't actually have.
    applicationProcedure: { type: String, trim: true, default: '' },

    links: { type: LinksSchema, required: true },

    focusAreas: {
      type: [String],
      default: [],
      // Not scraped verbatim (the source tables don't tag focus areas per
      // scheme) -- populated by a downstream classification step, ideally
      // reusing the same tag vocabulary as Organization.focusAreas /
      // FundingAgency.fundingDomains so filtering works across all three.
    },

    eligibleApplicantTypes: {
      type: [String],
      enum: ['individual_researcher', 'student', 'institution', 'startup', 'ngo', 'industry', 'unknown'],
      default: [],
    },

    status: { type: String, enum: GRANT_STATUS, default: 'unknown' },

    source: { type: SourceSchema, required: true },

    // Only relevant when source.type === 'agency_submitted'.
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // Escape hatch: anything a specific site exposes that isn't worth a
    // first-class column yet (e.g. a PDF's raw table cells). Never rely on
    // this for querying/filtering -- promote a field to top-level once two
    // or more sources need it.
    rawExtracted: { type: Schema.Types.Mixed, default: {} },

    // Bookkeeping so "missing field" is visible instead of silently blank.
    missingFields: { type: [String], default: [] },
    needsReview: { type: Boolean, default: false },

    // Change detection so a daily re-scrape can skip re-parsing a page
    // that hasn't changed.
    lastContentHash: { type: String, default: null },

    firstDiscoveredAt: { type: Date, default: Date.now, immutable: true },
    lastScrapedAt: { type: Date, default: Date.now },

    // ─── Embedding (Grant Discovery) ───
    // 768-dim vector from gemini-embedding-001, used for semantic similarity
    // ranking against organization profiles.
    embedding: { type: [Number], default: [] },
    // SHA-256 hash of the concatenated source text fed to the embedding model.
    // Compared before re-embedding so unchanged grants don't burn API calls.
    embeddingContentHash: { type: String, default: null },

    // Soft-delete: when a grant disappears from its source site (deadline
    // long passed, page removed, or the site itself is de-registered from
    // the scraper config), flip this instead of deleting the document so
    // history/audit trail survives.
    isActive: { type: Boolean, default: true },
    delistedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

GrantListingSchema.index({ 'agency.ref': 1 });
GrantListingSchema.index({ 'source.website': 1, isActive: 1 });
GrantListingSchema.index({ status: 1, isActive: 1 });
GrantListingSchema.index({ needsReview: 1 });
GrantListingSchema.index({ 'deadline.parsedDate': 1 });
GrantListingSchema.index({
  title: 'text',
  categoryRaw: 'text',
  eligibilityText: 'text',
  'agency.name': 'text',
});

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

GrantListingSchema.pre('validate', function () {
  // Purely synchronous, so declare zero parameters -- Mongoose 8+ dropped
  // callback-style ("function (next) {...}") document validation hooks.
  // isLinked is derived, never set directly by callers.
  this.agency.isLinked = !!this.agency.ref;

  // Recompute which review-critical fields are actually empty right now,
  // so `needsReview` reflects the document as it will be saved.
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const missing = REVIEW_CRITICAL_FIELDS.filter((path) => {
    const val = getPath(this, path);
    return val === undefined || val === null || val === '';
  });

  this.missingFields = missing;
  this.needsReview =
    missing.length > 0 ||
    (typeof this.source?.confidenceScore === 'number' && this.source.confidenceScore < 0.6);
});

// ---------------------------------------------------------------------------
// Statics
// ---------------------------------------------------------------------------

/**
 * Deterministic id for dedup across scrape runs. Same (agency, title, url)
 * always hashes to the same grantId, so re-scraping never creates a
 * duplicate document.
 */
GrantListingSchema.statics.computeGrantId = function (agencyName, title, infoUrl) {
  const normalize = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const key = [normalize(agencyName), normalize(title), normalize(infoUrl)].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
};

/**
 * True if a value should be treated as "no data" for merge purposes.
 */
function isEmptyValue(v) {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

/**
 * Recursively merges `incoming` onto `existing`, but only ever overwrites a
 * field when the incoming value is non-empty. This is what guarantees a
 * re-scrape can never blank out a field that a previous run (or a manual
 * admin edit) had already populated.
 */
function mergeNonDestructive(existing, incoming) {
  const result = { ...existing };
  for (const key of Object.keys(incoming)) {
    const incomingVal = incoming[key];
    const existingVal = existing[key];

    if (
      incomingVal &&
      typeof incomingVal === 'object' &&
      !Array.isArray(incomingVal) &&
      !(incomingVal instanceof Date) &&
      existingVal &&
      typeof existingVal === 'object' &&
      !Array.isArray(existingVal)
    ) {
      result[key] = mergeNonDestructive(existingVal, incomingVal);
      continue;
    }

    if (!isEmptyValue(incomingVal)) {
      result[key] = incomingVal;
    }
  }
  return result;
}

/**
 * Upsert entry point for the scraping pipeline. Never overwrites a
 * previously-filled field with blank data; only fills gaps and refreshes
 * bookkeeping (lastScrapedAt, missingFields, needsReview, lastContentHash).
 *
 * @param {Object} scrapedData - shape matching this schema's fields.
 *   `grantId` is optional; computed automatically if omitted.
 * @returns {Promise<Document>} the created or updated GrantListing.
 */
GrantListingSchema.statics.upsertFromScrape = async function (scrapedData) {
  const Model = this;

  const grantId =
    scrapedData.grantId ||
    Model.computeGrantId(scrapedData.agency?.name, scrapedData.title, scrapedData.links?.infoUrl);

  const existing = await Model.findOne({ grantId });

  if (!existing) {
    return Model.create({
      ...scrapedData,
      grantId,
      firstDiscoveredAt: new Date(),
      lastScrapedAt: new Date(),
    });
  }

  const merged = mergeNonDestructive(existing.toObject(), scrapedData);
  Object.assign(existing, merged);
  existing.lastScrapedAt = new Date();
  // A grant that reappears in a fresh scrape is, by definition, still live.
  existing.isActive = true;
  existing.delistedAt = null;

  await existing.save();
  return existing;
};

// ---------------------------------------------------------------------------
// Instance methods
// ---------------------------------------------------------------------------

/**
 * Call when a grant that used to be on a source site is no longer found
 * there. Soft-delete only -- the document (and its history) is preserved.
 */
GrantListingSchema.methods.markDelisted = function () {
  this.isActive = false;
  this.delistedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('GrantListing', GrantListingSchema);
module.exports.GRANT_TYPES = GRANT_TYPES;
module.exports.DEADLINE_TYPES = DEADLINE_TYPES;
module.exports.GRANT_STATUS = GRANT_STATUS;
module.exports.EXTRACTION_METHODS = EXTRACTION_METHODS;
module.exports.SOURCE_TYPES = SOURCE_TYPES;
