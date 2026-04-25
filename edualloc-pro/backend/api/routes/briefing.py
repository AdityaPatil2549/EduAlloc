"""
Briefing API routes:
  GET  /api/briefing         — Gemini weekly district briefing JSON
  POST /api/briefing/order   — Generate deployment order PDF
"""

from __future__ import annotations

import io

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from ai import gemini as gemini_ai
from api.deps import get_bq_client, get_gemini_client, verify_firebase_token
from models.errors import GeminiError

log = structlog.get_logger()
router = APIRouter(tags=["briefing"])


@router.get("/briefing")
async def get_briefing(
    district_id: str = Query("NDB01"),
    bq=Depends(get_bq_client),
    gemini=Depends(get_gemini_client),
    _user=Depends(verify_firebase_token),
) -> dict:
    """
    GET /api/briefing?district_id=NDB01

    Generates weekly district briefing using Gemini 1.5 Pro.
    Returns validated JSON with English + Marathi summary.
    """
    bound_log = log.bind(fn="briefing.get", district=district_id)
    bound_log.info("briefing.start")

    schools = await bq.get_schools(district_id, limit=100)

    district_names = {"NDB01": "Nandurbar"}
    district_name = district_names.get(district_id, district_id)

    result = await gemini_ai.generate_district_briefing(
        district_code=district_id,
        district_name=district_name,
        schools=schools,
        recent_deployments=0,
        gemini=gemini,
    )

    bound_log.info("briefing.done")
    return result


class OrderRequest(dict):
    pass


@router.post("/briefing/order")
async def generate_order(
    district_id: str = Query("NDB01"),
    deployment_id: str = Query(...),
    bq=Depends(get_bq_client),
    gemini=Depends(get_gemini_client),
    _user=Depends(verify_firebase_token),
) -> StreamingResponse:
    """
    POST /api/briefing/order?district_id=NDB01&deployment_id=uuid

    Generates a PDF deployment order using Gemini narrative + ReportLab.
    Returns PDF as streaming response.
    """
    bound_log = log.bind(fn="briefing.order", district=district_id, deployment=deployment_id)
    bound_log.info("order.start")

    # Get assignments for this deployment
    assignments = []  # TODO: fetch from deployments table

    narrative = await gemini_ai.generate_deployment_order(
        district_name="Nandurbar",
        deployment_id=deployment_id,
        assignments=assignments,
        gemini=gemini,
    )

    from utils.pdf_generator import generate_deployment_order_pdf
    pdf_bytes = generate_deployment_order_pdf(narrative, district_id, deployment_id)

    bound_log.info("order.pdf.done", size_bytes=len(pdf_bytes))
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=order_{deployment_id[:8]}.pdf"},
    )
