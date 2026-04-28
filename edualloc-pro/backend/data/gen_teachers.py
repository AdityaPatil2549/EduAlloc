"""
Synthetic teacher profile generator — 300 teachers for Nandurbar district.
Run: python -m data.gen_teachers
"""

from __future__ import annotations

import csv
import json
import os
import random
import uuid
from datetime import datetime

import structlog

log = structlog.get_logger()

random.seed(42)

SUBJECTS = ["MATH", "SCI", "ENG", "MAR", "HIN", "SST", "PHY", "CHM", "BIO"]
QUALIFICATIONS = ["BSc BEd", "MSc BEd", "BA BEd", "MA BEd", "BSc", "MSc", "BA BEd D.Ed"]
LANGUAGES_POOL = [
    ["mr", "hi"],
    ["mr", "hi", "en"],
    ["mr"],
    ["mr", "hi", "gondi"],
    ["mr", "en"],
]
DISTRICT = "NDB01"
BLOCKS = ["Nandurbar", "Shahada", "Navapur", "Taloda", "Shirpur", "Akkalkuwa", "Akrani"]


def generate_teachers(n: int = 300) -> list[dict]:
    teachers = []
    for i in range(n):
        subjects = random.sample(SUBJECTS, k=random.randint(1, 3))
        years_service = random.randint(1, 25)
        years_rural = random.randint(0, min(years_service, 15))
        long_dist = random.random() < 0.25

        teachers.append({
            "teacher_id": str(uuid.uuid4()),
            "district_code": DISTRICT,
            "subject_specialization": json.dumps(subjects),
            "qualification": random.choice(QUALIFICATIONS),
            "years_service": years_service,
            "years_rural": years_rural,
            "languages": json.dumps(random.choice(LANGUAGES_POOL)),
            "long_dist_consent": long_dist,
            "current_school_id": None,
            "is_synthetic": True,
            "embedding_status": "PENDING",
            "created_at": datetime.utcnow().isoformat(),
        })
    return teachers


def save_to_csv(teachers: list[dict], path: str) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=teachers[0].keys())
        writer.writeheader()
        writer.writerows(teachers)
    print(f"[OK] Generated {len(teachers)} synthetic teachers -> {path}")


def ingest_to_bq(teachers: list[dict], project_id: str, dataset: str) -> None:
    import json as _json
    import tempfile
    from google.cloud import bigquery
    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset}.teachers"

    with tempfile.NamedTemporaryFile(mode="w", suffix=".ndjson", delete=False, encoding="utf-8") as tmp:
        for t in teachers:
            clean = {k: v for k, v in t.items() if v is not None}
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
    load_job.result()
    import os as _os
    _os.unlink(tmp_path)

    if load_job.errors:
        print(f"[ERROR] BQ errors: {load_job.errors}")
    else:
        print(f"[OK] Ingested {len(teachers)} teachers into {table_ref}")


if __name__ == "__main__":
    teachers = generate_teachers(300)
    csv_path = os.getenv("TEACHER_CSV_PATH", "./data/sample/teachers_synth.csv")
    save_to_csv(teachers, csv_path)

    if os.getenv("GOOGLE_CLOUD_PROJECT"):
        ingest_to_bq(
            teachers,
            project_id=os.environ["GOOGLE_CLOUD_PROJECT"],
            dataset=os.getenv("BQ_DATASET", "edualloc_dataset"),
        )
