"""
Deprivation Index formula — pure functions, ZERO I/O.

Computes composite DI score (0-100) from 8 UDISE signals.
Higher score = more deprived = higher deployment priority.

DO NOT modify weights without explicit product-level discussion.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

# ── DI Signal Weights — DO NOT CHANGE ────────────────────────────────────────
DI_WEIGHTS: dict[str, float] = {
    "stu_tea_ratio":   0.25,
    "subject_vacancy": 0.20,
    "toilet":          0.15,
    "electricity":     0.10,
    "classroom_ratio": 0.10,
    "urban_distance":  0.08,
    "enrollment_trend":0.07,
    "aser_proxy":      0.05,
}
assert abs(sum(DI_WEIGHTS.values()) - 1.0) < 1e-9, "DI_WEIGHTS must sum to 1.0"


@dataclass
class DIInput:
    """Raw UDISE signals required to compute the Deprivation Index."""

    total_enrollment: Optional[int] = None
    prev_year_enrollment: Optional[int] = None
    total_teachers: Optional[int] = None
    subject_vacancies: Optional[int] = None
    has_toilet: Optional[bool] = None
    has_electricity: Optional[bool] = None
    total_classrooms: Optional[int] = None
    total_classes: Optional[int] = None
    urban_distance_km: Optional[float] = None
    aser_proxy_score: Optional[float] = None


@dataclass
class DIOutput:
    """DI computation result with per-signal breakdown."""

    composite_di: float
    signal_scores: dict[str, float]
    data_quality: str  # 'OK' | 'PARTIAL' | 'INSUFFICIENT_DATA'
    missing_signals: list[str]


def _score_stu_tea_ratio(enrollment: int, teachers: int) -> float:
    """Higher ratio = more deprived. 20:1 → 0, 60:1 → 100."""
    if teachers <= 0:
        return 100.0
    ratio = enrollment / teachers
    if ratio <= 20:
        return 0.0
    if ratio >= 60:
        return 100.0
    return (ratio - 20) / 40 * 100.0


def _score_subject_vacancy(vacancies: int) -> float:
    """More vacancies = more deprived. 0 → 0, ≥5 → 100."""
    if vacancies <= 0:
        return 0.0
    if vacancies >= 5:
        return 100.0
    return vacancies / 5 * 100.0


def _score_toilet(has_toilet: bool) -> float:
    """No toilet = 100 (most deprived)."""
    return 0.0 if has_toilet else 100.0


def _score_electricity(has_electricity: bool) -> float:
    """No electricity = 100 (most deprived)."""
    return 0.0 if has_electricity else 100.0


def _score_classroom_ratio(classrooms: int, classes: int) -> float:
    """
    Ratio < 1.0 means students share classrooms → deprived.
    ratio ≥ 1.0 → 0, ratio ≤ 0.3 → 100.
    """
    if classes <= 0:
        return 50.0  # missing data — assume moderate
    ratio = classrooms / classes
    if ratio >= 1.0:
        return 0.0
    if ratio <= 0.3:
        return 100.0
    return (1.0 - ratio) / 0.7 * 100.0


def _score_urban_distance(km: float) -> float:
    """Further from urban centre = more deprived. ≤5km → 0, ≥80km → 100."""
    if km <= 5:
        return 0.0
    if km >= 80:
        return 100.0
    return (km - 5) / 75 * 100.0


def _score_enrollment_trend(current: int, prev: int) -> float:
    """
    Declining enrollment = more deprived.
    trend ≥ +5% → 0, trend ≤ -30% → 100.
    """
    if prev <= 0:
        return 50.0
    trend = (current - prev) / prev
    if trend >= 0.05:
        return 0.0
    if trend <= -0.30:
        return 100.0
    return (-trend) / 0.30 * 100.0


def _score_aser_proxy(score: float) -> float:
    """Lower ASER learning outcome = more deprived. Inverted: score 0 → 100, score 100 → 0."""
    return 100.0 - max(0.0, min(100.0, score))


def compute_deprivation_index(data: DIInput) -> DIOutput:
    """
    Compute composite Deprivation Index from 8 UDISE signals.

    Returns DIOutput with composite_di, per-signal scores, and data quality flag.
    Pure function — no I/O, no side effects.

    If >3 signals are missing, returns data_quality='INSUFFICIENT_DATA'
    and composite_di=None (school still appears in dashboard, sorted last).
    """
    signal_scores: dict[str, float] = {}
    missing: list[str] = []

    # ── Signal 1: Student-Teacher Ratio ──────────────────────────
    if data.total_enrollment is not None and data.total_teachers is not None:
        signal_scores["stu_tea_ratio"] = _score_stu_tea_ratio(
            data.total_enrollment, data.total_teachers
        )
    else:
        missing.append("stu_tea_ratio")

    # ── Signal 2: Subject Vacancy ─────────────────────────────────
    if data.subject_vacancies is not None:
        signal_scores["subject_vacancy"] = _score_subject_vacancy(data.subject_vacancies)
    else:
        missing.append("subject_vacancy")

    # ── Signal 3: Toilet ──────────────────────────────────────────
    if data.has_toilet is not None:
        signal_scores["toilet"] = _score_toilet(data.has_toilet)
    else:
        missing.append("toilet")

    # ── Signal 4: Electricity ─────────────────────────────────────
    if data.has_electricity is not None:
        signal_scores["electricity"] = _score_electricity(data.has_electricity)
    else:
        missing.append("electricity")

    # ── Signal 5: Classroom Ratio ─────────────────────────────────
    if data.total_classrooms is not None and data.total_classes is not None:
        signal_scores["classroom_ratio"] = _score_classroom_ratio(
            data.total_classrooms, data.total_classes
        )
    else:
        missing.append("classroom_ratio")

    # ── Signal 6: Urban Distance ──────────────────────────────────
    if data.urban_distance_km is not None:
        signal_scores["urban_distance"] = _score_urban_distance(data.urban_distance_km)
    else:
        missing.append("urban_distance")

    # ── Signal 7: Enrollment Trend ────────────────────────────────
    if data.total_enrollment is not None and data.prev_year_enrollment is not None:
        signal_scores["enrollment_trend"] = _score_enrollment_trend(
            data.total_enrollment, data.prev_year_enrollment
        )
    else:
        missing.append("enrollment_trend")

    # ── Signal 8: ASER Proxy ──────────────────────────────────────
    if data.aser_proxy_score is not None:
        signal_scores["aser_proxy"] = _score_aser_proxy(data.aser_proxy_score)
    else:
        missing.append("aser_proxy")

    # ── Data Quality Gate ─────────────────────────────────────────
    if len(missing) > 3:
        return DIOutput(
            composite_di=0.0,
            signal_scores=signal_scores,
            data_quality="INSUFFICIENT_DATA",
            missing_signals=missing,
        )

    # ── Compute Weighted Composite ────────────────────────────────
    total_weight = 0.0
    weighted_sum = 0.0
    for signal, score in signal_scores.items():
        w = DI_WEIGHTS[signal]
        weighted_sum += w * score
        total_weight += w

    # Normalize if some signals were missing
    composite = weighted_sum / total_weight * 100.0 / 100.0 if total_weight > 0 else 0.0
    composite = max(0.0, min(100.0, composite))

    quality = "OK" if len(missing) == 0 else "PARTIAL"

    return DIOutput(
        composite_di=round(composite, 2),
        signal_scores=signal_scores,
        data_quality=quality,
        missing_signals=missing,
    )
