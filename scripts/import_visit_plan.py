"""
Import the reviewed visit plan (data/merged_departments.xlsx, sheet "visit_plan") into PostgreSQL.

- One visit_plan row per Excel row (round x department x site)
- phone_note is review-only and is not loaded

Truncates visit_plan first, so the script is safe to re-run. Inspection status (inspected,
inspected_at) set from the app is carried over by (round, department, service_name, village_code).
Run: .venv/bin/python scripts/import_visit_plan.py
"""

import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).parent.parent
XLSX_PATH = ROOT / "data" / "merged_departments.xlsx"
SHEET = "visit_plan"

TEXT_COLUMNS = [
    "round", "department", "service_type", "service_name", "village_code", "village", "subdistrict",
    "district", "province", "install_location", "provider", "project", "phone", "phone_source",
]
COLUMNS = TEXT_COLUMNS + ["dept_seq", "latitude", "longitude"]


def read_database_url():
    env_path = ROOT / ".env"
    if not env_path.exists():
        sys.exit(f"ERROR: .env not found at {env_path}")
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line.startswith("DATABASE_URL"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ERROR: DATABASE_URL not found in .env")


def clean(val):
    """Normalize a cell to a stripped string or None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s or None


def number(val, cast):
    return None if pd.isna(val) else cast(val)


def main():
    df = pd.read_excel(XLSX_PATH, sheet_name=SHEET, dtype={c: str for c in TEXT_COLUMNS})
    rows = [
        tuple(clean(r[c]) for c in TEXT_COLUMNS)
        + (number(r["dept_seq"], int), number(r["latitude"], float), number(r["longitude"], float))
        for _, r in df.iterrows()
    ]

    conn = psycopg2.connect(read_database_url())
    with conn, conn.cursor() as cur:
        cur.execute(
            "CREATE TEMP TABLE kept_status ON COMMIT DROP AS "
            "SELECT round, department, service_name, village_code, inspected_at FROM visit_plan WHERE inspected"
        )
        cur.execute("TRUNCATE visit_plan RESTART IDENTITY")
        execute_values(cur, f"INSERT INTO visit_plan ({', '.join(COLUMNS)}) VALUES %s", rows)
        # IS NOT DISTINCT FROM so a blank village_code still matches (NULL = NULL is never true)
        cur.execute(
            "UPDATE visit_plan v SET inspected = true, inspected_at = k.inspected_at FROM kept_status k "
            "WHERE (v.round, v.department, v.service_name, v.village_code) IS NOT DISTINCT FROM "
            "(k.round, k.department, k.service_name, k.village_code)"
        )
        kept = cur.rowcount
        cur.execute("SELECT round, department, count(*), count(phone) FROM visit_plan GROUP BY 1, 2 ORDER BY 1, 2")
        summary = cur.fetchall()
    conn.close()

    print(f"Imported {len(rows)} rows into visit_plan ({kept} inspection statuses kept)")
    for round_name, department, n, phones in summary:
        print(f"  {round_name} {department}: {n} rows, {phones} with phone")


if __name__ == "__main__":
    main()
