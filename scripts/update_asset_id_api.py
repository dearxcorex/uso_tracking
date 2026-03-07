"""
Update unmatched uso_service_point rows with asset_id by searching the
Asset Inspection website API. Uses village name + district/subdistrict
verification to ensure correct matches.

Usage: python scripts/update_asset_id_api.py [--dry-run]
"""

import sys
import time
from pathlib import Path

import psycopg2

from update_asset_id import (
    extract_village_name,
    login_api,
    read_env,
    search_asset_api,
)


def main():
    dry_run = "--dry-run" in sys.argv

    # Login to website API
    print("Logging in to Asset Inspection API...")
    headers = login_api()
    print("Logged in.")

    # Connect to DB
    db_url = read_env()
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Get unmatched rows
    cur.execute("""
        SELECT id, service_name, village, subdistrict, district, install_location
        FROM uso_service_point
        WHERE asset_id IS NULL
        ORDER BY id
    """)
    rows = cur.fetchall()
    print(f"Unmatched service points: {len(rows)}")
    print()

    matched = 0
    not_found = 0
    updates = []

    for i, (sp_id, svc, village, sub, dist, loc) in enumerate(rows):
        # Extract search term from village or install_location
        search = extract_village_name(village)
        if not search and loc:
            search = str(loc).strip()

        if not search:
            not_found += 1
            continue

        # Search API with district verification
        asset_id = search_asset_api(headers, search, dist, sub)

        if asset_id:
            matched += 1
            updates.append((asset_id, sp_id))
        else:
            not_found += 1

        if (i + 1) % 20 == 0:
            print(f"  Checked {i + 1}/{len(rows)}... (matched={matched}, not_found={not_found})")

        time.sleep(0.12)

    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")
    print(f"Matched via API: {matched}/{len(rows)}")
    print(f"Not found: {not_found}/{len(rows)}")

    if dry_run:
        print(f"\n[DRY RUN] Would update {len(updates)} rows.")
        for asset_id, sp_id in updates[:10]:
            print(f"  sp_id={sp_id} → asset_id={asset_id}")
        if len(updates) > 10:
            print(f"  ... and {len(updates) - 10} more")
    else:
        # Reconnect in case connection timed out during API calls
        cur.close()
        conn.close()
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        print(f"\nApplying {len(updates)} updates...")
        for asset_id, sp_id in updates:
            cur.execute("UPDATE uso_service_point SET asset_id = %s WHERE id = %s", (str(asset_id), sp_id))
        conn.commit()
        print("Done!")

    # Reconnect for final status check
    try:
        cur.execute("SELECT 1")
    except Exception:
        cur.close()
        conn.close()
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM uso_service_point WHERE asset_id IS NOT NULL")
    filled = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM uso_service_point WHERE asset_id IS NULL")
    null_count = cur.fetchone()[0]
    print(f"\n--- DB Status ---")
    print(f"Rows with asset_id: {filled}")
    print(f"Rows without asset_id: {null_count}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
