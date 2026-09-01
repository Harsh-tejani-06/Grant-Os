"""
scrapy_project/spiders/dbt_spider.py

Spider for the Department of Biotechnology (DBT) and its
sub-bodies (BIRAC, RCB, etc.).

Handles:
  - dbtindia.gov.in — programme/scheme listings
  - birac.nic.in — BIRAC scheme categories
  - dbtepromis.nic.in — e-ProMIS portal
  - rcb.res.in — Regional Centre for Biotechnology
"""

import re
import scrapy
from scrapy_project.items import GrantItem
from scrapy_project.utils.pdf_parser import (
    extract_text_from_pdf,
    is_scanned_pdf,
    parse_grant_fields_from_text,
)

# ─── Grant type mapping for DBT ───
GRANT_TYPE_MAP = [
    (re.compile(r"fellowship|pdf|postdoctoral|jrf|srf|scientist", re.I), "fellowship"),
    (re.compile(r"startup|BIRAC|BIG|BIPP|SPARSH|entrepreneur|incubat|biotech.*ignition", re.I), "startup_funding"),
    (re.compile(r"infra|equipment|facility|centre.*excellence|centre.*innovation", re.I), "institutional_infra"),
    (re.compile(r"facility.*access|shared.*resource|bio.*resource", re.I), "facility_access"),
    (re.compile(r"communication|awareness|outreach|lecture", re.I), "science_communication"),
    (re.compile(r"academic|training|workshop|capacity.*building|star.*college|AIST", re.I), "academic_programme"),
    (re.compile(r"scholarship|student", re.I), "scholarship"),
    (re.compile(r"travel|conference|exchange|mobility", re.I), "travel_grant"),
    (re.compile(r"research|R\s*&\s*D|project|investigation|biotech.*research|autonomous", re.I), "research_grant"),
]


def classify_grant_type(title, category="", description=""):
    combined = f"{title} {category} {description}"
    for pattern, grant_type in GRANT_TYPE_MAP:
        if pattern.search(combined):
            return grant_type
    return "other"


class DbtSpider(scrapy.Spider):
    name = "dbt"
    custom_settings = {
        "DOWNLOAD_DELAY": 2,
    }

    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        spider = super().from_crawler(crawler, *args, **kwargs)
        sources_by_spider = crawler.settings.get("SOURCES_BY_SPIDER", {})
        spider.source_entries = sources_by_spider.get(cls.name, [])
        
        spider.start_urls = []
        spider.url_meta = {}
        for entry in spider.source_entries:
            for url in entry.get("urls", []):
                spider.start_urls.append(url)
                spider.url_meta[url] = {
                    "agency_name": entry.get("agency_name", "Department of Biotechnology"),
                    "implementing_body": entry.get("implementing_body", ""),
                    "extraction_method": entry.get("extraction_method", "html_text"),
                }
        spider.logger.info("Loaded %d start URLs from settings", len(spider.start_urls))
        return spider

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def start_requests(self):
        if not self.start_urls:
            self.logger.warning("No URLs provided for DBT spider")
            return
            
        for url in self.start_urls:
            meta = self.url_meta.get(url, {})
            yield scrapy.Request(
                url=url,
                callback=self.parse,
                meta=meta,
                errback=self.handle_error,
                dont_filter=True
            )

    def parse(self, response):
        """Parse DBT listing pages."""
        # Route PDF responses to the PDF-specific parser
        content_type = response.headers.get(b'Content-Type', b'').decode('utf-8', errors='ignore').lower()
        if 'application/pdf' in content_type or response.url.lower().endswith('.pdf'):
            yield from self.parse_pdf_detail(response)
            return
        if not hasattr(response, 'text'):
            return
            
        agency_name = response.meta.get("agency_name", "Department of Biotechnology")
        implementing_body = response.meta.get("implementing_body", "")
        extraction_method = response.meta.get("extraction_method", "html_text")
        website = self._extract_domain(response.url)

        self.logger.info("Parsing %s (agency=%s, body=%s)", response.url, agency_name, implementing_body)

        # Parse tables if present
        tables = response.css("table")
        if tables:
            yield from self._parse_tables(response, tables, agency_name, implementing_body, website)

        # Look for scheme/programme links to follow
        scheme_links = set()
        for link in response.css("a[href]"):
            href = link.attrib.get("href", "")
            text = (link.css("::text").get() or "").strip()

            if self._is_scheme_link(href, text):
                full_url = response.urljoin(href)
                if full_url not in scheme_links:
                    scheme_links.add(full_url)
                    yield scrapy.Request(
                        url=full_url,
                        callback=self.parse_scheme_detail,
                        meta={
                            "agency_name": agency_name,
                            "implementing_body": implementing_body,
                            "extraction_method": extraction_method,
                            "link_text": text,
                            "website": website,
                        },
                        errback=self.handle_error,
                    )

        # Parse inline cards/listings
        yield from self._parse_cards(response, agency_name, implementing_body, website)

    def parse_scheme_detail(self, response):
        """Extract information from DBT scheme details."""
        # Route PDF responses to the PDF-specific parser
        content_type = response.headers.get(b'Content-Type', b'').decode('utf-8', errors='ignore').lower()
        if 'application/pdf' in content_type or response.url.lower().endswith('.pdf'):
            yield from self.parse_pdf_detail(response)
            return
        if not hasattr(response, 'text'):
            self.logger.warning("Ignored non-text response: %s", response.url)
            return
            
        meta = response.meta
        agency_name = meta.get("agency_name", "Department of Biotechnology")
        implementing_body = meta.get("implementing_body", "")
        website = meta.get("website", self._extract_domain(response.url))

        title = (
            response.css("h1::text").get()
            or response.css("h1 *::text").get()
            or response.css(".page-title::text").get()
            or response.css("title::text").get()
            or meta.get("link_text", "")
        )
        title = (title or "").strip()

        if not title or len(title) < 5 or self._is_non_scheme_page(title):
            return

        # Extract content
        content_area = (
            response.css("article")
            or response.css(".field--name-body")
            or response.css("#content")
            or response.css("main")
        )

        full_text = ""
        if content_area:
            full_text = " ".join(content_area.css("*::text").getall())
        else:
            full_text = " ".join(response.css("body *::text").getall())
        full_text = re.sub(r"\s+", " ", full_text).strip()

        eligibility = self._extract_section(full_text, ["eligibility", "eligible", "who can apply"])
        procedure = self._extract_section(full_text, ["how to apply", "application", "procedure", "submission"])
        deadline_text = self._extract_section(full_text, ["deadline", "last date", "closing date"])
        funding_text = self._extract_section(full_text, ["funding", "grant amount", "financial support", "budget"])
        duration_text = self._extract_section(full_text, ["duration", "tenure", "period"])
        description = self._extract_section(full_text, ["objective", "about", "overview"])

        app_url = ""
        guidelines_url = ""
        for link in response.css("a[href]"):
            href = link.attrib.get("href", "")
            link_text = (link.css("::text").get() or "").lower()
            if any(kw in link_text for kw in ("apply", "application", "portal", "submit")):
                app_url = response.urljoin(href)
            elif any(kw in link_text for kw in ("guideline", "guide", "notification")):
                guidelines_url = response.urljoin(href)

        category_raw = self._extract_category(response)
        grant_type = classify_grant_type(title, category_raw, description or full_text[:500])

        # Detect BIRAC sub-body from URL or content
        if not implementing_body and "birac" in response.url.lower():
            implementing_body = "BIRAC"

        item = GrantItem(
            title=title[:300],
            agency={
                "name": agency_name,
                "implementingBody": implementing_body,
                "parentBody": "Government of India",
            },
            grantType=grant_type,
            categoryRaw=category_raw,
            description=(description or full_text[:500])[:2000],
            eligibilityText=eligibility or "",
            deadline={"rawText": deadline_text or "", "type": "unknown"},
            fundingAmount={"rawText": funding_text or ""},
            duration={"rawText": duration_text or ""},
            applicationProcedure=procedure or "",
            links={
                "infoUrl": response.url,
                "applicationUrl": app_url,
                "guidelinesUrl": guidelines_url,
            },
            status="unknown",
            source={
                "type": "scraped",
                "website": website,
                "extractionMethod": meta.get("extraction_method", "html_text"),
                "scraperVersion": "1.0.0",
            },
            focusAreas=[],
            eligibleApplicantTypes=[],
            rawExtracted={},
        )
        yield item

    def _parse_tables(self, response, tables, agency_name, implementing_body, website):
        for table in tables:
            headers = [
                re.sub(r"\s+", " ", h).strip().lower()
                for h in table.css("th::text, thead td::text").getall()
            ]
            if not headers:
                continue

            col_map = self._map_columns(headers)
            if not col_map.get("title"):
                continue

            rows = table.css("tbody tr, tr:not(:first-child)")
            for row in rows:
                cells = row.css("td")
                if len(cells) < 2:
                    continue

                cell_texts = [
                    re.sub(r"\s+", " ", " ".join(c.css("*::text").getall())).strip()
                    for c in cells
                ]

                title = self._get_cell(cell_texts, col_map.get("title"))
                if not title or len(title) < 5:
                    continue

                info_url = response.url
                title_idx = col_map.get("title")
                if title_idx is not None and title_idx < len(cells):
                    link = cells[title_idx].css("a::attr(href)").get()
                    if link:
                        info_url = response.urljoin(link)

                grant_type = classify_grant_type(
                    title,
                    self._get_cell(cell_texts, col_map.get("category")),
                )

                item = GrantItem(
                    title=title[:300],
                    agency={
                        "name": agency_name,
                        "implementingBody": implementing_body,
                        "parentBody": "Government of India",
                    },
                    grantType=grant_type,
                    categoryRaw=self._get_cell(cell_texts, col_map.get("category")),
                    description="",
                    eligibilityText=self._get_cell(cell_texts, col_map.get("eligibility")),
                    deadline={"rawText": self._get_cell(cell_texts, col_map.get("deadline")), "type": "unknown"},
                    fundingAmount={"rawText": ""},
                    duration={"rawText": ""},
                    applicationProcedure=self._get_cell(cell_texts, col_map.get("procedure")),
                    links={"infoUrl": info_url, "applicationUrl": "", "guidelinesUrl": ""},
                    status="unknown",
                    source={
                        "type": "scraped",
                        "website": website,
                        "extractionMethod": "html_table",
                        "scraperVersion": "1.0.0",
                    },
                    focusAreas=[],
                    eligibleApplicantTypes=[],
                    rawExtracted={},
                )
                yield item

    def _parse_cards(self, response, agency_name, implementing_body, website):
        cards = (
            response.css(".views-row")
            or response.css(".card")
            or response.css("article.node")
            or response.css(".view-content .item-list li")
        )
        for card in cards:
            title_el = card.css("h2 a, h3 a, h4 a, a.title")
            if not title_el:
                title_el = card.css("h2, h3, h4")
            title = (title_el.css("::text").get() or "").strip()
            if not title or len(title) < 5:
                continue

            link = title_el.css("::attr(href)").get()
            info_url = response.urljoin(link) if link else response.url
            summary = " ".join(card.css("p::text, .summary *::text").getall()).strip()
            grant_type = classify_grant_type(title, "", summary)

            item = GrantItem(
                title=title[:300],
                agency={"name": agency_name, "implementingBody": implementing_body, "parentBody": "Government of India"},
                grantType=grant_type,
                categoryRaw="",
                description=summary[:2000] if summary else "",
                eligibilityText="",
                deadline={"rawText": "", "type": "unknown"},
                fundingAmount={"rawText": ""},
                duration={"rawText": ""},
                applicationProcedure="",
                links={"infoUrl": info_url, "applicationUrl": "", "guidelinesUrl": ""},
                status="unknown",
                source={"type": "scraped", "website": website, "extractionMethod": "html_text", "scraperVersion": "1.0.0"},
                focusAreas=[],
                eligibleApplicantTypes=[],
                rawExtracted={},
            )
            yield item

    # ─── Helpers ───

    @staticmethod
    def _extract_domain(url):
        from urllib.parse import urlparse
        return urlparse(url).netloc

    @staticmethod
    def _is_scheme_link(href, text):
        if not href or not text:
            return False
        # note: .pdf is allowed so PDFs are followed
        skip = re.compile(r"(login|register|contact|about-us|privacy|tender|rti|facebook|twitter|#|javascript:|mailto:)", re.I)
        if skip.search(href) or skip.search(text):
            return False
        scheme = re.compile(r"(scheme|programme|program|grant|fellowship|fund|research|project|initiative|BIRAC|BIG|BIPP)", re.I)
        return bool(scheme.search(text) or scheme.search(href))

    @staticmethod
    def _is_non_scheme_page(title):
        # Person names / contact cards — NOT grant schemes
        person_re = re.compile(
            r"^(Dr\.|Prof\.|Shri\s|Smt\.\s|Mr\.\s|Ms\.\s)\s*"
            r"|\(Scientist\b"
            r"|Director\s+General"
            r"|^Secretary\b"
            r"|Staff\s+Directory",
            re.I,
        )
        if person_re.search(title):
            return True

        skip = re.compile(r"(home\s*page|about\s+us|contact|disclaimer|privacy|sitemap|login|gallery|news|tender|recruitment)", re.I)
        return bool(skip.search(title))

    @staticmethod
    def _extract_section(text, keywords):
        if not text:
            return ""
        for kw in keywords:
            pattern = re.compile(rf"(?:^|\.\s+|\n\s*){kw}[:\s\-–]*(.{{20,500}}?)(?:\.\s+[A-Z]|\n|$)", re.I | re.DOTALL)
            match = pattern.search(text)
            if match:
                return re.sub(r"\s+", " ", match.group(1).strip())
        return ""

    @staticmethod
    def _extract_category(response):
        breadcrumbs = response.css(".breadcrumb a::text, .breadcrumb li::text, nav[aria-label='breadcrumb'] a::text").getall()
        if len(breadcrumbs) >= 2:
            return breadcrumbs[-2].strip()
        return ""

    @staticmethod
    def _map_columns(headers):
        col_map = {}
        patterns = {
            "title": re.compile(r"scheme|programme|program|name|title|grant", re.I),
            "category": re.compile(r"category|area|division|sector", re.I),
            "eligibility": re.compile(r"eligib|who\s+can|target", re.I),
            "deadline": re.compile(r"deadline|date|closing", re.I),
            "procedure": re.compile(r"procedure|how\s+to|apply", re.I),
        }
        for idx, header in enumerate(headers):
            for field, pattern in patterns.items():
                if field not in col_map and pattern.search(header):
                    col_map[field] = idx
        return col_map

    @staticmethod
    def _get_cell(cells, index):
        if index is not None and 0 <= index < len(cells):
            return cells[index]
        return ""

    def parse_pdf_detail(self, response):
        """
        Extract grant information from a PDF response.

        Uses the shared pdf_parser module.  Failures are logged as
        warnings and never crash the spider.
        """
        meta = response.meta
        agency_name = meta.get("agency_name", "Department of Biotechnology")
        implementing_body = meta.get("implementing_body", "")
        website = meta.get("website", self._extract_domain(response.url))

        # Detect BIRAC sub-body from URL
        if not implementing_body and "birac" in response.url.lower():
            implementing_body = "BIRAC"

        try:
            text, page_count = extract_text_from_pdf(response.body)

            if not text or is_scanned_pdf(text, page_count):
                self.logger.warning(
                    "Scanned/empty PDF (needs manual review): %s", response.url
                )
                return

            fields = parse_grant_fields_from_text(text)

            title = fields.get("title", "")
            if not title or len(title) < 5:
                title = meta.get("link_text", "")
            if not title or len(title) < 5:
                from urllib.parse import urlparse, unquote
                path = unquote(urlparse(response.url).path)
                title = path.rsplit("/", 1)[-1].replace(".pdf", "").replace("_", " ").replace("-", " ").strip()
            if not title or len(title) < 5:
                self.logger.debug("Could not determine title for PDF: %s", response.url)
                return

            category_raw = ""
            grant_type = classify_grant_type(
                title, category_raw, fields.get("description", "")
            )

            item = GrantItem(
                title=title[:300],
                agency={
                    "name": agency_name,
                    "implementingBody": implementing_body,
                    "parentBody": "Government of India",
                },
                grantType=grant_type,
                categoryRaw=category_raw,
                description=(fields.get("description", "") or text[:500])[:2000],
                eligibilityText=fields.get("eligibility", ""),
                deadline={
                    "rawText": fields.get("deadline", ""),
                    "type": "unknown",
                },
                fundingAmount={
                    "rawText": fields.get("funding_amount", ""),
                },
                duration={
                    "rawText": fields.get("duration", ""),
                },
                applicationProcedure=fields.get("application_procedure", ""),
                links={
                    "infoUrl": response.url,
                    "applicationUrl": "",
                    "guidelinesUrl": "",
                },
                status="unknown",
                source={
                    "type": "scraped",
                    "website": website,
                    "extractionMethod": "pdf_text",
                    "scraperVersion": "1.0.0",
                },
                focusAreas=[],
                eligibleApplicantTypes=[],
                rawExtracted={
                    "pdfPageCount": page_count,
                    "pdfTextLength": len(text),
                },
            )

            self.logger.info("Extracted grant from PDF: %s → %s", response.url, title)
            yield item

        except Exception as exc:
            self.logger.warning(
                "PDF parse failed for %s: %s", response.url, exc
            )

    def handle_error(self, failure):
        self.logger.error("Request failed: %s — %s", failure.request.url, failure.value)
