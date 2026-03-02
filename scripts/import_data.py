"""
Import USO service points from data_uso_final.xlsx into PostgreSQL.
Sheet: "ชัยภูมิ"
Deduplicates by `use_at` (install address) → ~501 unique service points.
"""

import math
import re
import sys
from pathlib import Path

import pandas as pd
import psycopg2


def extract_school_name(use_at):
    """Extract school name from use_at field (e.g. '00000748 โรงเรียนโคกม่วงศึกษาชัยภูมิ...' → 'โรงเรียนโคกม่วงศึกษา')"""
    if pd.isna(use_at):
        return None
    s = str(use_at).strip()
    s = re.sub(r"^\d+\s*", "", s)  # strip leading number
    idx = s.find("ชัยภูมิ")
    if idx > 0:
        return s[:idx].strip()
    return s.strip()


def normalize_school(name):
    """Normalize school name for fuzzy matching."""
    n = str(name).strip()
    n = n.replace("รร.", "โรงเรียน")
    n = n.replace("โงเรียน", "โรงเรียน")  # typo fix
    n = re.sub(r"\s*\(.*?\)", "", n)  # remove parenthetical suffixes
    return n


# Manual typo map: school.xlsx normalized name → data_uso_final normalized name
SCHOOL_TYPO_MAP = {
    "โรงเรียนกุดหมากเห็บ": "โรงเรียนบ้านกุดหมากเห็บ",
    "โรงเรียนบ้านกรวดหนองพวง": "โรงเรียนบ้านโคกกรวดหนองพวง",
    "โรงเรียนบ้านหนองตอ": "โรงเรียนบ้านหนอตอ",
    "โรงเรียนบ้านโนนสาธร": "โรงเรียนบ้านโนนสาทร",
    "โรงเรียนบ้านโปงนกพิทยา": "โรงเรียนบ้านโป่งนกพิทยา",
}

# Coordinates from Google Maps for schools not found in school.xlsx
GOOGLE_MAPS_COORDS = {
    "โรงเรียนบ้านซับสีทอง": (16.0954027, 102.0527155),
    "โรงเรียนบ้านซับหมี": (15.4236796, 101.436378),
    "โรงเรียนบ้านดอนเตาเหล็ก": (16.4116782, 102.0283902),
    "โรงเรียนบ้านตลาด": (15.5791565, 101.8192103),
    "โรงเรียนบ้านตาดโตน": (15.876772, 102.0168722),
    "โรงเรียนบ้านนาหนองทุ่ม": (16.0461859, 102.1800124),
    "โรงเรียนบ้านภูดิน มิตรผลอุปถัมภ์": (16.4865579, 102.1279086),
    "โรงเรียนบ้านลาด": (16.4060987, 102.0191068),
    "โรงเรียนบ้านวังเสมา": (15.5613041, 101.8242316),
    "โรงเรียนบ้านสำโรงโคก": (15.5260865, 101.8295175),
    "โรงเรียนบ้านหนองใหญ่": (15.6249512, 101.3986658),
    "โรงเรียนบ้านเดื่อ": (15.5492666, 101.8393263),
    "โรงเรียนบ้านเทพพนาธรรมนิติอุปถัมภ์": (15.6721663, 101.4100175),
    "โรงเรียนบ้านโคกกระเบื้องไห": (15.63741, 101.4202526),
    "โรงเรียนบ้านโนนสำราญ": (15.6023523, 101.4093943),
    "โรงเรียนบ้านโน้นแต้": (15.859801, 102.2981023),
    "โรงเรียนยางนาดี": (15.798278, 101.7942664),
    "โรงเรียนวัดพุทโธวาท": (15.7659391, 101.9990978),
    "โรงเรียนโนนสวรรค์": (15.5935446, 101.4031193),
}


def build_school_coord_lookup(xlsx_path):
    """Build a lookup dict from school.xlsx: normalized_school_name → (lat, lon)."""
    school_xlsx = xlsx_path.parent / "school.xlsx"
    if not school_xlsx.exists():
        print(f"WARNING: school.xlsx not found at {school_xlsx}, skipping coord fill")
        return {}

    df_school = pd.read_excel(school_xlsx, sheet_name="พท. รวมทั้งหมด (ใหม่)")
    df_school = df_school[
        (df_school["จังหวัด"] == "ชัยภูมิ") & (df_school["ชื่อบริการ"] == "Wi-Fi โรงเรียน")
    ]
    print(f"\nLoaded {len(df_school)} Wi-Fi โรงเรียน rows from school.xlsx")

    lookup = {}
    for _, row in df_school.iterrows():
        name = str(row["สถานที่ติดตั้ง"]).strip()
        lat = row[" LAT Master"]
        lon = row[" LONG Maste"]
        if pd.notna(lat) and pd.notna(lon):
            norm = normalize_school(name)
            lookup[norm] = (float(lat), float(lon))
            # Also add typo-mapped keys pointing to same coords
            if norm in SCHOOL_TYPO_MAP:
                lookup[SCHOOL_TYPO_MAP[norm]] = (float(lat), float(lon))

    print(f"Built lookup with {len(lookup)} normalized school names")
    return lookup


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
    xlsx_path = Path(__file__).parent.parent / "data_uso_final.xlsx"
    if not xlsx_path.exists():
        print(f"ERROR: data_uso_final.xlsx not found at {xlsx_path}")
        sys.exit(1)

    print(f"Loading: {xlsx_path}")
    df = pd.read_excel(xlsx_path, sheet_name="ชัยภูมิ")
    print(f"Total equipment rows: {len(df)}")

    # Deduplicate by use_at — keep first row per unique install address
    df = df.drop_duplicates(subset="use_at", keep="first").copy()
    print(f"Unique service points (by use_at): {len(df)}")

    # Column mapping: Excel column → DB column
    col_map = {
        "asset_desc": "service_name",
        "หมู่ที่": "village",
        "ตำบล": "subdistrict",
        "อำเภอ": "district",
        "prov": "province",
        "use_at": "install_location",
        "supplier_name": "provider",
        "ละติจูด": "latitude",
        "ลองติจูด": "longitude",
        "group_desc": "zone",
    }

    # Select and rename columns
    df = df[list(col_map.keys())].rename(columns=col_map)

    # Also use provider as contract_number
    df["contract_number"] = df["provider"]

    # Clean: strip whitespace from string columns
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip().replace("nan", None).replace("None", None)

    # Convert lat/lon to numeric (coerce errors to NaN → None)
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    # Fill blank zone with "Wi-Fi โรงเรียน" for school rows (null lat = school rows)
    mask = df["latitude"].isna()
    df.loc[mask, "zone"] = "Wi-Fi โรงเรียน"

    # Fill village with school name extracted from install_location for school rows
    df.loc[mask, "village"] = df.loc[mask, "install_location"].apply(extract_school_name)
    print(f"Filled {mask.sum()} blank village rows with school names from install_location")

    # Fill lat/long from school.xlsx for rows with null coordinates
    school_lookup = build_school_coord_lookup(xlsx_path)
    if school_lookup:
        filled_xlsx = 0
        filled_gmaps = 0
        still_null = []
        for idx in df[mask].index:
            school_name = extract_school_name(df.at[idx, "install_location"])
            if school_name:
                norm = normalize_school(school_name)
                if norm in school_lookup:
                    lat, lon = school_lookup[norm]
                    df.at[idx, "latitude"] = lat
                    df.at[idx, "longitude"] = lon
                    filled_xlsx += 1
                elif norm in GOOGLE_MAPS_COORDS:
                    lat, lon = GOOGLE_MAPS_COORDS[norm]
                    df.at[idx, "latitude"] = lat
                    df.at[idx, "longitude"] = lon
                    filled_gmaps += 1
                else:
                    still_null.append(school_name)
            else:
                still_null.append(df.at[idx, "install_location"])

        print(f"\n--- School coordinate matching ---")
        print(f"Matched from school.xlsx: {filled_xlsx}/{mask.sum()}")
        print(f"Matched from Google Maps: {filled_gmaps}/{mask.sum()}")
        print(f"Total filled: {filled_xlsx + filled_gmaps}/{mask.sum()}")
        print(f"Still null: {len(still_null)}")
        if still_null:
            print(f"Unmatched schools:")
            for s in sorted(still_null):
                print(f"  - {s}")

    # Save preview
    preview_path = xlsx_path.parent / "preview_import.xlsx"
    db_cols_preview = list(col_map.values()) + ["contract_number"]
    df[db_cols_preview].to_excel(preview_path, index=False)
    print(f"\nSaved preview to {preview_path}")

    # Print stats
    print(f"\nService names: {sorted(df['service_name'].dropna().unique())}")
    print(f"Providers: {sorted(df['provider'].dropna().unique())}")
    print(f"Districts: {sorted(df['district'].dropna().unique())}")
    print(f"Zones: {sorted(df['zone'].dropna().unique())}")
    print(f"Rows with null coords: {df['latitude'].isna().sum()}")

    # Connect and insert
    db_url = read_env()
    print(f"\nConnecting to database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("DELETE FROM uso_service_point")
    print("Cleared existing uso_service_point data.")

    db_cols = list(col_map.values()) + ["contract_number"]
    placeholders = ", ".join(["%s"] * len(db_cols))
    insert_sql = f"INSERT INTO uso_service_point ({', '.join(db_cols)}) VALUES ({placeholders})"

    batch_size = 100
    rows = df[db_cols].values.tolist()
    # Convert NaN/NaT to None for proper SQL NULL insertion
    for row in rows:
        for i, val in enumerate(row):
            if val is None:
                continue
            if isinstance(val, float) and math.isnan(val):
                row[i] = None
            elif pd.isna(val):
                row[i] = None
    inserted = 0

    for i in range(0, len(rows), batch_size):
        batch = [tuple(r) for r in rows[i:i + batch_size]]
        cur.executemany(insert_sql, batch)
        inserted += len(batch)
        print(f"  Inserted {inserted}/{len(rows)}...")

    conn.commit()
    print(f"\nDone! Inserted {inserted} rows.")

    # Verification
    cur.execute("SELECT COUNT(*) FROM uso_service_point")
    print(f"\n--- Verification ---")
    print(f"Total rows: {cur.fetchone()[0]}")

    cur.execute("SELECT DISTINCT district FROM uso_service_point ORDER BY district")
    districts = [r[0] for r in cur.fetchall()]
    print(f"Districts ({len(districts)}): {', '.join(str(d) for d in districts)}")

    cur.execute("SELECT provider, COUNT(*) FROM uso_service_point GROUP BY provider ORDER BY COUNT(*) DESC")
    print("Providers:")
    for p, c in cur.fetchall():
        print(f"  {p}: {c}")

    cur.execute("SELECT zone, COUNT(*) FROM uso_service_point GROUP BY zone ORDER BY zone")
    print("Zones:")
    for z, c in cur.fetchall():
        print(f"  {z}: {c}")

    cur.execute("SELECT COUNT(*) FROM uso_service_point WHERE latitude IS NULL")
    print(f"Rows with null coordinates: {cur.fetchone()[0]}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
