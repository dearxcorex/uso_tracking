"""
Helper functions for bulk photo upload to the Asset Inspection API.
Fetches sub-assets, builds inspection payloads, and tracks upload status.
"""

import os

import requests

API_BASE = "http://34.126.174.195:8000/api"

VALID_STATUSES = {"normal_use", "damaged", "deteriorated", "not_found", "request_disposal"}


def login_api():
    """Login to Asset Inspection API and return auth headers."""
    r = requests.post(
        f"{API_BASE}/auth/login",
        data={"username": os.environ["ASSET_API_USER"], "password": os.environ["ASSET_API_PASS"]},
    )
    r.raise_for_status()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def fetch_sub_assets(headers: dict, asset_id: str) -> list[dict]:
    """Fetch all sub-assets for an asset_id from the external API."""
    r = requests.get(
        f"{API_BASE}/items",
        params={"q": asset_id, "page_size": 100, "hide_done": "false", "pcode": 36},
        headers=headers,
    )
    r.raise_for_status()
    data = r.json()
    return data.get("rows", [])


def build_inspect_payload(
    status: str,
    disposal_reason: str = "",
    address_edit: bool = False,
) -> dict:
    """Build the form data fields for an inspection submission."""
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status: {status}. Must be one of {VALID_STATUSES}")
    return {
        "status": status,
        "disposal_reason": disposal_reason,
        "address_edit_requested": "1" if address_edit else "0",
    }


def submit_inspection(headers: dict, item_id: int, status: str, equip_image: bytes, overall_image: bytes, disposal_reason: str = "") -> bool:
    """Submit inspection with photos for a single item. Returns True on success."""
    payload = build_inspect_payload(status, disposal_reason)
    files = {
        "equip_image": ("equip.jpg", equip_image, "image/jpeg"),
        "overall_image": ("overall.jpg", overall_image, "image/jpeg"),
    }
    r = requests.post(
        f"{API_BASE}/items/{item_id}/inspect",
        data=payload,
        files=files,
        headers=headers,
    )
    return r.status_code == 200


def parse_upload_status(results: list[dict]) -> str:
    """Determine overall upload status from individual results."""
    if not results:
        return "pending"
    successes = sum(1 for r in results if r.get("success"))
    if successes == len(results):
        return "uploaded"
    if successes == 0:
        return "pending"
    return "partial"


def get_pending_points_query() -> dict:
    """Return Prisma-style where clause for pending upload points."""
    return {
        "upload_status": {"in": ["pending", "partial"]},
        "asset_id": {"not": None},
    }
