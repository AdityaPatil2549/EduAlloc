"""
FastAPI shared dependencies — injected via Depends() in all route handlers.

NEVER call BigQuery/Vertex/Gemini directly in routes — always use these deps.
"""

from __future__ import annotations

import os

import structlog
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models.errors import AuthError

log = structlog.get_logger()
bearer = HTTPBearer(auto_error=False)


def get_bq_client(request: Request):
    """Inject BigQuery client from app.state."""
    return request.app.state.bq


def get_vertex_client(request: Request):
    """Inject Vertex AI client from app.state."""
    return request.app.state.vertex


def get_gemini_client(request: Request):
    """Inject Gemini client from app.state."""
    return request.app.state.gemini


def get_embeddings_cache(request: Request):
    """Inject embeddings cache from app.state."""
    return request.app.state.embed_cache


def get_maps_client(request: Request):
    """Inject Maps client from app.state."""
    return request.app.state.maps


async def verify_firebase_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    """
    Verify Firebase JWT token from Authorization: Bearer <token>.

    Returns decoded token payload dict.
    In development mode (APP_ENV=development), allows bypass with X-Dev-Role header.
    """
    app_env = os.getenv("APP_ENV", "development")

    # ── Dev mode bypass — NEVER enabled in production ────────────────
    if app_env == "development":
        dev_role = request.headers.get("X-Dev-Role", "officer")
        return {"uid": "dev-user", "role": dev_role, "district_code": "NDB01"}

    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        import firebase_admin.auth as firebase_auth
        decoded = firebase_admin.auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception as e:
        log.warning("auth.token_invalid", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid or expired token")
