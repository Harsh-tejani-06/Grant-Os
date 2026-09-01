"""
scrapy_project/utils/pdf_parser.py

Shared PDF text-extraction and field-parsing utilities.

All spiders delegate PDF handling to this module so the logic
lives in one place and stays consistent across DST / DBT / AICTE / UGC.

Uses `pdfplumber` for text extraction (already in requirements.txt).
"""

import io
import logging
import re
from typing import Tuple, Dict

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────
# 1.  Low-level PDF text extraction
# ──────────────────────────────────────────────────────────────────

def extract_text_from_pdf(raw_bytes: bytes) -> Tuple[str, int]:
    """
    Extract text from a PDF given its raw binary content.

    Returns
    -------
    (text, page_count) : tuple[str, int]
        Full text joined across all pages, and the number of pages.
        On failure returns ("", 0).
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber is not installed — cannot parse PDFs")
        return ("", 0)

    try:
        pdf_file = io.BytesIO(raw_bytes)
        with pdfplumber.open(pdf_file) as pdf:
            page_count = len(pdf.pages)
            page_texts = []
            for page in pdf.pages:
                text = page.extract_text() or ""
                page_texts.append(text)
            full_text = "\n".join(page_texts)
            return (full_text.strip(), page_count)
    except Exception as exc:
        logger.warning("pdfplumber failed to read PDF: %s", exc)
        return ("", 0)


# ──────────────────────────────────────────────────────────────────
# 2.  Scanned-PDF detector
# ──────────────────────────────────────────────────────────────────

def is_scanned_pdf(text: str, page_count: int) -> bool:
    """
    Heuristic: if the average number of characters per page is very
    low (<50), the PDF is most likely a scanned image with no
    embedded text — OCR would be required.
    """
    if page_count == 0:
        return True
    avg_chars = len(text) / page_count
    return avg_chars < 50


# ──────────────────────────────────────────────────────────────────
# 3.  Regex-based field extraction from raw PDF text
# ──────────────────────────────────────────────────────────────────

# Section-header patterns — we look for a heading keyword and capture
# the text that follows it until the next heading or end of text.
_SECTION_KEYWORDS: Dict[str, list] = {
    "title": [],  # handled separately (first prominent line)
    "eligibility": [
        r"eligibility",
        r"eligible",
        r"who\s+can\s+apply",
        r"applicant\s+criteria",
    ],
    "deadline": [
        r"deadline",
        r"last\s+date",
        r"closing\s+date",
        r"submission\s+date",
        r"important\s+dates?",
    ],
    "funding_amount": [
        r"funding",
        r"grant\s+amount",
        r"financial\s+support",
        r"budget",
        r"fellowship\s+amount",
        r"amount\s+of\s+grant",
    ],
    "duration": [
        r"duration",
        r"tenure",
        r"project\s+duration",
        r"period\s+of\s+support",
    ],
    "description": [
        r"objective",
        r"about",
        r"overview",
        r"introduction",
        r"description",
        r"preamble",
    ],
    "application_procedure": [
        r"how\s+to\s+apply",
        r"application\s+procedure",
        r"procedure\s+for\s+application",
        r"submission\s+process",
        r"application\s+process",
        r"mode\s+of\s+application",
    ],
}


def _extract_section(text: str, keywords: list) -> str:
    """
    Search for a section header matching one of *keywords* and return
    the paragraph that follows (up to ~500 chars or the next header).
    """
    if not text:
        return ""

    for kw in keywords:
        pattern = re.compile(
            rf"(?:^|\n)\s*(?:\d+[\.\)]\s*)?{kw}\s*[:\-–—]?\s*\n?(.{{20,600}}?)(?=\n\s*(?:\d+[\.\)]\s*)?[A-Z][a-z]{{3,}}|\n\s*$|\Z)",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(text)
        if match:
            section = re.sub(r"\s+", " ", match.group(1)).strip()
            return section

    return ""


def _extract_title(text: str) -> str:
    """
    Attempt to extract a grant/scheme title from the first few lines
    of the PDF text.

    Heuristics:
      1. Look for explicit "Subject:" or "Title:" labels.
      2. Pick the first non-trivial line (>10 chars, <200 chars) that
         looks like a heading (no trailing period, not just a date).
    """
    if not text:
        return ""

    # Strategy 1: explicit label
    label_re = re.compile(
        r"(?:subject|title|name\s+of\s+(?:scheme|grant|programme))\s*[:\-–]\s*(.+)",
        re.IGNORECASE,
    )
    match = label_re.search(text[:2000])
    if match:
        title = match.group(1).strip()
        # Take only the first line of the match
        title = title.split("\n")[0].strip()
        if len(title) >= 10:
            return title[:300]

    # Strategy 2: first prominent non-trivial line
    lines = text[:3000].split("\n")
    for line in lines:
        line = line.strip()
        # Skip very short, very long, date-only, or boilerplate lines
        if len(line) < 10 or len(line) > 200:
            continue
        if re.match(r"^(page\s+\d|government\s+of|ministry\s+of|department\s+of|office\s+of|no\.\s)", line, re.I):
            continue
        if re.match(r"^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$", line):
            continue
        # Good candidate
        return line[:300]

    return ""


def parse_grant_fields_from_text(text: str) -> dict:
    """
    Parse structured grant fields from raw PDF text using regexes.

    Returns a dict with keys matching GrantItem field names.
    Missing fields are returned as empty strings.
    """
    if not text:
        return {
            "title": "",
            "description": "",
            "eligibility": "",
            "deadline": "",
            "funding_amount": "",
            "duration": "",
            "application_procedure": "",
        }

    title = _extract_title(text)
    description = _extract_section(text, _SECTION_KEYWORDS["description"])
    eligibility = _extract_section(text, _SECTION_KEYWORDS["eligibility"])
    deadline = _extract_section(text, _SECTION_KEYWORDS["deadline"])
    funding_amount = _extract_section(text, _SECTION_KEYWORDS["funding_amount"])
    duration = _extract_section(text, _SECTION_KEYWORDS["duration"])
    application_procedure = _extract_section(text, _SECTION_KEYWORDS["application_procedure"])

    # If no description was found via heading, use the first ~500 chars
    # after the title as a fallback description.
    if not description:
        title_end = text.find(title) + len(title) if title else 0
        remaining = text[title_end:title_end + 600].strip()
        if len(remaining) > 30:
            description = re.sub(r"\s+", " ", remaining)[:500]

    return {
        "title": title,
        "description": description,
        "eligibility": eligibility,
        "deadline": deadline,
        "funding_amount": funding_amount,
        "duration": duration,
        "application_procedure": application_procedure,
    }
