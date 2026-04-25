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
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=teachers[0].keys())
        writer.writeheader()
        writer.writerows(teachers)
    print(f"✅ Generated {len(teachers)} synthetic teachers → {path}")


def ingest_to_bq(teachers: list[dict], project_id: str, dataset: str) -> None:
    from google.cloud import bigquery
    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset}.teachers"
    errors = client.insert_rows_json(client.get_table(table_ref), teachers)
    if errors:
        print(f"❌ BQ errors: {errors}")
    else:
        print(f"✅ Ingested {len(teachers)} teachers into {table_ref}")


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
