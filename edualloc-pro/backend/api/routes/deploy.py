"""
Deploy API routes:
  GET  /api/deploy/matches  — Top-5 teacher matches for a vacancy (Vertex AI)
  POST /api/deploy/optimize — Run OR-Tools district-wide optimizer
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ai import matching as matching_ai
from ai import optimizer as optimizer_ai
from api.deps import (
    get_bq_client,
    get_embeddings_cache,
    get_vertex_client,
    verify_firebase_token,
)
from models.deployment import DVScore, MatchListResponse, OptimizationResult, TeacherMatch
from models.errors import NotFoundError

log = structlog.get_logger()
router = APIRouter(tags=["deploy"])


@router.get("/deploy/matches", response_model=MatchListResponse)
async def get_matches(
    school_id: str = Query(..., description="11-digit UDISE code"),
    subject: str = Query(..., description="Subject code, e.g. MATH"),
    district_id: str = Query("NDB01"),
    bq=Depends(get_bq_client),
    vertex=Depends(get_vertex_client),
    cache=Depends(get_embeddings_cache),
    _user=Depends(verify_firebase_token),
) -> MatchListResponse:
    """
    GET /api/deploy/matches?school_id=27031070001&subject=MATH&district_id=NDB01

    Returns top-5 teacher candidates ranked by DVS score.
    Uses Vertex AI textembedding-gecko@003 with cache-first strategy.
    Enforces 80km hard constraint.
    """
    bound_log = log.bind(fn="deploy.matches", school_id=school_id, subject=subject)
    bound_log.info("deploy.matches.start")

    school = await bq.get_school_detail(school_id)
    if not school:
        raise NotFoundError("School", school_id)

    raw_matches = await matching_ai.get_top_matches(
        school=school,
        vacancy_subject=subject,
        district_code=district_id,
        bq=bq,
        vertex=vertex,
        cache=cache,
        top_n=5,
    )

    matches = []
    for i, m in enumerate(raw_matches, start=1):
        dvs_data = m["dvs"]
        matches.append(
            TeacherMatch(
                teacher_id=m["teacher_id"],
                school_id=school_id,
                vacancy_subject=subject,
                dvs=DVScore(**dvs_data),
                distance_km=m.get("distance_km"),
                rank=i,
            )
        )

    bound_log.info("deploy.matches.done", count=len(matches))
    return MatchListResponse(
        vacancy_id=f"{school_id}_{subject}",
        school_id=school_id,
        vacancy_subject=subject,
        matches=matches,
        is_cached=False,
    )


class OptimizeRequest(BaseModel):
    district_code: str = "NDB01"
    time_limit_s: int = 20


@router.post("/deploy/optimize", response_model=OptimizationResult)
async def run_optimize(
    body: OptimizeRequest,
    bq=Depends(get_bq_client),
    _user=Depends(verify_firebase_token),
) -> OptimizationResult:
    """
    POST /api/deploy/optimize

    Runs OR-Tools CP-SAT district-wide optimizer.
    Returns OPTIMAL or FEASIBLE partial result — NEVER 5xx on timeout.
    Requires 'collector' role (or dev bypass).
    """
    bound_log = log.bind(fn="deploy.optimize", district=body.district_code)
    bound_log.info("optimize.start")

    # Fetch all schools with vacancies
    schools = await bq.get_schools(body.district_code, limit=500)
    schools_with_vacancies = [s for s in schools if (s.get("subject_vacancies") or 0) > 0]

    # Fetch all teachers
    teachers = await bq.get_teachers(body.district_code)

    # Build vacancy lists per school (simplified: one vacancy per subject type)
    for school in schools_with_vacancies:
        school["vacancies"] = ["MATH", "SCI"]  # placeholder — real data from vacancies table

    # Use commute cache (empty dict = all distances default to 40km)
    commute_cache = {}

    result = optimizer_ai.run_optimizer(
        schools=schools_with_vacancies,
        teachers=teachers,
        commute_cache=commute_cache,
        time_limit_s=min(body.time_limit_s, 20),
    )

    bound_log.info(
        "optimize.done",
        status=result.status,
        assignments=result.total_assignments,
        time_s=result.solver_time_s,
    )
    return result
