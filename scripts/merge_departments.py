"""
Merge the department visit-plan sheets of the USO Net phase 2 workbooks into one review file.

- Reads every department sheet (อภ./ตภ./บภ./ผภ. x WIFI.รร./WIFI.ม) from each round's workbook
- department comes from the sheet name, dept_seq from the "ครั้งที่ N" tag column (e.g. "อภ.1โรงเรียน" -> 1)
- phone/phone_source/phone_note for Wi-Fi โรงเรียน come from data/school_phones.csv (keyed by village_code)

Output: data/merged_departments.xlsx (review it, then load with scripts/import_visit_plan.py)
Run: .venv/bin/python scripts/merge_departments.py
"""

import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parent.parent
DATA = ROOT / "data"
WORKBOOKS = {
    "ค.9": DATA / "USO net ระยะ 2 ใช้ ค.9.xlsx",
    "ค.10": DATA / "USO net ระยะ 2 ใช้ ค.10.xlsx",
}
PHONES_CSV = DATA / "school_phones.csv"
OUT_PATH = DATA / "merged_departments.xlsx"

DEPARTMENTS = ["อภ.", "ตภ.", "บภ.", "ผภ."]
SCHOOL_SERVICE = "Wi-Fi โรงเรียน"

COLUMNS = {
    "ประเภทบริการ": "service_type",
    "ชื่อบริการ": "service_name",
    "รหัสหมู่บ้าน": "village_code",
    "หมู่บ้าน": "village",
    "ตำบล": "subdistrict",
    "อำเภอ": "district",
    "จังหวัด": "province",
    "สถานที่ติดตั้ง": "install_location",
    "ผู้ให้บริการ": "provider",
    "LAT Master": "latitude",
    "LONG Maste": "longitude",
    "โครงการ": "project",
}

OUTPUT_ORDER = [
    "round", "department", "dept_seq", "service_type", "service_name", "village_code", "village",
    "subdistrict", "district", "province", "install_location", "provider", "latitude", "longitude",
    "project", "phone", "phone_source", "phone_note",
]


def clean(val):
    """Normalize a cell to a stripped string or None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    if s.endswith(".0") and s[:-2].isdigit():  # Excel integers read back as floats
        s = s[:-2]
    return s or None


def read_sheet(xlsx, sheet, round_name):
    department = sheet.split(" ", 1)[0]
    if department not in DEPARTMENTS:
        return None

    df = xlsx.parse(sheet, dtype={"ประเภทบริการ": str, "รหัสหมู่บ้าน": str})
    df.columns = [str(c).strip() for c in df.columns]
    tag_col = [c for c in df.columns if c.startswith("ครั้งที่")][-1]

    rows = []
    for _, r in df.iterrows():
        row = {dst: clean(r.get(src)) for src, dst in COLUMNS.items()}
        row["latitude"] = float(r["LAT Master"]) if pd.notna(r["LAT Master"]) else None
        row["longitude"] = float(r["LONG Maste"]) if pd.notna(r["LONG Maste"]) else None
        seq = re.search(r"^\D+?(\d+)", clean(r[tag_col]) or "")  # "อภ.1โรงเรียน" or "บภ1"
        row["round"] = round_name
        row["department"] = department
        row["dept_seq"] = int(seq.group(1)) if seq else None
        rows.append(row)
    return pd.DataFrame(rows)


def main():
    frames = []
    for round_name, path in WORKBOOKS.items():
        xlsx = pd.ExcelFile(path)
        for sheet in xlsx.sheet_names:
            df = read_sheet(xlsx, sheet, round_name)
            if df is not None:
                frames.append(df)
    merged = pd.concat(frames, ignore_index=True)

    phones = pd.read_csv(PHONES_CSV, dtype=str).fillna("") if PHONES_CSV.exists() else pd.DataFrame()
    phone_by_code = {p["village_code"]: p for _, p in phones.iterrows()}
    for col in ("phone", "phone_source", "phone_note"):
        merged[col] = None
    for i, row in merged.iterrows():
        p = phone_by_code.get(row["village_code"])
        if row["service_name"] == SCHOOL_SERVICE and p is not None:
            for col in ("phone", "phone_source", "phone_note"):
                merged.at[i, col] = p[col] or None
            # some school rows have no install_location in the source; use the identified school name
            if not row["install_location"] and p["school_name"]:
                merged.at[i, "install_location"] = p["school_name"]

    merged = merged[OUTPUT_ORDER].sort_values(["round", "department", "service_name", "dept_seq"])
    merged.to_excel(OUT_PATH, index=False, sheet_name="visit_plan")

    schools = merged[merged["service_name"] == SCHOOL_SERVICE]
    print(f"Wrote {len(merged)} rows to {OUT_PATH.relative_to(ROOT)}")
    print(merged.groupby(["round", "department"]).size().to_string())
    print(f"Schools: {len(schools)}, with phone: {schools['phone'].notna().sum()}")


if __name__ == "__main__":
    main()
