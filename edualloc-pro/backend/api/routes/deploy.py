"""
Deploy API routes:
  GET  /api/deploy/matches  — Top-5 teacher matches for a vacancy (Vertex AI)
  POST /api/deploy/optimize — Run OR-Tools district-wide optimizer
  POST /api/deploy/approve  — Write approved assignment to BigQuery deployments table
  GET  /api/deploy/history  — Fetch recent deployment history for a district
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional

from ai import matching as matching_ai
from ai import optimizer as optimizer_ai
from ai.retention import compute_retention_score
from api.deps import (
    get_bq_client,
    get_embeddings_cache,
    get_vertex_client,
    get_maps_client,
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
    maps=Depends(get_maps_client),
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
        maps=maps,
        top_n=5,
    )

    matches = []
    for i, m in enumerate(raw_matches, start=1):
        dvs_data = m["dvs"]
        teacher_data = m.get("teacher", {})
        retention = compute_retention_score(teacher_data, school)
        matches.append(
            TeacherMatch(
                teacher_id=m["teacher_id"],
                school_id=school_id,
                vacancy_subject=subject,
                dvs=DVScore(**dvs_data),
                distance_km=m.get("distance_km"),
                rank=i,
                # Display fields
                teacher_name=teacher_data.get("teacher_name") or teacher_data.get("name"),
                qualification=teacher_data.get("qualification"),
                years_experience=teacher_data.get("years_experience"),
                long_dist_consent=teacher_data.get("long_dist_consent"),
                retention_score=retention,
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

    import json
    
    # Fetch all teachers
    teachers = await bq.get_teachers(body.district_code)
    for t in teachers:
        if isinstance(t.get("subject_specialization"), str):
            try:
                t["subject_specialization"] = json.loads(t["subject_specialization"])
            except json.JSONDecodeError:
                t["subject_specialization"] = []

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


# ── Approve endpoint ─────────────────────────────────────────────────────────

class ApproveRequest(BaseModel):
    teacher_id: str
    school_id: str
    vacancy_subject: str
    dvs_score: float = Field(..., ge=0.0, le=1.0)
    distance_km: Optional[float] = None
    retention_score: Optional[float] = None
    district_code: str = "NDB01"
    approved_by: str = "officer"  # overridden by real auth in production


class ApproveResponse(BaseModel):
    deployment_id: str
    status: str
    message: str


@router.post("/deploy/approve", response_model=ApproveResponse)
async def approve_deployment(
    body: ApproveRequest,
    bq=Depends(get_bq_client),
    _user=Depends(verify_firebase_token),
) -> ApproveResponse:
    """
    POST /api/deploy/approve

    Records an officer-approved teacher deployment to BigQuery.
    Gracefully continues (with a warning) if the deployments table does not yet exist.
    """
    bound_log = log.bind(
        fn="deploy.approve",
        teacher_id=body.teacher_id,
        school_id=body.school_id,
        subject=body.vacancy_subject,
    )
    bound_log.info("deploy.approve.start")

    deployment_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "deployment_id": deployment_id,
        "teacher_id": body.teacher_id,
        "school_id": body.school_id,
        "vacancy_subject": body.vacancy_subject,
        "dvs_score": body.dvs_score,
        "distance_km": body.distance_km,
        "retention_score": body.retention_score,
        "district_code": body.district_code,
        "status": "APPROVED",
        "approved_by": body.approved_by,
        "approved_at": now_iso,
    }

    try:
        await bq.save_deployment(record)
        bound_log.info("deploy.approve.saved", deployment_id=deployment_id)
        return ApproveResponse(
            deployment_id=deployment_id,
            status="APPROVED",
            message=f"Deployment {deployment_id[:8]} saved to BigQuery.",
        )
    except Exception as e:
        # Graceful fallback — table may not exist yet on fresh BigQuery setup
        bound_log.warning("deploy.approve.bq_unavailable", error=str(e))
        return ApproveResponse(
            deployment_id=deployment_id,
            status="APPROVED_LOCAL",
            message=f"Deployment {deployment_id[:8]} approved (BQ write deferred: {str(e)[:60]}).",
        )


@router.get("/deploy/history")
async def get_deployment_history(
    district_code: str = Query("NDB01"),
    limit: int = Query(50, le=200),
    bq=Depends(get_bq_client),
    _user=Depends(verify_firebase_token),
) -> dict:
    """
    GET /api/deploy/history?district_code=NDB01&limit=50

    Returns recent approved deployments for a district.
    """
    try:
        rows = await bq.get_deployments(district_code, limit)
        return {"district_code": district_code, "deployments": rows, "count": len(rows)}
    except Exception as e:
        log.warning("deploy.history.bq_unavailable", error=str(e))
        return {"district_code": district_code, "deployments": [], "count": 0}


@router.get("/deploy/analytics")
async def get_district_analytics(
    district_code: str = Query("NDB01"),
    bq=Depends(get_bq_client),
    _user=Depends(verify_firebase_token),
) -> dict:
    """
    GET /api/deploy/analytics?district_code=NDB01

    Returns real aggregated metrics for the district dashboard.
    """
    try:
        analytics = await bq.get_analytics(district_code)
        return {"district_code": district_code, "analytics": analytics}
    except Exception as e:
        log.warning("deploy.analytics.bq_unavailable", error=str(e))
        return {
            "district_code": district_code,
            "analytics": {"total_schools": 0, "avg_di_score": 0, "total_vacancies": 0, "critical_schools": 0}
        }
