"""
scrapy_project/items.py

GrantItem — the canonical Scrapy Item mirroring GrantListing's field subset.
Every spider yields instances of this Item; the pipeline stages
(normalize → extract_fields → grant_id → ingest) process them in sequence.

Fields match the GrantListing Mongoose schema exactly so the ingest
pipeline can POST them directly to /api/internal/grants/ingest.
"""

import scrapy


class GrantItem(scrapy.Item):
    # ─── Core identity ───
    title = scrapy.Field()
    grantId = scrapy.Field()  # computed by grant_id pipeline stage

    # ─── Agency ───
    agency = scrapy.Field()  # dict: { name, implementingBody, parentBody }

    # ─── Classification ───
    grantType = scrapy.Field()  # normalized cross-agency type
    categoryRaw = scrapy.Field()  # verbatim agency taxonomy label

    # ─── Description & eligibility ───
    description = scrapy.Field()
    eligibilityText = scrapy.Field()

    # ─── Deadline ───
    deadline = scrapy.Field()  # dict: { rawText, type, parsedDate }

    # ─── Funding ───
    fundingAmount = scrapy.Field()  # dict: { rawText, minINR, maxINR, currency }

    # ─── Duration ───
    duration = scrapy.Field()  # dict: { rawText, months }

    # ─── Application ───
    applicationProcedure = scrapy.Field()

    # ─── Links ───
    links = scrapy.Field()  # dict: { infoUrl, applicationUrl, guidelinesUrl }

    # ─── Status ───
    status = scrapy.Field()  # active | closed | suspended | unknown

    # ─── Source metadata ───
    source = scrapy.Field()  # dict: { type, website, extractionMethod, confidenceScore, scraperVersion }

    # ─── Focus areas & applicant types ───
    focusAreas = scrapy.Field()
    eligibleApplicantTypes = scrapy.Field()

    # ─── Escape hatch ───
    rawExtracted = scrapy.Field()
