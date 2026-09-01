"""
scrapy_project/pipelines/ingest.py

Final pipeline stage (priority 400). POSTs each normalized, ID'd item
to the Node.js internal ingest endpoint:

    POST /api/internal/grants/ingest
    Authorization: Bearer <INTERNAL_SCRAPER_TOKEN>

Collects per-run statistics (inserted/updated/rejected/needsReview)
for the end-of-run summary printed by run_pipeline.py.

In dry-run mode (spider.settings.getbool('DRY_RUN')), logs what it
*would* POST without touching the database.
"""

import json
import logging
import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

logger = logging.getLogger(__name__)


class IngestPipeline:
    """POST items to the Node.js ingest endpoint."""

    def __init__(self):
        self.token = None
        self.endpoint = None
        self.dry_run = False
        self.stats = {
            "inserted": 0,
            "updated": 0,
            "rejected": 0,
            "needs_review": 0,
            "errors": [],
        }

    def open_spider(self, spider):
        self.token = os.environ.get("INTERNAL_SCRAPER_TOKEN", "")
        self.endpoint = spider.settings.get(
            "INGEST_ENDPOINT",
            "http://localhost:5000/api/internal/grants/ingest",
        )
        self.dry_run = spider.settings.getbool("DRY_RUN", False)

        if not self.token and not self.dry_run:
            logger.warning(
                "INTERNAL_SCRAPER_TOKEN not set — ingest will fail. "
                "Set it in .env or use --dry-run."
            )

    def process_item(self, item, spider):
        payload = self._item_to_dict(item)

        if self.dry_run:
            logger.info(
                "[DRY RUN] Would ingest: %s (grantId=%s)",
                payload.get("title", "?"),
                payload.get("grantId", "?"),
            )
            return item

        try:
            response = self._post(payload)
            status = response.get("status", "unknown")

            if status == "inserted":
                self.stats["inserted"] += 1
                logger.info("Inserted: %s", payload.get("title"))
            elif status == "updated":
                self.stats["updated"] += 1
                logger.info("Updated: %s", payload.get("title"))
            elif status == "rejected":
                self.stats["rejected"] += 1
                errors = response.get("errors", [])
                self.stats["errors"].append(
                    {"title": payload.get("title"), "errors": errors}
                )
                logger.warning("Rejected: %s — %s", payload.get("title"), errors)

            if response.get("needsReview"):
                self.stats["needs_review"] += 1

        except Exception as e:
            self.stats["rejected"] += 1
            self.stats["errors"].append(
                {"title": payload.get("title"), "error": str(e)}
            )
            logger.error("Ingest failed for %s: %s", payload.get("title"), e)

        return item

    def close_spider(self, spider):
        """Log end-of-run summary. Stored in spider for run_pipeline.py to access."""
        spider.ingest_stats = self.stats
        logger.info("=" * 60)
        logger.info("INGEST SUMMARY")
        logger.info("  Inserted:     %d", self.stats["inserted"])
        logger.info("  Updated:      %d", self.stats["updated"])
        logger.info("  Rejected:     %d", self.stats["rejected"])
        logger.info("  Needs Review: %d", self.stats["needs_review"])
        if self.stats["errors"]:
            logger.info("  Errors:")
            for err in self.stats["errors"]:
                logger.info("    - %s: %s", err.get("title", "?"), err.get("errors") or err.get("error"))
        logger.info("=" * 60)

    def _post(self, payload):
        """POST JSON to the ingest endpoint and return parsed response."""
        data = json.dumps(payload, default=str).encode("utf-8")
        req = Request(
            self.endpoint,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                raise RuntimeError(f"HTTP {e.code}: {body}")
        except URLError as e:
            raise RuntimeError(f"Connection error: {e.reason}")

    @staticmethod
    def _item_to_dict(item):
        """Convert a Scrapy Item to a plain dict for JSON serialization."""
        d = dict(item)
        # Ensure nested dicts are plain dicts, not Scrapy Field objects
        for key in ("agency", "deadline", "fundingAmount", "duration", "links", "source"):
            if key in d and hasattr(d[key], "items"):
                d[key] = dict(d[key])
        return d
