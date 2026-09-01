"""
scrapy_project/pipelines/grant_id.py

Computes a deterministic grantId hash for each item (priority 300).

The algorithm MUST match GrantListing.computeGrantId in the Node.js
codebase byte-for-byte:

    normalize(s) = trim → lowercase → collapse whitespace to single space
    key = normalize(agency.name) + "|" + normalize(title) + "|" + normalize(links.infoUrl)
    grantId = sha256(key).hexdigest()

This ensures the same (agency, title, url) always produces the same
grantId regardless of which side (Python scraper or Node.js) computes
it, preventing duplicate documents.
"""

import hashlib
import re


class GrantIdPipeline:
    """Compute and attach the deterministic grantId to each item."""

    def process_item(self, item, spider):
        agency_name = (item.get("agency") or {}).get("name", "")
        title = item.get("title", "")
        info_url = (item.get("links") or {}).get("infoUrl", "")

        item["grantId"] = self.compute_grant_id(agency_name, title, info_url)
        return item

    @staticmethod
    def compute_grant_id(agency_name, title, info_url):
        """
        Python port of GrantListing.computeGrantId — must produce
        identical output for identical inputs.
        """

        def normalize(s):
            s = str(s or "").strip().lower()
            s = re.sub(r"\s+", " ", s)
            return s

        key = "|".join([normalize(agency_name), normalize(title), normalize(info_url)])
        return hashlib.sha256(key.encode("utf-8")).hexdigest()
