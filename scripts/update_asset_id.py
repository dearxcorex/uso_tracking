"""
Update uso_service_point rows with asset_id from data/ass_id.xlsx.
Matches by lat/lon nearest-neighbor within a threshold.
Picks the first asset_id per unique location (use_at).

Usage: python scripts/update_asset_id.py [--dry-run] [--threshold 1000]
"""

import math
import os
import re
import sys
from pathlib import Path

import pandas as pd
import psycopg2
import requests


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two lat/lon points using Haversine formula."""
    if lat1 == lat2 and lon1 == lon2:
        return 0.0
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def extract_location_code(use_at):
    """Extract leading numeric code from use_at field, stripping leading zeros."""
    if use_at is None:
        return None
    if isinstance(use_at, float) and math.isnan(use_at):
        return None
    s = str(use_at).strip()
    m = re.match(r"^0*(\d+)", s)
    if m:
        return m.group(1)
    return None


def find_nearest_match(db_row, ass_rows, threshold_m=1000):
    """Find the nearest asset row for a DB service point by lat/lon.
    Returns the matching ass_row dict or None if no match within threshold.
    """
    lat = db_row.get("lat")
    lon = db_row.get("lon")
    if lat is None or lon is None:
        return None
    if not ass_rows:
        return None

    best = None
    best_dist = float("inf")
    for row in ass_rows:
        rlat, rlon = row.get("lat"), row.get("lon")
        if rlat is None or rlon is None:
            continue
        dist = haversine_distance(lat, lon, rlat, rlon)
        if dist < best_dist:
            best_dist = dist
            best = row

    if best is not None and best_dist <= threshold_m:
        return best
    return None


def extract_village_name(village):
    """Extract the village name from a field like 'หมู่ 7 หนองเมย'."""
    if village is None or str(village).strip() == "":
        return None
    s = str(village).strip()
    m = re.search(r"หมู่\s*\d+\s*(.*)", s)
    if m and m.group(1).strip():
        return m.group(1).strip()
    return s


def filter_api_results_by_location(api_rows, district, subdistrict):
    """Filter API result rows to those matching district (and subdistrict if given).
    Falls back to district-only match if no district+subdistrict match found.
    """
    if not api_rows:
        return []

    # Try district + subdistrict match first
    if subdistrict:
        strict = []
        for row in api_rows:
            loc = row.get("location_text") or ""
            if district and district in loc and subdistrict in loc:
                strict.append(row)
        if strict:
            return strict

    # Fallback: district-only match
    district_only = []
    for row in api_rows:
        loc = row.get("location_text") or ""
        if district and district in loc:
            district_only.append(row)
    return district_only


API_BASE = "http://34.126.174.195:8000/api"


def search_asset_api(headers, search_term, district, subdistrict):
    """Search the Asset Inspection API for an asset by village name,
    then filter by district+subdistrict. Returns asset_id string or None.
    """
    r = requests.get(
        f"{API_BASE}/items",
        params={"q": search_term, "pcode": 36, "hide_done": "true", "page": 1, "page_size": 20},
        headers=headers,
    )
    r.raise_for_status()
    data = r.json()

    if data["total"] == 0:
        return None

    candidates = filter_api_results_by_location(data["rows"], district, subdistrict)
    if candidates:
        return candidates[0]["asset_id"]
    return None


def login_api():
    """Login to Asset Inspection API and return auth headers."""
    r = requests.post(
        f"{API_BASE}/auth/login",
        data={"username": os.environ["ASSET_API_USER"], "password": os.environ["ASSET_API_PASS"]},
    )
    r.raise_for_status()
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def load_asset_data(xlsx_path):
    """Load ass_id.xlsx, deduplicate by use_at, return list of dicts with asset_id, lat, lon, use_at."""
    df = pd.read_excel(xlsx_path, sheet_name=0)
    # Keep first asset_id per location
    df_dedup = df.drop_duplicates(subset="use_at", keep="first").copy()

    rows = []
    for _, r in df_dedup.iterrows():
        lat = r["ละติจูด"] if pd.notna(r["ละติจูด"]) else None
        lon = r["ลองติจูด"] if pd.notna(r["ลองติจูด"]) else None
        rows.append({
            "asset_id": str(int(r["asset_id"])),
            "lat": float(lat) if lat is not None else None,
            "lon": float(lon) if lon is not None else None,
            "use_at": str(r["use_at"]),
        })
    return rows


def load_db_service_points(cur):
    """Load all service points from DB. Returns list of dicts."""
    cur.execute("SELECT id, latitude, longitude, install_location, district, subdistrict, village FROM uso_service_point")
    cols = ["id", "lat", "lon", "install_location", "district", "subdistrict", "village"]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def read_env():
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        print(f"ERROR: .env file not found at {env_path}")
        sys.exit(1)
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("DATABASE_URL"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("ERROR: DATABASE_URL not found in .env")
    sys.exit(1)


def main():
    dry_run = "--dry-run" in sys.argv
    threshold = 1000  # meters
    for i, arg in enumerate(sys.argv):
        if arg == "--threshold" and i + 1 < len(sys.argv):
            threshold = int(sys.argv[i + 1])

    xlsx_path = Path(__file__).parent.parent / "data" / "ass_id.xlsx"
    if not xlsx_path.exists():
        print(f"ERROR: ass_id.xlsx not found at {xlsx_path}")
        sys.exit(1)

    print(f"Loading asset data from {xlsx_path}...")
    ass_rows = load_asset_data(xlsx_path)
    print(f"Loaded {len(ass_rows)} unique locations from ass_id.xlsx")

    db_url = read_env()
    print(f"Connecting to database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    db_points = load_db_service_points(cur)
    print(f"Loaded {len(db_points)} service points from DB")
    print(f"Matching threshold: {threshold}m")
    print()

    matched = 0
    unmatched = 0
    updates = []

    for sp in db_points:
        result = find_nearest_match(sp, ass_rows, threshold_m=threshold)
        if result:
            matched += 1
            updates.append((result["asset_id"], sp["id"]))
        else:
            unmatched += 1

    print(f"--- Results ---")
    print(f"Matched: {matched}/{len(db_points)}")
    print(f"Unmatched: {unmatched}/{len(db_points)}")

    if dry_run:
        print(f"\n[DRY RUN] Would update {len(updates)} rows. No changes made.")
        print("Sample updates (first 10):")
        for asset_id, sp_id in updates[:10]:
            print(f"  service_point id={sp_id} → asset_id={asset_id}")
    else:
        print(f"\nUpdating {len(updates)} rows...")
        for asset_id, sp_id in updates:
            cur.execute("UPDATE uso_service_point SET asset_id = %s WHERE id = %s", (asset_id, sp_id))
        conn.commit()
        print("Done!")

        # Verification
        cur.execute("SELECT COUNT(*) FROM uso_service_point WHERE asset_id IS NOT NULL")
        filled = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM uso_service_point WHERE asset_id IS NULL")
        null_count = cur.fetchone()[0]
        print(f"\n--- Verification ---")
        print(f"Rows with asset_id: {filled}")
        print(f"Rows without asset_id: {null_count}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
