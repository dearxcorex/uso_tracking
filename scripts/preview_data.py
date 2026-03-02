"""
Preview: Read data_uso_final.xlsx, deduplicate, and export to preview_import.xlsx for review.
"""
import pandas as pd
from pathlib import Path

xlsx_path = Path(__file__).parent.parent / "data_uso_final.xlsx"
output_path = Path(__file__).parent.parent / "preview_import.xlsx"

print(f"Loading: {xlsx_path}")
df = pd.read_excel(xlsx_path, sheet_name="ชัยภูมิ")
print(f"Total rows in sheet: {len(df)}")
print(f"Columns: {list(df.columns)}")

# Deduplicate by asset_id — keep first row
print(f"\nUnique asset_id values: {df['asset_id'].nunique()}")
print(f"Null asset_id: {df['asset_id'].isna().sum()}")
df_dedup = df.drop_duplicates(subset=["asset_id"], keep="first").copy()
print(f"After dedup: {len(df_dedup)} rows")

# Map columns to show what will go into DB
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

# Select only the mapped columns (keep originals + mapped names)
available = [c for c in col_map.keys() if c in df_dedup.columns]
missing = [c for c in col_map.keys() if c not in df_dedup.columns]
if missing:
    print(f"WARNING: Missing columns: {missing}")

df_preview = df_dedup[available].copy()
df_preview = df_preview.rename(columns=col_map)

# Also use supplier_name for contract_number
if "supplier_name" in df_dedup.columns:
    df_preview["contract_number"] = df_dedup["supplier_name"].values[:len(df_preview)]

print(f"\n--- Stats ---")
print(f"Total rows: {len(df_preview)}")
print(f"Districts ({df_preview['district'].nunique()}): {sorted(df_preview['district'].dropna().unique())}")
print(f"Providers ({df_preview['provider'].nunique()}): {dict(df_preview['provider'].value_counts())}")
print(f"Zones: {dict(df_preview['zone'].value_counts())}")
print(f"Null districts: {df_preview['district'].isna().sum()}")
print(f"Null lat/lon: {df_preview['latitude'].isna().sum()}")
print(f"Service names: {dict(df_preview['service_name'].value_counts())}")

# Export
df_preview.to_excel(output_path, index=False, sheet_name="preview")
print(f"\nExported to: {output_path}")
