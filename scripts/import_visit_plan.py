"""
Import the USO Net phase 2 visit plan from the department Word files (data/อภ.docx, ตภ.docx, บภ.docx,
ผภ..docx) into PostgreSQL.

- department comes from the file name, round and project from the heading above each table
  ("ตรวจ USO ระยะ 2 ครั้งที่ 9 (Zone C+)" -> ค.9, USO Zone C+), dept_seq from the row's position in its table
- village_code is the "ลำดับ" column; service_type is not in the Word files and stays empty
- phone/phone_source for Wi-Fi โรงเรียน come from data/school_phones.csv (keyed by village_code);
  phone_note is review-only and is not loaded

Truncates visit_plan first, so the script is safe to re-run. Inspection status (inspected,
inspected_at) set from the app is carried over by (round, department, service_name, village_code).
Run: .venv/bin/python scripts/import_visit_plan.py [--dry-run]
"""

import csv
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree

import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).parent.parent
DATA = ROOT / "data"
PHONES_CSV = DATA / "school_phones.csv"

DEPARTMENTS = ["อภ.", "ตภ.", "บภ.", "ผภ."]
SCHOOL_SERVICE = "Wi-Fi โรงเรียน"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

HEADERS = {
    "ลำดับ": "village_code",
    "ชื่อบริการ": "service_name",
    "หมู่บ้าน": "village",
    "ตำบล": "subdistrict",
    "อำเภอ": "district",
    "จังหวัด": "province",
    "สถานที่ตั้ง": "install_location",
    "ผู้ให้บริการ": "provider",
    "ลติจูด": "latitude",
    "ลองติจูด": "longitude",
}

# typos in the Word files, fixed on import
CORRECTIONS = {
    "โรงเรียนบ้างวังรางน้อย": "โรงเรียนบ้านวังรางน้อย",
    "นายางกล้ก": "นายางกลัก",
}

COLUMNS = [
    "round", "department", "dept_seq", "service_type", "service_name", "village_code", "village",
    "subdistrict", "district", "province", "install_location", "provider", "latitude", "longitude",
    "project", "phone", "phone_source",
]


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
    """Normalize a cell to a stripped, single-spaced string or None ("-" means empty)."""
    s = re.sub(r"\s+", " ", val or "").strip()
    s = re.sub(r"^(หมู่ \d+)(?=\D)(?! )", r"\1 ", s)  # "หมู่ 12โนนจำปาพัฒนา"
    s = CORRECTIONS.get(s, s)
    return None if s in ("", "-") else s


def text(el):
    return "".join(t.text or "" for t in el.iter(f"{W}t"))


def read_docx(path):
    department = path.name.split(".", 1)[0] + "."
    if department not in DEPARTMENTS:
        sys.exit(f"ERROR: unknown department file {path.name}")

    body = ElementTree.fromstring(zipfile.ZipFile(path).read("word/document.xml")).find(f"{W}body")
    rows, round_name, project = [], None, None
    for el in body:
        if el.tag == f"{W}p":
            # "งานอำนวยการ > ตรวจ USO ระยะ 2 ครั้งที่ 9 (Zone C+)"
            heading = re.search(r"ครั้งที่\s*(\d+)\s*(?:\((.+?)\))?", text(el))
            if heading:
                round_name = f"ค.{heading.group(1)}"
                project = f"USO {heading.group(2)}" if heading.group(2) else None
        elif el.tag == f"{W}tbl":
            if round_name is None:
                sys.exit(f"ERROR: table without a ครั้งที่ heading in {path.name}")
            table = [[text(c) for c in tr.findall(f"{W}tc")] for tr in el.findall(f"{W}tr")]
            header = [HEADERS.get(clean(h)) for h in table[0]]
            if set(header) != set(HEADERS.values()):
                sys.exit(f"ERROR: unexpected columns in {path.name}: {table[0]}")
            for seq, cells in enumerate(table[1:], start=1):
                row = {col: clean(cell) for col, cell in zip(header, cells)}
                row["latitude"] = float(row["latitude"]) if row["latitude"] else None
                row["longitude"] = float(row["longitude"]) if row["longitude"] else None
                row.update(round=round_name, department=department, dept_seq=seq, service_type=None,
                           project=project, phone=None, phone_source=None)
                rows.append(row)
            round_name = None
    return rows


def read_plan():
    paths = sorted(p for p in DATA.glob("*.docx") if not p.name.startswith("~$"))  # skip Word lock files
    if not paths:
        sys.exit(f"ERROR: no .docx files in {DATA}")
    rows = [row for path in paths for row in read_docx(path)]

    phone_by_code = {}
    if PHONES_CSV.exists():
        with open(PHONES_CSV, encoding="utf-8-sig", newline="") as f:
            phone_by_code = {p["village_code"]: p for p in csv.DictReader(f)}
    for row in rows:
        p = phone_by_code.get(row["village_code"])
        if row["service_name"] == SCHOOL_SERVICE and p is not None:
            row["phone"] = p["phone"] or None
            row["phone_source"] = p["phone_source"] or None

    keys = Counter((r["round"], r["department"], r["service_name"], r["village_code"]) for r in rows)
    duplicates = [k for k, n in keys.items() if n > 1]
    if duplicates:
        sys.exit(f"ERROR: duplicate (round, department, service_name, village_code): {duplicates}")
    return rows


def main():
    dry_run = "--dry-run" in sys.argv[1:]
    plan = read_plan()
    rows = [tuple(r[c] for c in COLUMNS) for r in plan]

    if dry_run:
        for r in plan:
            print(" | ".join("" if r[c] is None else str(r[c]) for c in COLUMNS))
        counts = Counter((r["round"], r["department"]) for r in plan)
        phones = Counter((r["round"], r["department"]) for r in plan if r["phone"])
        print(f"Dry run: {len(rows)} rows read, nothing written")
        for (round_name, department), n in sorted(counts.items()):
            print(f"  {round_name} {department}: {n} rows, {phones[(round_name, department)]} with phone")
        return

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
