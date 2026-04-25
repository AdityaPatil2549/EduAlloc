"""Unit tests for dvs_formula.py."""

from __future__ import annotations

from utils.dvs_formula import DVS_WEIGHTS, compute_dvs, dvs_breakdown


def test_dvs_weights_sum_to_one():
    assert abs(sum(DVS_WEIGHTS.values()) - 1.0) < 1e-9


def test_dvs_max_score():
    dvs = compute_dvs(100, 100, 100)
    assert abs(dvs - 1.0) < 1e-6


def test_dvs_min_score():
    dvs = compute_dvs(0, 0, 0)
    assert dvs == 0.0


def test_dvs_formula_weights():
    """Verify formula: DI*0.40 + match*0.35 + retention*0.25."""
    dvs = compute_dvs(100, 0, 0)
    assert abs(dvs - 0.40) < 1e-6

    dvs = compute_dvs(0, 100, 0)
    assert abs(dvs - 0.35) < 1e-6

    dvs = compute_dvs(0, 0, 100)
    assert abs(dvs - 0.25) < 1e-6


def test_dvs_clamps_inputs():
    """Values outside [0,100] are clamped."""
    dvs_over = compute_dvs(150, 150, 150)
    dvs_max = compute_dvs(100, 100, 100)
    assert dvs_over == dvs_max

    dvs_under = compute_dvs(-10, -10, -10)
    assert dvs_under == 0.0


def test_dvs_breakdown_keys():
    result = dvs_breakdown(80, 70, 60)
    required = {"dvs", "di_component", "match_component", "retention_component",
                "di_score", "match_score", "retention_score"}
    assert required.issubset(result.keys())


def test_dvs_breakdown_sum():
    result = dvs_breakdown(80, 70, 60)
    total = result["di_component"] + result["match_component"] + result["retention_component"]
    assert abs(total - result["dvs"]) < 1e-6
