"""
EduAllocPro FastAPI application — app factory with lifespan context.

All shared state (clients, cache) lives in app.state — NEVER as module globals.
Single worker only — WORKERS=1 in env — state is shared in-process.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

import structlog
import structlog.stdlib
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ai.embeddings_cache import EmbeddingsCache
from api.routes import briefing, deploy, health, schools, teachers
from models.errors import EduAllocError

# ── Structured logging setup ──────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ]
)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize all shared clients on startup, clean up on shutdown."""
    log.info("app.startup.begin")

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "edu-alloc")
    bq_dataset = os.getenv("BQ_DATASET", "edualloc_dataset")
    bq_location = os.getenv("BQ_LOCATION", "us-central1")
    vertex_location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
    gemini_key = os.getenv("GOOGLE_API_KEY", "")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    cache_ttl = float(os.getenv("EMBEDDINGS_CACHE_TTL_HOURS", "24"))
    cache_max = int(os.getenv("EMBEDDINGS_CACHE_MAX_SIZE", "10000"))

    from services.bigquery_client import BigQueryClient
    from services.gemini_client import GeminiClient
    from services.maps_client import MapsClient
    from services.vertex_client import VertexClient

    app.state.bq = BigQueryClient(project_id, bq_dataset, bq_location)
    app.state.vertex = VertexClient(project_id, vertex_location)
    app.state.gemini = GeminiClient(
        api_key=gemini_key,
        model=gemini_model,
        temperature_briefing=float(os.getenv("GEMINI_TEMPERATURE_BRIEFING", "0.3")),
        temperature_order=float(os.getenv("GEMINI_TEMPERATURE_ORDER", "0.6")),
    )
    app.state.maps = MapsClient()
    app.state.embed_cache = EmbeddingsCache(
        max_size=cache_max, ttl_hours=cache_ttl
    )

    # Initialize Firebase Admin if not in dev mode
    if os.getenv("APP_ENV") != "development":
        import firebase_admin
        from firebase_admin import credentials as fb_creds
        if not firebase_admin._apps:
            cred = fb_creds.ApplicationDefault()
            firebase_admin.initialize_app(cred)

    log.info("app.startup.done", project=project_id, dataset=bq_dataset)
    yield

    # Shutdown
    app.state.bq.close()
    app.state.vertex.close()
    app.state.gemini.close()
    log.info("app.shutdown.done")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="EduAllocPro API",
        description="School Intelligence & Teacher Deployment Platform",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Domain error handler ─────────────────────────────────────────────────
    @app.exception_handler(EduAllocError)
    async def edualloc_error_handler(request: Request, exc: EduAllocError):
        log.error(
            "api.error",
            code=exc.code,
            message=exc.message,
            path=str(request.url),
        )
        return JSONResponse(status_code=exc.status, content=exc.to_dict())

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(health.router, prefix="/api")
    app.include_router(schools.router, prefix="/api")
    app.include_router(teachers.router, prefix="/api")
    app.include_router(deploy.router, prefix="/api")
    app.include_router(briefing.router, prefix="/api")

    return app


app = create_app()
