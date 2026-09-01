"""
scrapy_project/pipelines/extract_fields.py

Regex-based field extraction pipeline (priority 200).  Parses structured
values out of prose text fields:

  - Funding amounts: ₹ with lakh/crore multipliers, ranges
  - Duration: years/months expressions
  - Deadline type: rolling, annual_pattern, suspended, closed, fixed, etc.
  - Status: active/closed/suspended/unknown from deadline/source wording

Self-reports a `confidenceScore` per item — table-cell extraction scores
higher than regex-from-prose.

IMPORTANT: Never fabricate values.  If a regex doesn't match, leave the
field null/empty and let the GrantListing pre-validate hook flag it via
`missingFields` / `needsReview`.
"""

import re
from datetime import datetime

from scrapy.exceptions import DropItem


# Titles matching these patterns are contact-person entries, not grants
_PERSON_TITLE_RE = re.compile(
    r"^(Dr\.|Prof\.|Shri\s|Smt\.\s|Mr\.\s|Ms\.\s)\s*"
    r"|\(Scientist\b"
    r"|Director\s+General"
    r"|^Secretary\b"
    r"|Staff\s+Directory",
    re.I,
)


class ExtractFieldsPipeline:
    """Extract structured sub-fields from raw text."""

    def process_item(self, item, spider):
        # ─── Reject non-grant entries (safety net) ───
        title = item.get("title", "")
        if title and _PERSON_TITLE_RE.search(title):
            raise DropItem(
                f"Title appears to be a contact person, not a grant: {title}"
            )

        # ─── Funding amount extraction ───
        self._extract_funding(item)

        # ─── Duration extraction ───
        self._extract_duration(item)

        # ─── Deadline type inference ───
        self._extract_deadline_type(item)

        # ─── Status inference ───
        self._infer_status(item)

        # ─── Filter out old/inactive grants ───
        status = item.get("status")
        if status in ("closed", "suspended"):
            raise DropItem(f"Grant is not active (status: {status})")

        deadline = item.get("deadline", {})
        parsed_date_str = deadline.get("parsedDate")
        if parsed_date_str:
            try:
                parsed_date = datetime.fromisoformat(parsed_date_str)
                # If deadline is more than 1 year ago (365 days), drop it
                if (datetime.now() - parsed_date).days > 365:
                    raise DropItem(f"Grant deadline is too old ({parsed_date_str})")
            except ValueError:
                pass

        # ─── Confidence scoring ───
        self._compute_confidence(item)

        return item

    # ─── Funding ──────────────────────────────────────────────────

    # Patterns for Indian currency amounts
    _AMOUNT_RE = re.compile(
        r"₹?\s*([\d,.]+)\s*(lakh|lakhs|lac|crore|crores|cr)\b",
        re.IGNORECASE,
    )
    _AMOUNT_RANGE_RE = re.compile(
        r"₹?\s*([\d,.]+)\s*(lakh|lakhs|lac|crore|crores|cr)?"
        r"\s*(?:to|-|–)\s*"
        r"₹?\s*([\d,.]+)\s*(lakh|lakhs|lac|crore|crores|cr)?",
        re.IGNORECASE,
    )

    @classmethod
    def _parse_inr(cls, amount_str, multiplier_str):
        """Convert a string amount + multiplier to INR number."""
        try:
            amount = float(amount_str.replace(",", ""))
        except (ValueError, AttributeError):
            return None

        if not multiplier_str:
            return amount

        mult = multiplier_str.lower().strip()
        if mult in ("lakh", "lakhs", "lac"):
            return amount * 100_000
        elif mult in ("crore", "crores", "cr"):
            return amount * 10_000_000
        return amount

    def _extract_funding(self, item):
        funding = item.get("fundingAmount", {}) or {}
        raw = funding.get("rawText", "")

        if not raw:
            # Try to extract from applicationProcedure or description
            for field in ("applicationProcedure", "description", "eligibilityText"):
                text = item.get(field, "")
                if text and ("₹" in text or "lakh" in text.lower() or "crore" in text.lower()):
                    raw = text
                    break

        if not raw:
            return

        # Try range first
        range_match = self._AMOUNT_RANGE_RE.search(raw)
        if range_match:
            min_val = self._parse_inr(range_match.group(1), range_match.group(2) or range_match.group(4))
            max_val = self._parse_inr(range_match.group(3), range_match.group(4) or range_match.group(2))
            if min_val is not None and max_val is not None:
                if min_val > max_val:
                    min_val, max_val = max_val, min_val
                funding["minINR"] = min_val
                funding["maxINR"] = max_val
                item["fundingAmount"] = funding
                return

        # Single amount
        match = self._AMOUNT_RE.search(raw)
        if match:
            amount = self._parse_inr(match.group(1), match.group(2))
            if amount is not None:
                # "up to X" → maxINR only; otherwise treat as maxINR too
                if re.search(r"up\s+to|upto|maximum|max", raw, re.IGNORECASE):
                    funding["maxINR"] = amount
                else:
                    funding["maxINR"] = amount
                item["fundingAmount"] = funding

    # ─── Duration ─────────────────────────────────────────────────

    _DURATION_YEAR_RE = re.compile(
        r"(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:year|yr)s?",
        re.IGNORECASE,
    )
    _DURATION_SINGLE_YEAR_RE = re.compile(
        r"(?:up\s+to\s+)?(\d+)\s*(?:year|yr)s?",
        re.IGNORECASE,
    )
    _DURATION_MONTH_RE = re.compile(
        r"(?:up\s+to\s+)?(\d+)\s*month(?:s)?",
        re.IGNORECASE,
    )

    def _extract_duration(self, item):
        duration = item.get("duration", {}) or {}
        raw = duration.get("rawText", "")

        if not raw:
            # Try to extract from applicationProcedure or description
            for field in ("applicationProcedure", "description"):
                text = item.get(field, "")
                if text and re.search(r"\d+\s*(?:year|yr|month)", text, re.IGNORECASE):
                    raw = text
                    break

        if not raw:
            return

        # Try range of years first
        range_match = self._DURATION_YEAR_RE.search(raw)
        if range_match:
            max_years = int(range_match.group(2))
            duration["months"] = max_years * 12
            item["duration"] = duration
            return

        # Single year value
        year_match = self._DURATION_SINGLE_YEAR_RE.search(raw)
        if year_match:
            years = int(year_match.group(1))
            duration["months"] = years * 12
            item["duration"] = duration
            return

        # Month value
        month_match = self._DURATION_MONTH_RE.search(raw)
        if month_match:
            months = int(month_match.group(1))
            duration["months"] = months
            item["duration"] = duration

    # ─── Deadline type ────────────────────────────────────────────

    # Pattern → deadline.type mapping (checked in order)
    _DEADLINE_PATTERNS = [
        (re.compile(r"suspend|frozen|halt|on\s+hold", re.I), "suspended"),
        (re.compile(r"closed\s+cohort|not\s+open|discontinued|no\s+longer", re.I), "closed"),
        (re.compile(r"rolling|round\s+the\s+year|no\s+fixed|any\s+time|continuous", re.I), "rolling"),
        (re.compile(r"annual|every\s+year|yearly|teachers.\s*day|each\s+cycle", re.I), "annual_pattern"),
        (re.compile(r"periodic|irregular|thematic\s+call", re.I), "periodic_irregular"),
    ]

    _DATE_PATTERNS = [
        # DD-MM-YYYY, DD/MM/YYYY
        re.compile(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})"),
        # Month DD, YYYY
        re.compile(
            r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})",
            re.I,
        ),
        # DD Month YYYY
        re.compile(
            r"(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})",
            re.I,
        ),
    ]

    _MONTH_MAP = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }

    def _extract_deadline_type(self, item):
        deadline = item.get("deadline", {}) or {}
        raw = deadline.get("rawText", "")

        if not raw:
            return

        # Check pattern-based type detection
        for pattern, dtype in self._DEADLINE_PATTERNS:
            if pattern.search(raw):
                deadline["type"] = dtype
                item["deadline"] = deadline
                # For suspended/closed, no date to parse
                if dtype in ("suspended", "closed"):
                    return
                break

        # Try to extract a specific date
        parsed_date = self._try_parse_date(raw)
        if parsed_date:
            deadline["parsedDate"] = parsed_date.isoformat()
            if "type" not in deadline or deadline.get("type") == "unknown":
                deadline["type"] = "fixed"
        elif "type" not in deadline:
            deadline["type"] = "unknown"

        item["deadline"] = deadline

    def _try_parse_date(self, text):
        """Try to parse a date from text. Returns datetime or None."""
        for pattern in self._DATE_PATTERNS:
            match = pattern.search(text)
            if not match:
                continue
            groups = match.groups()
            try:
                if len(groups) == 3 and groups[0].isdigit() and groups[1].isdigit():
                    # DD-MM-YYYY or DD/MM/YYYY
                    day, month, year = int(groups[0]), int(groups[1]), int(groups[2])
                    return datetime(year, month, day)
                elif len(groups) == 3 and not groups[0].isdigit():
                    # Month DD, YYYY
                    month = self._MONTH_MAP.get(groups[0][:3].lower())
                    if month:
                        return datetime(int(groups[2]), month, int(groups[1]))
                elif len(groups) == 3 and groups[0].isdigit() and not groups[1].isdigit():
                    # DD Month YYYY
                    month = self._MONTH_MAP.get(groups[1][:3].lower())
                    if month:
                        return datetime(int(groups[2]), month, int(groups[0]))
            except (ValueError, TypeError):
                continue
        return None

    # ─── Status inference ─────────────────────────────────────────

    def _infer_status(self, item):
        """Infer grant status from deadline type and existing status field."""
        if item.get("status") and item["status"] != "unknown":
            return  # Already set by spider, don't override

        deadline = item.get("deadline", {}) or {}
        dtype = deadline.get("type", "")

        if dtype == "suspended":
            item["status"] = "suspended"
        elif dtype == "closed":
            item["status"] = "closed"
        elif dtype in ("rolling", "annual_pattern", "periodic_irregular", "fixed"):
            item["status"] = "active"
        else:
            item["status"] = "unknown"

    # ─── Confidence scoring ───────────────────────────────────────

    def _compute_confidence(self, item):
        """
        Self-report a confidence score based on extraction method and
        data completeness.

        Scoring:
          - Base score from extraction method (table > text)
          - Bonus for more fields filled
          - Penalty for missing critical fields
        """
        source = item.get("source", {}) or {}
        method = source.get("extractionMethod", "html_text")

        # Base score by extraction method
        base_scores = {
            "html_table": 0.85,
            "html_text": 0.65,
            "pdf_table": 0.80,
            "pdf_text": 0.60,
            "manual": 0.95,
        }
        score = base_scores.get(method, 0.50)

        # Check critical field completeness
        critical_fields = [
            item.get("eligibilityText"),
            item.get("applicationProcedure"),
            (item.get("deadline") or {}).get("rawText"),
            (item.get("links") or {}).get("infoUrl"),
        ]
        filled = sum(1 for f in critical_fields if f)
        completeness_bonus = (filled / len(critical_fields)) * 0.15

        score = min(1.0, score + completeness_bonus)

        source["confidenceScore"] = round(score, 2)
        item["source"] = source
