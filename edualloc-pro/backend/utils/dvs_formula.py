"""
Deployment Value Score (DVS) formula — pure function, ZERO I/O.

DVS = (DI/100)*0.40 + (match_score/100)*0.35 + (retention_score/100)*0.25

DO NOT modify weights without explicit product-level discussion.
"""

from __future__ import annotations

# ── DVS Weights — DO NOT CHANGE ──────────────────────────────────────────────
DVS_WEIGHTS: dict[str, float] = {
    "di":        0.40,  # equity — most deprived schools get priority
    "match":     0.35,  # efficiency — best subject fit
    "retention": 0.25,  # sustainability — teacher stays long-term
}
assert abs(sum(DVS_WEIGHTS.values()) - 1.0) < 1e-9, "DVS_WEIGHTS must sum to 1.0"


def compute_dvs(di_score: float, match_score: float, retention_score: float) -> float:
    """
    Compute Deployment Value Score.

    Args:
        di_score:        Deprivation Index score [0, 100]
        match_score:     Teacher-school embedding similarity [0, 100]
        retention_score: Retention risk proxy [0, 100]

    Returns:
        DVS in [0.0, 1.0] — higher = better placement candidate
    """
    di_score = max(0.0, min(100.0, di_score))
    match_score = max(0.0, min(100.0, match_score))
    retention_score = max(0.0, min(100.0, retention_score))

    dvs = (
        (di_score / 100.0) * DVS_WEIGHTS["di"]
        + (match_score / 100.0) * DVS_WEIGHTS["match"]
        + (retention_score / 100.0) * DVS_WEIGHTS["retention"]
    )
    return round(dvs, 4)


def dvs_breakdown(di_score: float, match_score: float, retention_score: float) -> dict:
    """
    Return DVS with per-component breakdown for frontend DVSMeter display.

    Returns dict with keys: dvs, di_component, match_component, retention_component
    """
    di_score = max(0.0, min(100.0, di_score))
    match_score = max(0.0, min(100.0, match_score))
    retention_score = max(0.0, min(100.0, retention_score))

    di_comp = (di_score / 100.0) * DVS_WEIGHTS["di"]
    match_comp = (match_score / 100.0) * DVS_WEIGHTS["match"]
    ret_comp = (retention_score / 100.0) * DVS_WEIGHTS["retention"]

    return {
        "dvs": round(di_comp + match_comp + ret_comp, 4),
        "di_component": round(di_comp, 4),
        "match_component": round(match_comp, 4),
        "retention_component": round(ret_comp, 4),
        "di_score": di_score,
        "match_score": match_score,
        "retention_score": retention_score,
    }
