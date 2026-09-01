"""
scrapy_project/pipelines/normalize.py

Text cleanup pipeline stage. Runs first (priority 100) to sanitize raw
scraped text before field extraction.

Operations:
  - HTML entity decoding (e.g. &amp; → &)
  - Unicode normalization (NFKC)
  - Whitespace collapse (multiple spaces/newlines → single space)
  - Strip leading/trailing whitespace on all string fields
  - Remove zero-width characters
"""

import html
import re
import unicodedata


class NormalizePipeline:
    """Clean and normalize text fields in every GrantItem."""

    # Fields that contain plain text and should be normalized
    TEXT_FIELDS = [
        "title",
        "categoryRaw",
        "description",
        "eligibilityText",
        "applicationProcedure",
    ]

    # Sub-document fields with text sub-keys
    SUBTEXT_FIELDS = {
        "deadline": ["rawText"],
        "fundingAmount": ["rawText"],
        "duration": ["rawText"],
    }

    def process_item(self, item, spider):
        # Normalize top-level text fields
        for field in self.TEXT_FIELDS:
            if field in item and item[field]:
                item[field] = self._normalize(item[field])

        # Normalize text within sub-documents
        for parent, keys in self.SUBTEXT_FIELDS.items():
            if parent in item and isinstance(item[parent], dict):
                for key in keys:
                    if key in item[parent] and item[parent][key]:
                        item[parent][key] = self._normalize(item[parent][key])

        # Normalize agency.name and agency.implementingBody
        if "agency" in item and isinstance(item["agency"], dict):
            for key in ["name", "implementingBody", "parentBody"]:
                if key in item["agency"] and item["agency"][key]:
                    item["agency"][key] = self._normalize(item["agency"][key])

        return item

    @staticmethod
    def _normalize(text):
        """Apply all text normalization steps."""
        if not isinstance(text, str):
            return text

        # 1. HTML entity decoding
        text = html.unescape(text)

        # 2. Unicode normalization (NFKC collapses compatibility characters)
        text = unicodedata.normalize("NFKC", text)

        # 3. Remove zero-width characters
        text = re.sub(r"[\u200b\u200c\u200d\ufeff\u00ad]", "", text)

        # 4. Collapse whitespace (spaces, tabs, newlines → single space)
        text = re.sub(r"\s+", " ", text)

        # 5. Strip
        text = text.strip()

        return text
