"""De-duplicate the schools table — keep only unique school_ids."""
import os
import json
import tempfile
from google.cloud import bigquery
from google.oauth2 import service_account

creds = service_account.Credentials.from_service_account_file("./Secrets/service-account.json")
client = bigquery.Client(project="edu-alloc", credentials=creds)

# Count current rows
total = list(client.query("SELECT COUNT(*) as n FROM `edu-alloc.edualloc_dataset.schools`").result())
print(f"Total rows before dedup: {total[0]['n']}")

# Fetch all rows, deduplicate by school_id (keep latest)
all_rows_query = """
    SELECT
        school_id, school_name, block_name, village_name, district_code,
        school_category, medium_of_instruction, management,
        total_enrollment, prev_year_enrollment, total_teachers,
        subject_vacancies, subject_vacancy_list,
        has_toilet, has_electricity, total_classrooms, total_classes,
        urban_distance_km, aser_proxy_score, lat, lng,
        geocode_status, geocode_address,
        di_score, di_category, di_breakdown_json, di_data_quality,
        is_data_stale, udise_year
    FROM `edu-alloc.edualloc_dataset.schools`
"""
all_rows = list(client.query(all_rows_query).result())

# Deduplicate by school_id - keep first occurrence
seen = {}
for row in all_rows:
    d = dict(row)
    sid = d["school_id"]
    if sid not in seen:
        seen[sid] = d

unique_rows = list(seen.values())
print(f"Unique schools: {len(unique_rows)}")

# Reload table with only unique rows (WRITE_TRUNCATE)
with tempfile.NamedTemporaryFile(mode="w", suffix=".ndjson", delete=False, encoding="utf-8") as tmp:
    for row in unique_rows:
        clean = {k: v for k, v in row.items() if v is not None}
        tmp.write(json.dumps(clean) + "\n")
    tmp_path = tmp.name

table_ref = client.get_table("edu-alloc.edualloc_dataset.schools")
job_config = bigquery.LoadJobConfig(
    source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    autodetect=False,
)
with open(tmp_path, "rb") as src:
    load_job = client.load_table_from_file(src, table_ref, job_config=job_config)
load_job.result()
os.unlink(tmp_path)

print(f"[OK] Deduplication complete. {len(unique_rows)} schools in table.")
