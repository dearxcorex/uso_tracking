"""
Fetch o_asset_id from the Asset Inspection API for each unique asset_id
in the Neon DB and update the uso_service_point table.

Usage: python scripts/populate_o_asset_id.py [--dry-run]
"""

import os
import sys
import time
from pathlib import Path

import psycopg2
import requests

API_BASE = "http://34.126.174.195:8000/api"


def read_env():
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        print(f"ERROR: .env file not found at {env_path}")
        sys.exit(1)
    env_vars = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars


def login_api():
    r = requests.post(
        f"{API_BASE}/auth/login",
        data={"username": os.environ["ASSET_API_USER"], "password": os.environ["ASSET_API_PASS"]},
    )
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def fetch_o_asset_id(headers, asset_id):
    """Fetch o_asset_id for a given asset_id from the API. Returns string or None."""
    r = requests.get(
        f"{API_BASE}/items",
        params={"q": asset_id, "pcode": "36", "page": "1", "page_size": "5", "hide_done": "true"},
        headers=headers,
    )
    r.raise_for_status()
    data = r.json()
    if data["total"] == 0:
        return None
    row = data["rows"][0]
    o_id = row.get("o_asset_id")
    # Website shows "-" for empty values
    if o_id and o_id != "-" and str(o_id).strip():
        return str(o_id).strip()
    return None


def main():
    dry_run = "--dry-run" in sys.argv

    env_vars = read_env()
    db_url = env_vars.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env")
        sys.exit(1)

    # Set API credentials from .env if not already in environment
    if "ASSET_API_USER" not in os.environ:
        os.environ["ASSET_API_USER"] = env_vars.get("ASSET_API_USER", "")
    if "ASSET_API_PASS" not in os.environ:
        os.environ["ASSET_API_PASS"] = env_vars.get("ASSET_API_PASS", "")

    print("Connecting to database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("SELECT DISTINCT asset_id FROM uso_service_point WHERE asset_id IS NOT NULL ORDER BY asset_id")
    asset_ids = [row[0] for row in cur.fetchall()]
    print(f"Found {len(asset_ids)} unique asset_ids in DB")

    print("Logging in to API...")
    headers = login_api()

    updates = []
    not_found = []
    no_o_asset = []
    errors = []

    for i, aid in enumerate(asset_ids):
        try:
            o_id = fetch_o_asset_id(headers, aid)
            if o_id:
                updates.append((o_id, aid))
            else:
                no_o_asset.append(aid)
            status = f"o_asset_id={o_id}" if o_id else "no o_asset_id"
            print(f"  [{i+1}/{len(asset_ids)}] {aid} → {status}")
        except requests.exceptions.HTTPError as e:
            if e.response and e.response.status_code == 404:
                not_found.append(aid)
                print(f"  [{i+1}/{len(asset_ids)}] {aid} → NOT FOUND on API")
            else:
                errors.append((aid, str(e)))
                print(f"  [{i+1}/{len(asset_ids)}] {aid} → ERROR: {e}")
        except Exception as e:
            errors.append((aid, str(e)))
            print(f"  [{i+1}/{len(asset_ids)}] {aid} → ERROR: {e}")

        # Throttle
        if i < len(asset_ids) - 1:
            time.sleep(0.2)

    print(f"\n--- Summary ---")
    print(f"Total asset_ids: {len(asset_ids)}")
    print(f"With o_asset_id: {len(updates)}")
    print(f"No o_asset_id (API returns '-'): {len(no_o_asset)}")
    print(f"Not found on API: {len(not_found)}")
    print(f"Errors: {len(errors)}")

    if dry_run:
        print(f"\n[DRY RUN] Would update {len(updates)} asset_ids. No changes made.")
        if updates:
            print("Sample updates (first 10):")
            for o_id, aid in updates[:10]:
                print(f"  asset_id={aid} → o_asset_id={o_id}")
    else:
        # Reconnect in case connection timed out during long fetch
        cur.close()
        conn.close()
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        print(f"\nUpdating {len(updates)} asset_ids in DB...")
        for o_id, aid in updates:
            cur.execute(
                "UPDATE uso_service_point SET o_asset_id = %s WHERE asset_id = %s",
                (o_id, aid),
            )
        conn.commit()
        print("Done!")

        cur.execute("SELECT COUNT(*) FROM uso_service_point WHERE o_asset_id IS NOT NULL")
        filled = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM uso_service_point WHERE o_asset_id IS NULL AND asset_id IS NOT NULL")
        null_count = cur.fetchone()[0]
        print(f"\n--- Verification ---")
        print(f"Rows with o_asset_id: {filled}")
        print(f"Rows with asset_id but no o_asset_id: {null_count}")

    if not_found:
        print(f"\n--- Asset IDs not found on API ({len(not_found)}) ---")
        for aid in not_found:
            print(f"  {aid}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
