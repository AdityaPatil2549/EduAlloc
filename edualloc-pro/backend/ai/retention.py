"""
Retention risk proxy scorer — estimates likelihood a teacher stays long-term.

Retention score 0-100: higher = more likely to stay = lower risk.
Pure heuristic in Phase 1 — no historical data yet.
"""

from __future__ import annotations

import structlog

log = structlog.get_logger()

# Retention weight factors
_RURAL_EXP_WEIGHT = 30.0   # up to +30 for rural experience
_RURAL_YEARS_MAX = 10      # 10+ years rural → max rural bonus
_LANG_BONUS = 10.0         # Marathi speaker in Nandurbar
_CONSENT_BONUS = 10.0      # long_dist_consent = True
_QUAL_BONUS = 5.0          # higher qualification
_BASE_SCORE = 40.0         # default baseline


def compute_retention_score(teacher: dict, school: dict) -> float:
    """
    Compute retention risk proxy for a teacher-school pair.

    Higher score = teacher more likely to stay long-term = preferred.

    Factors:
      - Rural experience (years_rural)
      - Language match with school's district
      - Long distance consent
      - Qualification level
      - Current proximity (same block preferred)

    Returns float [0, 100].
    """
    bound_log = log.bind(
        fn="retention.compute",
        teacher_id=teacher.get("teacher_id", "unknown"),
        school_id=school.get("school_id", "unknown"),
    )

    score = _BASE_SCORE

    # Rural experience bonus
    rural_years = min(teacher.get("years_rural", 0), _RURAL_YEARS_MAX)
    rural_bonus = (rural_years / _RURAL_YEARS_MAX) * _RURAL_EXP_WEIGHT
    score += rural_bonus

    # Language bonus — Marathi + local languages are critical in tribal districts
    languages = teacher.get("languages", [])
    if "mr" in languages:
        score += _LANG_BONUS
    if "gondi" in languages or "pavri" in languages:
        score += 5.0  # tribal language bonus for Nandurbar

    # Long distance consent
    if teacher.get("long_dist_consent"):
        score += _CONSENT_BONUS

    # Same block preference
    teacher_school = teacher.get("current_school_id", "")
    school_block = school.get("block_name", "")
    # If teacher is already in the same block, retention is higher
    if teacher_school and school_block and school_block.lower() in teacher_school.lower():
        score += 5.0

    # Qualification bonus
    qual = teacher.get("qualification", "").upper()
    if "PHD" in qual or "MPHIL" in qual:
        score += _QUAL_BONUS
    elif "MSC" in qual or "MA" in qual:
        score += 3.0
    elif "BSC" in qual or "BA" in qual:
        score += 1.0

    final = max(0.0, min(100.0, score))
    bound_log.info("retention.done", score=final)
    return round(final, 2)
