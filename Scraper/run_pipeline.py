#!/usr/bin/env python3
"""
run_pipeline.py — Single entrypoint for the GrantOS scraping pipeline.

Usage:
    python scraper/run_pipeline.py                   # full run
    python scraper/run_pipeline.py --dry-run          # scrape + normalize, no DB writes
    python scraper/run_pipeline.py --spider dst       # run only the DST spider
    python scraper/run_pipeline.py --dry-run --spider dst

Reads sources_registry.yaml, runs enabled spiders, and prints an
end-of-run summary (inserted / updated / needsReview / rejected).

Environment:
    INTERNAL_SCRAPER_TOKEN — required for non-dry-run mode
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import yaml

# Add the scraper directory to sys.path so Scrapy can find the project
SCRAPER_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRAPER_DIR))

from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings


# ─── Logging setup ────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("run_pipeline")


# ─── Spider class registry ────────────────────────────────────────

SPIDER_CLASSES = {}

def _load_spider_classes():
    """Import all spider classes and register them by name."""
    global SPIDER_CLASSES
    try:
        from scrapy_project.spiders.dst_spider import DstSpider
        SPIDER_CLASSES["dst"] = DstSpider
    except ImportError as e:
        logger.warning("Could not import DST spider: %s", e)

    try:
        from scrapy_project.spiders.dbt_spider import DbtSpider
        SPIDER_CLASSES["dbt"] = DbtSpider
    except ImportError:
        pass

    try:
        from scrapy_project.spiders.aicte_spider import AicteSpider
        SPIDER_CLASSES["aicte"] = AicteSpider
    except ImportError:
        pass

    try:
        from scrapy_project.spiders.ugc_spider import UgcSpider
        SPIDER_CLASSES["ugc"] = UgcSpider
    except ImportError:
        pass


# ─── Config loading ──────────────────────────────────────────────

def load_sources_registry():
    """Load and validate sources_registry.yaml."""
    registry_path = SCRAPER_DIR / "sources_registry.yaml"

    if not registry_path.exists():
        logger.error("sources_registry.yaml not found at %s", registry_path)
        sys.exit(1)

    with open(registry_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    sources = config.get("sources", [])
    if not sources:
        logger.warning("No sources defined in sources_registry.yaml")

    return sources


def group_by_spider(sources, spider_filter=None):
    """
    Group enabled source entries by spider_name.
    Returns { spider_name: [entry, entry, ...] }
    """
    groups = {}
    for entry in sources:
        if not entry.get("enabled", True):
            logger.info("Skipping disabled source: %s (%s)", entry.get("agency_name"), entry.get("urls", []))
            continue

        spider_name = entry.get("spider_name", "")
        if spider_filter and spider_name != spider_filter:
            continue

        if spider_name not in groups:
            groups[spider_name] = []
        groups[spider_name].append(entry)

    return groups


# ─── Delist handling ──────────────────────────────────────────────

def post_delist(grant_ids_by_website, token, endpoint):
    """
    For each website, POST the list of found grantIds to the delist
    endpoint. Grants from that website NOT in the list will be soft-deleted.
    """
    if not token:
        logger.info("[DRY RUN] Skipping delist (no token)")
        return

    for website, grant_ids in grant_ids_by_website.items():
        payload = json.dumps({
            "grantIds": grant_ids,
            "sourceWebsite": website,
        }).encode("utf-8")

        req = Request(
            endpoint,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                delisted = result.get("delistedCount", 0)
                if delisted > 0:
                    logger.info("Delisted %d grant(s) from %s", delisted, website)
        except (HTTPError, URLError) as e:
            logger.error("Delist failed for %s: %s", website, e)


# ─── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="GrantOS Grant Discovery & Scraping Pipeline",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape and normalize but don't write to the database",
    )
    parser.add_argument(
        "--spider",
        type=str,
        default=None,
        help="Run only the specified spider (e.g. 'dst', 'dbt', 'aicte', 'ugc')",
    )
    args = parser.parse_args()

    # ─── Load env vars ───
    try:
        from dotenv import load_dotenv
        # Load from Backend/.env (sibling directory)
        backend_env = SCRAPER_DIR.parent / "Backend" / ".env"
        if backend_env.exists():
            load_dotenv(backend_env)
            logger.info("Loaded env from %s", backend_env)
    except ImportError:
        logger.info("python-dotenv not installed, using system env vars")

    token = os.environ.get("INTERNAL_SCRAPER_TOKEN", "")

    if not args.dry_run and not token:
        logger.error(
            "INTERNAL_SCRAPER_TOKEN not set. Use --dry-run or set the token in Backend/.env"
        )
        sys.exit(1)

    # ─── Load config & spiders ───
    sources = load_sources_registry()
    _load_spider_classes()
    groups = group_by_spider(sources, spider_filter=args.spider)

    if not groups:
        logger.error("No enabled spiders to run. Check sources_registry.yaml.")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("GrantOS Scraping Pipeline — %s", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    logger.info("Mode: %s", "DRY RUN" if args.dry_run else "LIVE")
    logger.info("Spiders: %s", ", ".join(groups.keys()))
    logger.info("=" * 60)

    # ─── Configure Scrapy ───
    os.environ["SCRAPY_SETTINGS_MODULE"] = "scrapy_project.settings"
    settings = get_project_settings()

    if args.dry_run:
        settings.set("DRY_RUN", True)

    # Inject source entries into settings as a native Python dict.
    # NOTE: Scrapy serializes kwargs passed to crawl() into strings (for CLI
    # compatibility), so we cannot pass a list/dict that way. Instead we store
    # the full source map in settings and each spider reads its own slice.
    settings.set("SOURCES_BY_SPIDER", groups)

    # ─── Run spiders ───
    process = CrawlerProcess(settings)
    
    # Silence excessively noisy loggers from third-party libraries
    logging.getLogger("pdfminer").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)

    for spider_name, entries in groups.items():
        spider_cls = SPIDER_CLASSES.get(spider_name)
        if not spider_cls:
            logger.warning("No spider class registered for '%s' — skipping", spider_name)
            continue

        logger.info("Queuing spider: %s (%d source entries)", spider_name, len(entries))
        for entry in entries:
            logger.info("  → %s", entry.get("urls", []))
        process.crawl(spider_cls)

    process.start()  # blocks until all spiders finish

    # ─── Print summary ───
    logger.info("")
    logger.info("=" * 60)
    logger.info("PIPELINE RUN COMPLETE — %s", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    logger.info("=" * 60)

    total_inserted = 0
    total_updated = 0
    total_rejected = 0
    total_needs_review = 0
    all_errors = []

    for crawler in process.crawlers:
        spider = crawler.spider
        stats = getattr(spider, "ingest_stats", None)
        if stats:
            total_inserted += stats.get("inserted", 0)
            total_updated += stats.get("updated", 0)
            total_rejected += stats.get("rejected", 0)
            total_needs_review += stats.get("needs_review", 0)
            all_errors.extend(stats.get("errors", []))

    logger.info("  Total Inserted:     %d", total_inserted)
    logger.info("  Total Updated:      %d", total_updated)
    logger.info("  Total Rejected:     %d", total_rejected)
    logger.info("  Total Needs Review: %d", total_needs_review)

    if all_errors:
        logger.info("")
        logger.info("  ERRORS / REJECTIONS:")
        for err in all_errors:
            logger.info(
                "    - %s: %s",
                err.get("title", "?"),
                err.get("errors") or err.get("error", "unknown"),
            )

    logger.info("=" * 60)

    if args.dry_run:
        logger.info("(Dry run — no data was written to the database)")


if __name__ == "__main__":
    main()
