"""Teachers API route — GET /api/teachers."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query

from api.deps import get_bq_client, verify_firebase_token
from models.teacher import Teacher, TeacherListResponse

log = structlog.get_logger()
router = APIRouter(tags=["teachers"])


@router.get("/teachers", response_model=TeacherListResponse)
async def list_teachers(
    district_id: str = Query(..., description="5-char district code, e.g. NDB01"),
    bq=Depends(get_bq_client),
    _user=Depends(verify_firebase_token),
) -> TeacherListResponse:
    """
    GET /api/teachers?district_id=NDB01

    Returns teacher roster for district, sorted by rural experience.
    Personal data (name, DOB, address) is never logged — only teacher_id.
    """
    bound_log = log.bind(fn="teachers.list", district=district_id)
    bound_log.info("teachers.list.start")

    rows = await bq.get_teachers(district_id)

    teachers = []
    for row in rows:
        import json as _json
        subjects = row.get("subject_specialization", [])
        if isinstance(subjects, str):
            try:
                subjects = _json.loads(subjects)
            except Exception:
                subjects = [subjects]
        langs = row.get("languages", [])
        if isinstance(langs, str):
            try:
                langs = _json.loads(langs)
            except Exception:
                langs = [langs]

        teachers.append(
            Teacher(
                teacher_id=str(row["teacher_id"]),
                district_code=row.get("district_code", district_id),
                subject_specialization=subjects,
                qualification=row.get("qualification", ""),
                years_service=row.get("years_service", 0),
                years_rural=row.get("years_rural", 0),
                languages=langs,
                long_dist_consent=bool(row.get("long_dist_consent", False)),
                current_school_id=row.get("current_school_id"),
                is_synthetic=bool(row.get("is_synthetic", True)),
                created_at=row.get("created_at"),
            )
        )

    bound_log.info("teachers.list.done", count=len(teachers))
    return TeacherListResponse(teachers=teachers, total=len(teachers), district_code=district_id)
