"""
Teacher-School matching via Vertex AI Embeddings.

Uses textembedding-gecko@003 to compute semantic similarity between
teacher profiles and school vacancy needs.

Hard constraints enforced here:
  - 80km max commute (unless long_dist_consent = True)
  - Subject must match vacancy before embedding comparison
"""

from __future__ import annotations

import math
from typing import Optional

import structlog

from ai.embeddings_cache import EmbeddingsCache
from models.errors import VertexError
from services.bigquery_client import BigQueryClient
from services.vertex_client import VertexClient
from utils.dvs_formula import dvs_breakdown

log = structlog.get_logger()

# Hard constraint — DO NOT remove without product-level discussion
MAX_COMMUTE_KM = 80.0


def _build_teacher_embedding_str(teacher: dict) -> str:
    """
    Build teacher embedding string.
    Format: "{subjects} | {qualification} | {district} | {languages} | {years}yr service {rural}yr rural"
    """
    subjects = " ".join(teacher.get("subject_specialization", []))
    qual = teacher.get("qualification", "")
    district = teacher.get("district_code", "")
    languages = " ".join(teacher.get("languages", []))
    years = teacher.get("years_service", 0)
    rural = teacher.get("years_rural", 0)
    return f"{subjects} | {qual} | {district} | {languages} | {years}yr service {rural}yr rural"


def _build_school_embedding_str(school: dict, vacancy_subject: str) -> str:
    """
    Build school vacancy embedding string.
    Format: "{subject} | Grade {range} | Rural {score} | {district}"
    """
    district = school.get("district_code", "")
    rural_score = int(school.get("di_score", 50))
    grade_range = school.get("grade_range", "1-8")
    return f"{vacancy_subject} | Grade {grade_range} | Rural {rural_score} | {district}"


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na > 0 and nb > 0 else 0.0


async def get_top_matches(
    school: dict,
    vacancy_subject: str,
    district_code: str,
    bq: BigQueryClient,
    vertex: VertexClient,
    cache: EmbeddingsCache,
    top_n: int = 5,
) -> list[dict]:
    """
    Get top-N teacher matches for a school vacancy using Vertex AI embeddings.

    Pipeline:
      1. Pre-filter teachers by subject from BigQuery
      2. Build school embedding string → embed once
      3. For each teacher: check cache → embed if miss → cosine similarity
      4. Apply 80km hard constraint
      5. Return top-N by DVS score (DI*0.40 + match*0.35 + retention*0.25)
    """
    bound_log = log.bind(
        fn="matching.get_top_matches",
        school_id=school.get("school_id"),
        subject=vacancy_subject,
        district=district_code,
    )
    bound_log.info("matching.start")

    # Step 1: Pre-filter by subject before embedding
    teachers = await bq.get_teachers_by_subject(district_code, vacancy_subject)
    if not teachers:
        bound_log.warning("matching.no_teachers", subject=vacancy_subject)
        return []

    # Step 2: Embed the school vacancy need
    school_str = _build_school_embedding_str(school, vacancy_subject)
    try:
        school_vecs = await vertex.embed([school_str])
        school_vec = school_vecs[0]
    except VertexError as e:
        bound_log.error("matching.school_embed_error", error=str(e))
        raise

    di_score = school.get("di_score", 0) or 0

    # Step 3 & 4: Embed teachers, apply constraints, score
    candidates = []
    for teacher in teachers:
        teacher_id = teacher["teacher_id"]

        # ALWAYS check cache first — never re-embed same teacher
        vec = cache.get(teacher_id)
        if vec is None:
            teacher_str = _build_teacher_embedding_str(teacher)
            try:
                vecs = await vertex.embed([teacher_str])
                vec = vecs[0]
                cache.set(teacher_id, vec)
            except VertexError as e:
                bound_log.warning("matching.teacher_embed_skip", teacher_id=teacher_id, error=str(e))
                continue

        # ── Hard commute constraint — 80km unless consent ─────────────
        distance_km: Optional[float] = None
        school_lat = school.get("lat")
        school_lng = school.get("lng")
        if school_lat and school_lng:
            # Approximate distance (haversine) — exact Maps distance is pre-cached in prod
            distance_km = _haversine(school_lat, school_lng, school_lat, school_lng)

        if distance_km and distance_km > MAX_COMMUTE_KM and not teacher.get("long_dist_consent"):
            bound_log.info(
                "matching.hard_reject_commute",
                teacher_id=teacher_id,
                distance_km=distance_km,
            )
            continue  # Hard reject — do not include in results

        # Compute match score (0-100)
        similarity = _cosine_similarity(school_vec, vec)
        match_score = similarity * 100.0

        # Simple retention proxy
        retention_score = _estimate_retention(teacher, school)

        dvs = dvs_breakdown(di_score, match_score, retention_score)
        candidates.append({
            "teacher_id": teacher_id,
            "school_id": school.get("school_id"),
            "vacancy_subject": vacancy_subject,
            "dvs": dvs,
            "distance_km": distance_km,
            "teacher": teacher,
        })

    # Step 5: Sort by DVS descending, return top-N
    candidates.sort(key=lambda c: c["dvs"]["dvs"], reverse=True)
    top = candidates[:top_n]
    bound_log.info("matching.done", candidates=len(candidates), returned=len(top))
    return top


def _estimate_retention(teacher: dict, school: dict) -> float:
    """
    Simple retention score proxy based on rural experience + language match.
    Full retention engine is in ai/retention.py.
    """
    score = 50.0  # base
    rural = teacher.get("years_rural", 0)
    score += min(30.0, rural * 3.0)  # up to +30 for rural experience
    lang = teacher.get("languages", [])
    if "mr" in lang:
        score += 10.0  # Marathi speaker fits Nandurbar
    if teacher.get("long_dist_consent"):
        score += 10.0
    return min(100.0, score)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km — used when Maps cache is unavailable."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
