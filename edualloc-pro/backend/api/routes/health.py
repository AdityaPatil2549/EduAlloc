"""Health check — liveness probe, no auth required."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
    service: str = "edualloc-api"


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """GET /api/health — liveness probe for Cloud Run."""
    return HealthResponse(status="ok")
