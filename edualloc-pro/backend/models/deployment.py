"""Pydantic v2 models for deployment — matches, assignments, DVS."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DVScore(BaseModel):
    """DVS with per-component breakdown for frontend DVSMeter."""

    dvs: float = Field(..., ge=0.0, le=1.0)
    di_component: float
    match_component: float
    retention_component: float
    di_score: float
    match_score: float
    retention_score: float


class TeacherMatch(BaseModel):
    """Single teacher candidate for a vacancy, with DVS breakdown."""

    teacher_id: str
    school_id: str
    vacancy_subject: str
    dvs: DVScore
    distance_km: Optional[float] = None
    rank: int = Field(..., ge=1, le=5)


class MatchListResponse(BaseModel):
    """Top-N teacher matches for a vacancy."""

    vacancy_id: str
    school_id: str
    vacancy_subject: str
    matches: list[TeacherMatch]
    is_cached: bool = False


class Assignment(BaseModel):
    """Single OR-Tools assignment: teacher → school vacancy."""

    deployment_id: str
    teacher_id: str
    school_id: str
    vacancy_subject: str
    dvs: float = Field(..., ge=0.0, le=1.0)
    distance_km: Optional[float] = None
    status: str = "PENDING"  # PENDING | APPROVED | REJECTED


class OptimizationResult(BaseModel):
    """OR-Tools optimizer result — may be partial on timeout."""

    district_code: str
    assignments: list[Assignment]
    status: str  # OPTIMAL | FEASIBLE
    solver_time_s: float
    total_assignments: int
    objective_value: float
    ran_at: datetime
