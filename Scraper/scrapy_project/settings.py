# Scrapy settings for the GrantOS scraping pipeline
#
# These are government sites — be respectful: obey robots.txt,
# throttle requests, and identify ourselves clearly.

BOT_NAME = "grantos_scraper"

SPIDER_MODULES = ["scrapy_project.spiders"]
NEWSPIDER_MODULE = "scrapy_project.spiders"

# ─── Responsible crawling ───
# ROBOTSTXT_OBEY = True   #Originally 
ROBOTSTXT_OBEY = False
DOWNLOAD_DELAY = 2  # seconds between requests to the same domain
CONCURRENT_REQUESTS = 4  # max parallel requests (low for gov sites)
CONCURRENT_REQUESTS_PER_DOMAIN = 2

# AutoThrottle adapts delay based on server response times
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0
AUTOTHROTTLE_DEBUG = False

# ─── Identity ───
USER_AGENT = "GrantOS-Scraper/1.0 (+https://grantos.in; grant-discovery-pipeline)"

# ─── Pipelines (order matters) ───
ITEM_PIPELINES = {
    "scrapy_project.pipelines.normalize.NormalizePipeline": 100,
    "scrapy_project.pipelines.extract_fields.ExtractFieldsPipeline": 200,
    "scrapy_project.pipelines.grant_id.GrantIdPipeline": 300,
    "scrapy_project.pipelines.ingest.IngestPipeline": 400,
}

# ─── Logging ───
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

# ─── Request settings ───
DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.7",
    "Accept-Language": "en",
}

# Allow downloading larger files (PDFs can be several MB)
DOWNLOAD_WARNSIZE = 10 * 1024 * 1024  # 10 MB

# Retry on common transient errors
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# ─── Custom settings (used by pipelines) ───
# These are read from environment variables at runtime
INGEST_ENDPOINT = "http://localhost:5000/api/internal/grants/ingest"
DELIST_ENDPOINT = "http://localhost:5000/api/internal/grants/delist"
