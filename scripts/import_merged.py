"""
Import merged USO service points from data/merged_update.xlsx into PostgreSQL.
Replaces all existing data with the 492 rows from the merged spreadsheet.
"""

import math
import sys
from pathlib import Path

import pandas as pd
import psycopg2


# Column mapping: Excel column → DB column
COL_MAP = {
    "รหัสหมู่บ้าน": "contract_number",
    "ชื่อบริการ": "service_name",
    "หมู่บ้าน": "village",
    "ตำบล": "subdistrict",
    "อำเภอ": "district",
    "จังหวัด": "province",
    "สถานที่ติดตั้ง": "install_location",
    "ผู้ให้บริการ": "provider",
    "LAT": "latitude",
    "LONG": "longitude",
    "โครงการ": "zone",
}

# Columns that are metadata only (not stored in DB)
SKIP_COLS = {"แหล่งข้อมูล"}


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
    xlsx_path = Path(__file__).parent.parent / "data" / "merged_update.xlsx"
    if not xlsx_path.exists():
        print(f"ERROR: merged_update.xlsx not found at {xlsx_path}")
        sys.exit(1)

    print(f"Loading: {xlsx_path}")
    df = pd.read_excel(xlsx_path, sheet_name=0)  # Sheet1
    print(f"Total rows: {len(df)}")

    # Show available columns for debugging
    print(f"Columns: {list(df.columns)}")

    # Select and rename columns
    available = {c: db for c, db in COL_MAP.items() if c in df.columns}
    missing = set(COL_MAP.keys()) - set(available.keys())
    if missing:
        print(f"WARNING: Missing columns in Excel: {missing}")

    df = df[list(available.keys())].rename(columns=available)

    # Clean: strip whitespace from string columns
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip().replace("nan", None).replace("None", None)

    # Convert contract_number to string (may be numeric in Excel)
    if "contract_number" in df.columns:
        df["contract_number"] = df["contract_number"].astype(str).str.strip().replace("nan", None).replace("None", None)

    # Convert lat/lon to numeric (coerce errors to NaN → None)
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

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
    deleted = cur.rowcount
    print(f"Cleared {deleted} existing rows from uso_service_point.")

    db_cols = list(available.values())
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
        batch = [tuple(r) for r in rows[i : i + batch_size]]
        cur.executemany(insert_sql, batch)
        inserted += len(batch)
        print(f"  Inserted {inserted}/{len(rows)}...")

    conn.commit()
    print(f"\nDone! Inserted {inserted} rows.")

    # Verification
    cur.execute("SELECT COUNT(*) FROM uso_service_point")
    print(f"\n--- Verification ---")
    print(f"Total rows: {cur.fetchone()[0]}")

    cur.execute("SELECT service_name, COUNT(*) FROM uso_service_point GROUP BY service_name ORDER BY COUNT(*) DESC")
    print("Service names:")
    for name, count in cur.fetchall():
        print(f"  {name}: {count}")

    cur.execute("SELECT district, COUNT(*) FROM uso_service_point GROUP BY district ORDER BY district")
    districts = cur.fetchall()
    print(f"Districts ({len(districts)}):")
    for d, c in districts:
        print(f"  {d}: {c}")

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
