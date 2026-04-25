"""
Deprivation Index engine — BigQuery I/O wrapper around di_formula.py pure functions.

This module handles fetching school data from BigQuery and writing back DI scores.
Pure scoring logic lives in utils/di_formula.py — never here.
"""

from __future__ import annotations

import json

import structlog

from services.bigquery_client import BigQueryClient
from utils.di_formula import DIInput, compute_deprivation_index

log = structlog.get_logger()

# DI category thresholds
DI_CATEGORIES = {
    "critical": (80, 100),   # --di-critical: #E11D48
    "high":     (60, 79.99), # --di-high:     #D97706
    "moderate": (40, 59.99), # --di-moderate: #2563EB
    "stable":   (0,  39.99), # --di-stable:   #059669
}


def get_di_category(di_score: float) -> str:
    """Map DI score to category string."""
    if di_score >= 80:
        return "critical"
    if di_score >= 60:
        return "high"
    if di_score >= 40:
        return "moderate"
    return "stable"


async def compute_and_store_di(school_row: dict, bq: BigQueryClient) -> float | None:
    """
    Compute DI for a single school row and write result back to BigQuery.

    Args:
        school_row: Dict from BigQuery schools table
        bq:         BigQuery client (injected — never imported directly here)

    Returns:
        Computed di_score or None if INSUFFICIENT_DATA.
    """
    school_id = school_row.get("school_id", "UNKNOWN")
    bound_log = log.bind(fn="deprivation.compute", school_id=school_id)
    bound_log.info("di.compute.start")

    di_input = DIInput(
        total_enrollment=school_row.get("total_enrollment"),
        prev_year_enrollment=school_row.get("prev_year_enrollment"),
        total_teachers=school_row.get("total_teachers"),
        subject_vacancies=school_row.get("subject_vacancies"),
        has_toilet=school_row.get("has_toilet"),
        has_electricity=school_row.get("has_electricity"),
        total_classrooms=school_row.get("total_classrooms"),
        total_classes=school_row.get("total_classes"),
        urban_distance_km=school_row.get("urban_distance_km"),
        aser_proxy_score=school_row.get("aser_proxy_score"),
    )

    result = compute_deprivation_index(di_input)

    if result.data_quality == "INSUFFICIENT_DATA":
        bound_log.warning(
            "di.insufficient_data",
            missing=result.missing_signals,
        )
        return None

    di_score = result.composite_di
    breakdown_json = json.dumps(
        {**result.signal_scores, "data_quality": result.data_quality}
    )

    try:
        await bq.upsert_di_score(school_id, di_score, breakdown_json)
        bound_log.info("di.compute.done", di_score=di_score, category=get_di_category(di_score))
    except Exception as e:
        bound_log.error("di.store.error", error=str(e))
        # Don't re-raise — return the computed score even if storage failed

    return di_score


async def compute_di_for_district(district_code: str, bq: BigQueryClient) -> dict:
    """
    Compute DI for all schools in a district that have NULL di_score.

    Returns summary dict with count of schools processed and scored.
    """
    bound_log = log.bind(fn="deprivation.district", district_code=district_code)
    bound_log.info("di.district.start")

    from google.cloud import bigquery as bq_lib
    rows = await bq.query(
        f"""
        SELECT school_id, total_enrollment, prev_year_enrollment, total_teachers,
               subject_vacancies, has_toilet, has_electricity, total_classrooms,
               total_classes, urban_distance_km, aser_proxy_score
        FROM `{{project}}.{{dataset}}.schools`
        WHERE district_code = @district_id
          AND di_score IS NULL
        """,
        params=[bq_lib.ScalarQueryParameter("district_id", "STRING", district_code)],
    )

    scored = 0
    skipped = 0
    for row in rows:
        score = await compute_and_store_di(row, bq)
        if score is not None:
            scored += 1
        else:
            skipped += 1

    bound_log.info("di.district.done", total=len(rows), scored=scored, skipped=skipped)
    return {"total": len(rows), "scored": scored, "skipped_insufficient_data": skipped}
