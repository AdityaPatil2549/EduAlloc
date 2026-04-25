"""Pydantic v2 models for teacher data."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class Teacher(BaseModel):
    """Teacher profile for roster listing."""

    teacher_id: str = Field(..., description="UUID v4 (Phase 1 synthetic) or HRMS ID")
    district_code: str
    subject_specialization: list[str] = Field(..., description="Subject codes, e.g. ['MATH','SCI']")
    qualification: str
    years_service: int = Field(ge=0)
    years_rural: int = Field(ge=0)
    languages: list[str] = Field(default_factory=list, description="['mr','hi','en']")
    long_dist_consent: bool = False
    current_school_id: Optional[str] = None
    is_synthetic: bool = True
    created_at: Optional[datetime] = None


class TeacherProfile(Teacher):
    """Extended teacher profile including embedding vector status."""

    embedding_cached: bool = False
    embedding_updated_at: Optional[datetime] = None


class TeacherListResponse(BaseModel):
    """Paginated teacher roster response."""

    teachers: list[Teacher]
    total: int
    district_code: str
