"""
UDISE CSV → BigQuery ingestion pipeline.
Run: python -m data.ingest_udise
"""

from __future__ import annotations

import csv
import json
import os
import sys

import structlog
from google.cloud import bigquery

log = structlog.get_logger()


def ingest_udise_csv(csv_path: str, project_id: str, dataset: str) -> None:
    """Load UDISE CSV into BigQuery schools table."""
    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset}.schools"
    bound_log = log.bind(fn="ingest_udise", csv=csv_path, table=table_ref)
    bound_log.info("ingest.start")

    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "school_id": str(row["school_id"]),
                "school_name": row.get("school_name", ""),
                "block_name": row.get("block_name", ""),
                "village_name": row.get("village_name", ""),
                "district_code": row.get("district_code", "NDB01"),
                "school_category": row.get("school_category", "PRIMARY"),
                "medium_of_instruction": row.get("medium_of_instruction", "Marathi"),
                "total_enrollment": int(row["total_enrollment"]) if row.get("total_enrollment") else None,
                "prev_year_enrollment": int(row["prev_year_enrollment"]) if row.get("prev_year_enrollment") else None,
                "total_teachers": int(row["total_teachers"]) if row.get("total_teachers") else None,
                "subject_vacancies": int(row["subject_vacancies"]) if row.get("subject_vacancies") else 0,
                "subject_vacancy_list": row.get("subject_vacancy_list", "[]"),
                "has_toilet": row.get("has_toilet", "False").strip() == "True",
                "has_electricity": row.get("has_electricity", "False").strip() == "True",
                "total_classrooms": int(row["total_classrooms"]) if row.get("total_classrooms") else None,
                "total_classes": int(row["total_classes"]) if row.get("total_classes") else None,
                "urban_distance_km": float(row["urban_distance_km"]) if row.get("urban_distance_km") else None,
                "aser_proxy_score": float(row["aser_proxy_score"]) if row.get("aser_proxy_score") else None,
                "lat": float(row["lat"]) if row.get("lat") else None,
                "lng": float(row["lng"]) if row.get("lng") else None,
                "geocode_status": "OK" if row.get("lat") else "PENDING",
                "is_data_stale": True,
                "udise_year": row.get("udise_year", "2022-23"),
                "di_score": None,
                "di_category": None,
            })

    import json as _json
    import tempfile

    # Use load jobs (free tier) instead of streaming inserts (requires billing)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".ndjson", delete=False, encoding="utf-8") as tmp:
        for row in rows:
            # Remove None values so BQ doesn't complain about null types
            clean = {k: v for k, v in row.items() if v is not None}
            tmp.write(_json.dumps(clean) + "\n")
        tmp_path = tmp.name

    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        autodetect=False,
    )

    table_obj = client.get_table(table_ref)
    with open(tmp_path, "rb") as src:
        load_job = client.load_table_from_file(src, table_obj, job_config=job_config)

    load_job.result()  # Wait for completion
    os.unlink(tmp_path)

    if load_job.errors:
        bound_log.error("ingest.bq_errors", errors=load_job.errors)
        sys.exit(1)

    bound_log.info("ingest.done", count=len(rows))
    print(f"[OK] Ingested {len(rows)} schools into {table_ref}")


if __name__ == "__main__":
    ingest_udise_csv(
        csv_path=os.getenv("UDISE_CSV_PATH", "./data/sample/udise_nandurbar.csv"),
        project_id=os.environ["GOOGLE_CLOUD_PROJECT"],
        dataset=os.getenv("BQ_DATASET", "edualloc_dataset"),
    )
