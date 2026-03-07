"""
Verify uso_service_point data against the Asset Inspection API.
Checks that asset_id, o_asset_id, and location data match.

Usage: python scripts/verify_data.py [--fix]
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


def fetch_api_data(headers, asset_id):
    """Fetch all items for an asset_id from API."""
    r = requests.get(
        f"{API_BASE}/items",
        params={"q": asset_id, "pcode": "36", "page": "1", "page_size": "20", "hide_done": "true"},
        headers=headers,
    )
    r.raise_for_status()
    return r.json()


def main():
    fix_mode = "--fix" in sys.argv

    env_vars = read_env()
    db_url = env_vars.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env")
        sys.exit(1)

    if "ASSET_API_USER" not in os.environ:
        os.environ["ASSET_API_USER"] = env_vars.get("ASSET_API_USER", "")
    if "ASSET_API_PASS" not in os.environ:
        os.environ["ASSET_API_PASS"] = env_vars.get("ASSET_API_PASS", "")

    print("Connecting to database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Get all unique asset_ids with their DB data
    cur.execute("""
        SELECT DISTINCT asset_id, o_asset_id, district, village
        FROM uso_service_point
        WHERE asset_id IS NOT NULL
        ORDER BY asset_id
    """)
    db_rows = cur.fetchall()
    # Deduplicate by asset_id (take first row per asset_id)
    seen = {}
    for row in db_rows:
        aid = row[0]
        if aid not in seen:
            seen[aid] = {"asset_id": aid, "o_asset_id": row[1], "district": row[2], "village": row[3]}
    db_data = list(seen.values())
    print(f"Found {len(db_data)} unique asset_ids in DB")

    print("Logging in to API...")
    headers = login_api()

    valid = []
    not_on_api = []
    o_asset_mismatch = []
    location_mismatch = []
    fixes = []

    for i, sp in enumerate(db_data):
        aid = sp["asset_id"]
        try:
            api = fetch_api_data(headers, aid)
            if api["total"] == 0:
                not_on_api.append(sp)
                print(f"  [{i+1}/{len(db_data)}] {aid} — NOT FOUND on API")
                continue

            api_row = api["rows"][0]
            api_o_asset = api_row.get("o_asset_id")
            api_location = api_row.get("location_text", "")

            issues = []

            # Check o_asset_id match
            db_o = sp["o_asset_id"]
            api_o = api_o_asset if api_o_asset and api_o_asset != "-" else None
            if db_o != api_o:
                issues.append(f"o_asset_id: DB={db_o} vs API={api_o}")
                o_asset_mismatch.append({**sp, "api_o_asset_id": api_o})
                if fix_mode and api_o:
                    fixes.append((api_o, aid))

            # Check location match (district)
            db_district = sp.get("district") or ""
            if db_district and db_district not in api_location:
                issues.append(f"district: DB={db_district} not in API location '{api_location}'")
                location_mismatch.append({**sp, "api_location": api_location})

            if issues:
                print(f"  [{i+1}/{len(db_data)}] {aid} — MISMATCH: {'; '.join(issues)}")
            else:
                valid.append(sp)
                if (i + 1) % 50 == 0:
                    print(f"  [{i+1}/{len(db_data)}] ... {aid} OK")

        except Exception as e:
            print(f"  [{i+1}/{len(db_data)}] {aid} — ERROR: {e}")

        if i < len(db_data) - 1:
            time.sleep(0.15)

    print(f"\n{'='*60}")
    print(f"VERIFICATION REPORT")
    print(f"{'='*60}")
    print(f"Total asset_ids checked: {len(db_data)}")
    print(f"Valid (all match):       {len(valid)}")
    print(f"Not found on API:        {len(not_on_api)}")
    print(f"O Asset ID mismatch:     {len(o_asset_mismatch)}")
    print(f"Location mismatch:       {len(location_mismatch)}")

    if not_on_api:
        print(f"\n--- Not found on API ({len(not_on_api)}) ---")
        for sp in not_on_api[:20]:
            print(f"  {sp['asset_id']} (district={sp['district']}, village={sp['village']})")
        if len(not_on_api) > 20:
            print(f"  ... and {len(not_on_api) - 20} more")

    if o_asset_mismatch:
        print(f"\n--- O Asset ID mismatches ({len(o_asset_mismatch)}) ---")
        for sp in o_asset_mismatch[:20]:
            print(f"  {sp['asset_id']}: DB={sp['o_asset_id']} → API={sp['api_o_asset_id']}")
        if len(o_asset_mismatch) > 20:
            print(f"  ... and {len(o_asset_mismatch) - 20} more")

    if location_mismatch:
        print(f"\n--- Location mismatches ({len(location_mismatch)}) ---")
        for sp in location_mismatch[:20]:
            print(f"  {sp['asset_id']}: DB district={sp['district']}, API location={sp['api_location']}")
        if len(location_mismatch) > 20:
            print(f"  ... and {len(location_mismatch) - 20} more")

    if fix_mode and fixes:
        print(f"\nApplying {len(fixes)} o_asset_id fixes...")
        for o_id, aid in fixes:
            cur.execute("UPDATE uso_service_point SET o_asset_id = %s WHERE asset_id = %s", (o_id, aid))
        conn.commit()
        print("Fixes applied!")
    elif fixes:
        print(f"\n{len(fixes)} o_asset_id fixes available. Run with --fix to apply.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
