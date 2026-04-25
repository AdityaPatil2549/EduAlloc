"""Schools API routes — GET /api/schools, GET /api/schools/{school_id}."""

from __future__ import annotations

import json
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, Query

from ai.deprivation import get_di_category
from api.deps import get_bq_client, verify_firebase_token
from models.errors import NotFoundError
from models.school import DIBreakdown, SchoolDetail, SchoolListResponse, SchoolSummary

log = structlog.get_logger()
router = APIRouter(tags=["schools"])


@router.get("/schools", response_model=SchoolListResponse)
async def list_schools(
    district_id: str = Query(..., description="5-char district code, e.g. NDB01"),
    limit: int = Query(50, ge=1, le=500),
    page: int = Query(1, ge=1),
    bq=Depends(get_bq_client),
    _user=Depends(verify_firebase_token),
) -> SchoolListResponse:
    """
    GET /api/schools?district_id=NDB01&limit=50

    Returns schools sorted by DI score descending (most deprived first).
    Always includes is_data_stale flag — UDISE data is 12-18 months old.
    """
    bound_log = log.bind(fn="schools.list", district=district_id, limit=limit)
    bound_log.info("schools.list.start")

    rows = await bq.get_schools(district_id, limit)

    schools = []
    for row in rows:
        di_score = row.get("di_score")
        schools.append(
            SchoolSummary(
                school_id=str(row["school_id"]),  # always STRING
                school_name=row.get("school_name", ""),
                block_name=row.get("block_name", ""),
                village_name=row.get("village_name", ""),
                district_code=row.get("district_code", district_id),
                di_score=di_score,
                di_category=get_di_category(di_score) if di_score is not None else None,
                total_enrollment=row.get("total_enrollment"),
                total_teachers=row.get("total_teachers"),
                subject_vacancies=row.get("subject_vacancies"),
                lat=row.get("lat"),
                lng=row.get("lng"),
                is_data_stale=True,  # ALWAYS — UDISE data is 12-18 months old
                geocode_status=row.get("geocode_status", "PENDING"),
                updated_at=row.get("updated_at"),
            )
        )

    bound_log.info("schools.list.done", count=len(schools))
    return SchoolListResponse(
        schools=schools, total=len(schools), district_code=district_id,
        page=page, limit=limit,
    )


@router.get("/schools/{school_id}", response_model=SchoolDetail)
async def get_school(
    school_id: str,
    bq=Depends(get_bq_client),
    _user=Depends(verify_firebase_token),
) -> SchoolDetail:
    """
    GET /api/schools/{school_id}

    Returns full school detail including DI breakdown.
    school_id is always an 11-digit UDISE code STRING — never cast to INT.
    """
    bound_log = log.bind(fn="schools.get", school_id=school_id)
    bound_log.info("schools.get.start")

    row = await bq.get_school_detail(school_id)
    if not row:
        raise NotFoundError("School", school_id)

    di_score = row.get("di_score")
    di_breakdown = None
    if row.get("di_breakdown_json"):
        try:
            raw = json.loads(row["di_breakdown_json"])
            di_breakdown = DIBreakdown(**raw)
        except Exception:
            pass

    from utils.rte_check import check_rte_compliance
    rte = None
    ptr = None
    if row.get("total_enrollment") and row.get("total_teachers"):
        rte_result = check_rte_compliance(
            row["total_enrollment"],
            row["total_teachers"],
            row.get("school_category", "PRIMARY"),
        )
        rte = rte_result.is_compliant
        ptr = rte_result.pupil_teacher_ratio

    bound_log.info("schools.get.done", di_score=di_score)
    return SchoolDetail(
        school_id=str(row["school_id"]),
        school_name=row.get("school_name", ""),
        block_name=row.get("block_name", ""),
        village_name=row.get("village_name", ""),
        district_code=row.get("district_code", ""),
        di_score=di_score,
        di_category=get_di_category(di_score) if di_score is not None else None,
        total_enrollment=row.get("total_enrollment"),
        total_teachers=row.get("total_teachers"),
        subject_vacancies=row.get("subject_vacancies"),
        has_toilet=row.get("has_toilet"),
        has_electricity=row.get("has_electricity"),
        total_classrooms=row.get("total_classrooms"),
        total_classes=row.get("total_classes"),
        urban_distance_km=row.get("urban_distance_km"),
        aser_proxy_score=row.get("aser_proxy_score"),
        prev_year_enrollment=row.get("prev_year_enrollment"),
        school_category=row.get("school_category"),
        medium_of_instruction=row.get("medium_of_instruction"),
        rte_compliant=rte,
        pupil_teacher_ratio=ptr,
        lat=row.get("lat"),
        lng=row.get("lng"),
        is_data_stale=True,
        geocode_status=row.get("geocode_status", "PENDING"),
        updated_at=row.get("updated_at"),
        di_breakdown=di_breakdown,
    )
