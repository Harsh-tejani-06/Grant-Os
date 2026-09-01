# GrantOS Scraping Pipeline

## Overview

Python-based scraping pipeline that discovers open grants from Indian government
funding-agency websites (DST, DBT, AICTE, UGC) and lands them in MongoDB as
`GrantListing` documents through the Node.js internal API.

## Quick Start

### Prerequisites
- Python 3.10+ with pip
- Node.js backend running (`cd Backend && npm run dev`)
- `INTERNAL_SCRAPER_TOKEN` set in `Backend/.env`

### Install
```bash
cd scraper
pip install -r requirements.txt
```

### Run

```bash
# Dry run (scrape + normalize, no DB writes)
npm run scrape:dry
# — or —
python Scraper/run_pipeline.py --dry-run

# Full run (writes to MongoDB via Node ingest endpoint)
npm run scrape
# — or —
python Scraper/run_pipeline.py

# Run only one spider
python Scraper/run_pipeline.py --spider dst
python Scraper/run_pipeline.py --spider dbt --dry-run
```

## Architecture

```
Scraper/
  requirements.txt              # Python dependencies
  sources_registry.yaml         # Config-driven source site registry
  run_pipeline.py               # Single entrypoint
  scrapy_project/
    settings.py                 # Scrapy settings (AutoThrottle, robots.txt, etc.)
    items.py                    # GrantItem — mirrors GrantListing schema
    spiders/
      dst_spider.py             # DST + SERB + INSPIRE
      dbt_spider.py             # DBT + BIRAC
      aicte_spider.py           # AICTE
      ugc_spider.py             # UGC + STRIDE/SAP/FRPS sub-bodies
    pipelines/
      normalize.py              # Text cleanup (priority 100)
      extract_fields.py         # Regex extraction of amounts/deadlines (priority 200)
      grant_id.py               # Deterministic grantId hash (priority 300)
      ingest.py                 # POST to Node ingest endpoint (priority 400)
```

## How to Add a New Source Site

1. **Add an entry to `sources_registry.yaml`:**
   ```yaml
   - spider_name: new_agency   # or reuse an existing spider
     agency_name: "New Agency Name"
     implementing_body: ""      # optional sub-body
     urls:
       - "https://newagency.gov.in/schemes"
     extraction_method: html_text
     enabled: true
     notes: "Description"
   ```

2. **If the new site needs a new spider**, create `scrapy_project/spiders/new_agency_spider.py`
   following the pattern in `dst_spider.py`. Register it in `run_pipeline.py`'s
   `_load_spider_classes()`.

3. **If the site uses the same HTML structure as an existing spider**, just add entries
   pointing to the existing spider (e.g. `spider_name: dst`).

4. **To disable a source** without deleting it, set `enabled: false`. Existing
   scraped grants remain in the DB — they just stop refreshing.

## How the Pipeline Works

```
Source Website → Scrapy Spider → Normalize → Extract Fields → Compute ID → POST to Node
                                                                              ↓
                                                             GrantListing.upsertFromScrape()
                                                                              ↓
                                                              MongoDB (grantlistings)
```

1. **Spider** crawls source URLs from `sources_registry.yaml`
2. **Normalize** pipeline cleans text (HTML entities, Unicode, whitespace)
3. **Extract Fields** pipeline regex-extracts amounts, durations, deadline types
4. **Grant ID** pipeline computes deterministic SHA-256 hash (matches Node.js)
5. **Ingest** pipeline POSTs to `POST /api/internal/grants/ingest` on the Node server
6. Node's `GrantListing.upsertFromScrape()` handles dedup + non-destructive merge

## Key Design Decisions

- **Non-destructive upserts**: A re-scrape never blanks out previously-filled fields
- **Config-driven sources**: Add/remove sites by editing YAML, not code
- **grantId dedup**: SHA-256 hash of (agency + title + URL) prevents duplicates
- **Agency linking**: Best-effort fuzzy match against FundingAgency collection
- **Confidence scoring**: Self-reported score based on extraction method + completeness
- **Soft deletes**: Grants that vanish from source are marked `isActive: false`, never hard-deleted

## Production Scheduling

The pipeline is designed to run once daily. Options:
- **npm script**: `npm run scrape` (from `Backend/` directory)
- **System cron**: `0 2 * * * cd /path/to/Scraper && python run_pipeline.py`
- **Auto on dev start**: Set `AUTO_SCRAPE_ON_START=true` in `Backend/.env`
