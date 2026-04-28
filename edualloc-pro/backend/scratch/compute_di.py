"""
Compute Deprivation Index for all Nandurbar schools and write back to BigQuery.
Run from backend/ directory: python scratch/compute_di.py
"""
import json
import os
import sys

# Allow imports from backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google.cloud import bigquery
from google.oauth2 import service_account

# ── Config ──────────────────────────────────────────────────────────────────
PROJECT_ID   = "edu-alloc"
DATASET      = "edualloc_dataset"
KEY_PATH     = "./Secrets/service-account.json"
DISTRICT     = "NDB01"

# ── Import pure DI formula ───────────────────────────────────────────────────
from utils.di_formula import DIInput, compute_deprivation_index

DI_CATEGORY_MAP = {
    (80, 101): "critical",
    (60,  80): "high",
    (40,  60): "moderate",
    (0,   40): "stable",
}

def get_di_category(score: float) -> str:
    if score >= 80: return "critical"
    if score >= 60: return "high"
    if score >= 40: return "moderate"
    return "stable"


def main():
    credentials = service_account.Credentials.from_service_account_file(KEY_PATH)
    client = bigquery.Client(project=PROJECT_ID, credentials=credentials)

    # 1. Fetch all schools with NULL di_score
    query = f"""
        SELECT
            school_id, total_enrollment, prev_year_enrollment, total_teachers,
            subject_vacancies, has_toilet, has_electricity,
            total_classrooms, total_classes, urban_distance_km, aser_proxy_score
        FROM `{PROJECT_ID}.{DATASET}.schools`
        WHERE district_code = '{DISTRICT}'
          AND di_score IS NULL
    """
    print(f"Fetching schools with NULL di_score from {DISTRICT}...")
    rows = list(client.query(query).result())
    print(f"Found {len(rows)} schools to score.")

    if not rows:
        print("[OK] All schools already have DI scores.")
        return

    scored, skipped = 0, 0
    updates = []

    for row in rows:
        school_id = row["school_id"]
        di_input = DIInput(
            total_enrollment=row.get("total_enrollment"),
            prev_year_enrollment=row.get("prev_year_enrollment"),
            total_teachers=row.get("total_teachers"),
            subject_vacancies=row.get("subject_vacancies"),
            has_toilet=row.get("has_toilet"),
            has_electricity=row.get("has_electricity"),
            total_classrooms=row.get("total_classrooms"),
            total_classes=row.get("total_classes"),
            urban_distance_km=row.get("urban_distance_km"),
            aser_proxy_score=row.get("aser_proxy_score"),
        )
        result = compute_deprivation_index(di_input)

        if result.data_quality == "INSUFFICIENT_DATA":
            print(f"  [SKIP] {school_id} — INSUFFICIENT_DATA (missing: {result.missing_signals})")
            skipped += 1
            continue

        category = get_di_category(result.composite_di)
        breakdown = json.dumps({**result.signal_scores, "data_quality": result.data_quality})
        updates.append({
            "school_id": school_id,
            "di_score": result.composite_di,
            "di_category": category,
            "di_breakdown": breakdown,
        })
        print(f"  [SCORED] {school_id}: DI={result.composite_di:.1f} ({category})")
        scored += 1

    # 2. Fetch ALL columns for all schools so we can reload the full table
    if updates:
        print(f"\nReloading full schools table with DI scores (free-tier compatible)...")

        # Build lookup from our computed scores
        di_lookup = {u["school_id"]: u for u in updates}

        # Fetch ALL columns from current schools table
        all_cols_query = f"""
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
            FROM `{PROJECT_ID}.{DATASET}.schools`
            WHERE district_code = '{DISTRICT}'
        """
        all_rows = list(client.query(all_cols_query).result())

        # Merge in the computed DI scores
        import tempfile, json as _json
        with tempfile.NamedTemporaryFile(mode="w", suffix=".ndjson", delete=False, encoding="utf-8") as tmp:
            for row in all_rows:
                d = dict(row)
                sid = d["school_id"]
                if sid in di_lookup:
                    d["di_score"]         = di_lookup[sid]["di_score"]
                    d["di_category"]      = di_lookup[sid]["di_category"]
                    d["di_breakdown_json"]= di_lookup[sid]["di_breakdown"]
                    d["di_data_quality"]  = "OK"
                # Remove None values and convert booleans
                clean = {}
                for k, v in d.items():
                    if v is None:
                        continue
                    clean[k] = v
                tmp.write(_json.dumps(clean) + "\n")
            tmp_path = tmp.name

        table_ref = client.get_table(f"{PROJECT_ID}.{DATASET}.schools")
        job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
            autodetect=False,
        )
        with open(tmp_path, "rb") as src:
            load_job = client.load_table_from_file(src, table_ref, job_config=job_config)
        load_job.result()
        import os as _os
        _os.unlink(tmp_path)

        if load_job.errors:
            print(f"[ERROR] {load_job.errors}")
        else:
            print(f"[OK] Reloaded schools table with DI scores for {len(updates)} schools.")

    print(f"\n[DONE] Scored: {scored}, Skipped (insufficient data): {skipped}")
    print(f"[OK] DI computation complete. Dashboard is now live!")


if __name__ == "__main__":
    main()
