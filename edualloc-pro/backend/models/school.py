"""Pydantic v2 models for school data."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DIBreakdown(BaseModel):
    """Per-signal DI score breakdown for frontend display."""

    stu_tea_ratio: Optional[float] = None
    subject_vacancy: Optional[float] = None
    toilet: Optional[float] = None
    electricity: Optional[float] = None
    classroom_ratio: Optional[float] = None
    urban_distance: Optional[float] = None
    enrollment_trend: Optional[float] = None
    aser_proxy: Optional[float] = None
    data_quality: str = "OK"
    missing_signals: list[str] = Field(default_factory=list)


class SchoolSummary(BaseModel):
    """Lightweight school record for list views and map markers."""

    school_id: str = Field(..., description="11-digit UDISE code — always STRING")
    school_name: str
    block_name: str
    village_name: str
    district_code: str
    di_score: Optional[float] = Field(None, ge=0, le=100)
    di_category: Optional[str] = None  # critical | high | moderate | stable
    total_enrollment: Optional[int] = None
    total_teachers: Optional[int] = None
    subject_vacancies: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_data_stale: bool = True  # UDISE data is 12-18 months old — always surface this
    geocode_status: str = "PENDING"
    updated_at: Optional[datetime] = None


class SchoolDetail(SchoolSummary):
    """Full school detail including DI breakdown, infrastructure, RTE status."""

    has_toilet: Optional[bool] = None
    has_electricity: Optional[bool] = None
    total_classrooms: Optional[int] = None
    total_classes: Optional[int] = None
    urban_distance_km: Optional[float] = None
    aser_proxy_score: Optional[float] = None
    prev_year_enrollment: Optional[int] = None
    school_category: Optional[str] = None
    medium_of_instruction: Optional[str] = None
    rte_compliant: Optional[bool] = None
    pupil_teacher_ratio: Optional[float] = None
    di_breakdown: Optional[DIBreakdown] = None


class SchoolListResponse(BaseModel):
    """Paginated school list response."""

    schools: list[SchoolSummary]
    total: int
    district_code: str
    page: int = 1
    limit: int = 50
