"""
Verify asset_id data in Neon DB against the Asset Inspection website API.
For each service point with an asset_id, queries the website to confirm:
1. The asset_id exists on the website
2. The location (village/subdistrict/district) matches

Usage: python scripts/verify_asset_id.py [--sample N]
"""

import os
import sys
import time
from pathlib import Path

import psycopg2
import requests


API_BASE = "http://34.126.174.195:8000/api"
USERNAME = os.environ["ASSET_API_USER"]
PASSWORD = os.environ["ASSET_API_PASS"]


def login():
    """Login and return auth headers."""
    r = requests.post(f"{API_BASE}/auth/login", data={"username": USERNAME, "password": PASSWORD})
    r.raise_for_status()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def search_asset(headers, asset_id):
    """Search for an asset_id on the website. Returns the first matching row or None."""
    r = requests.get(f"{API_BASE}/items", params={"q": asset_id, "hide_done": "true", "page": 1, "page_size": 5}, headers=headers)
    r.raise_for_status()
    data = r.json()
    if data["total"] > 0:
        return data["rows"][0]
    return None


def normalize(s):
    if s is None:
        return ""
    return str(s).strip()


def read_env():
    env_path = Path(__file__).parent.parent / ".env"
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("DATABASE_URL"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("ERROR: DATABASE_URL not found")
    sys.exit(1)


def main():
    sample_n = None
    for i, arg in enumerate(sys.argv):
        if arg == "--sample" and i + 1 < len(sys.argv):
            sample_n = int(sys.argv[i + 1])

    # Login to website
    print("Logging in to Asset Inspection website...")
    headers = login()
    print("Logged in successfully.")

    # Connect to Neon DB
    db_url = read_env()
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Get service points with asset_id
    cur.execute("""
        SELECT id, asset_id, village, subdistrict, district, install_location
        FROM uso_service_point
        WHERE asset_id IS NOT NULL
        ORDER BY id
    """)
    rows = cur.fetchall()
    print(f"\nService points with asset_id in DB: {len(rows)}")

    if sample_n:
        rows = rows[:sample_n]
        print(f"Checking sample of {sample_n} rows...")
    else:
        print(f"Checking all {len(rows)} rows...")

    # Verify each
    found = 0
    not_found = 0
    location_match = 0
    location_mismatch = 0
    errors = []
    mismatches = []

    for i, (sp_id, asset_id, village, subdistrict, district, install_loc) in enumerate(rows):
        try:
            result = search_asset(headers, asset_id)
            if result:
                found += 1
                # Check location match
                web_loc = normalize(result.get("location_text", ""))
                db_district = normalize(district)
                if db_district and db_district in web_loc:
                    location_match += 1
                else:
                    location_mismatch += 1
                    mismatches.append({
                        "sp_id": sp_id,
                        "asset_id": asset_id,
                        "db_district": db_district,
                        "db_village": normalize(village),
                        "web_location": web_loc,
                    })
            else:
                not_found += 1
                errors.append({"sp_id": sp_id, "asset_id": asset_id, "error": "NOT FOUND on website"})

            if (i + 1) % 20 == 0:
                print(f"  Checked {i + 1}/{len(rows)}... (found={found}, not_found={not_found})")

            # Rate limit
            time.sleep(0.1)

        except Exception as e:
            errors.append({"sp_id": sp_id, "asset_id": asset_id, "error": str(e)})

    # Summary
    print(f"\n{'='*60}")
    print(f"VERIFICATION RESULTS")
    print(f"{'='*60}")
    print(f"Total checked: {len(rows)}")
    print(f"Found on website: {found}")
    print(f"NOT found on website: {not_found}")
    print(f"Location district match: {location_match}")
    print(f"Location district mismatch: {location_mismatch}")

    if mismatches:
        print(f"\n--- Location Mismatches (first 10) ---")
        for m in mismatches[:10]:
            print(f"  sp_id={m['sp_id']}, asset_id={m['asset_id']}")
            print(f"    DB: district={m['db_district']}, village={m['db_village']}")
            print(f"    Web: {m['web_location']}")

    if errors:
        print(f"\n--- Errors (first 10) ---")
        for e in errors[:10]:
            print(f"  sp_id={e['sp_id']}, asset_id={e['asset_id']}: {e['error']}")

    accuracy = (location_match / found * 100) if found > 0 else 0
    print(f"\n{'='*60}")
    print(f"ACCURACY: {accuracy:.1f}% location match ({location_match}/{found})")
    print(f"{'='*60}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
