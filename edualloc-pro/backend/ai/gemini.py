"""
Gemini AI pipeline — district briefings + deployment order generation.

Uses GeminiClient service — never calls genai directly.
ALWAYS validates output JSON schema before returning.
Temperature: 0.3 for briefings (factual), 0.6 for order narrative.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

import structlog

from services.gemini_client import GeminiClient

log = structlog.get_logger()

BRIEFING_PROMPT_TEMPLATE = """
You are an education data analyst for the Maharashtra government.
Generate a weekly district briefing for Block Education Officers in Nandurbar district.

District: {district_name} ({district_code})
Week ending: {week_ending}
Total schools: {total_schools}
Schools with critical deprivation (DI ≥ 80): {critical_count}
Schools with high deprivation (DI 60-79): {high_count}
Pending teacher vacancies: {total_vacancies}
Recent deployments: {recent_deployments}

Top 5 priority schools by Deprivation Index:
{priority_schools_json}

Generate a JSON object with EXACTLY these keys:
- "summary": 2-3 paragraph English summary for district officers
- "marathi_summary": same summary translated to Marathi (Devanagari script)
- "priority_schools": list of up to 5 school_ids that need immediate teacher deployment
- "recommendations": list of 3-5 specific action items for this week
- "week_ending": ISO date string for this week end
- "critical_count": integer
- "pending_vacancies": integer

Respond with valid JSON only. No markdown, no explanation.
"""

ORDER_PROMPT_TEMPLATE = """
You are drafting an official government teacher deployment order for Maharashtra Education Department.

District: {district_name}
Deployment ID: {deployment_id}
Date: {order_date}
Total assignments: {total_assignments}

Assignments:
{assignments_json}

Generate a JSON object with:
- "order_number": formal order number string
- "narrative": 2-3 paragraph formal government language narrative in English
- "marathi_narrative": same in Marathi (Devanagari script)
- "effective_date": ISO date string (2 weeks from today)
- "signed_by": "District Education Officer, Nandurbar"

Respond with valid JSON only.
"""


async def generate_district_briefing(
    district_code: str,
    district_name: str,
    schools: list[dict],
    recent_deployments: int,
    gemini: GeminiClient,
) -> dict:
    """
    Generate weekly district briefing using Gemini 1.5 Pro.

    Returns validated JSON dict with English + Marathi summary.
    """
    bound_log = log.bind(fn="gemini.briefing", district=district_code)
    bound_log.info("briefing.start")

    critical = sum(1 for s in schools if (s.get("di_score") or 0) >= 80)
    high = sum(1 for s in schools if 60 <= (s.get("di_score") or 0) < 80)
    total_vacancies = sum(s.get("subject_vacancies", 0) or 0 for s in schools)

    priority = sorted(
        [s for s in schools if s.get("di_score")],
        key=lambda s: s.get("di_score", 0),
        reverse=True,
    )[:5]
    priority_json = str([
        {"school_id": s.get("school_id"), "school_name": s.get("school_name"), "di_score": s.get("di_score")}
        for s in priority
    ])

    prompt = BRIEFING_PROMPT_TEMPLATE.format(
        district_name=district_name,
        district_code=district_code,
        week_ending=date.today().isoformat(),
        total_schools=len(schools),
        critical_count=critical,
        high_count=high,
        total_vacancies=total_vacancies,
        recent_deployments=recent_deployments,
        priority_schools_json=priority_json,
    )

    result = await gemini.generate_briefing(prompt)
    bound_log.info("briefing.done")
    return result


async def generate_deployment_order(
    district_name: str,
    deployment_id: str,
    assignments: list[dict],
    gemini: GeminiClient,
) -> dict:
    """Generate deployment order narrative using Gemini 1.5 Pro."""
    bound_log = log.bind(fn="gemini.order", deployment_id=deployment_id)
    bound_log.info("order.start")

    prompt = ORDER_PROMPT_TEMPLATE.format(
        district_name=district_name,
        deployment_id=deployment_id,
        order_date=date.today().isoformat(),
        total_assignments=len(assignments),
        assignments_json=str(assignments[:10]),  # limit tokens
    )

    result = await gemini.generate_order_narrative(prompt)
    bound_log.info("order.done")
    return result
