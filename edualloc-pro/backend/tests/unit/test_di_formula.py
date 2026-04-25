"""Unit tests for di_formula.py — pure function tests, zero I/O."""

from __future__ import annotations

import pytest

from utils.di_formula import (
    DI_WEIGHTS,
    DIInput,
    compute_deprivation_index,
)


def test_di_weights_sum_to_one():
    assert abs(sum(DI_WEIGHTS.values()) - 1.0) < 1e-9


def test_perfect_school_scores_zero():
    """Best possible school — DI should be near 0."""
    data = DIInput(
        total_enrollment=200,
        prev_year_enrollment=190,
        total_teachers=10,
        subject_vacancies=0,
        has_toilet=True,
        has_electricity=True,
        total_classrooms=12,
        total_classes=8,
        urban_distance_km=2.0,
        aser_proxy_score=90.0,
    )
    result = compute_deprivation_index(data)
    assert result.composite_di < 10.0, f"Expected near-0, got {result.composite_di}"
    assert result.data_quality == "OK"
    assert result.missing_signals == []


def test_worst_school_scores_high():
    """Most deprived school — DI should be near 100."""
    data = DIInput(
        total_enrollment=400,
        prev_year_enrollment=500,
        total_teachers=1,
        subject_vacancies=6,
        has_toilet=False,
        has_electricity=False,
        total_classrooms=2,
        total_classes=8,
        urban_distance_km=90.0,
        aser_proxy_score=5.0,
    )
    result = compute_deprivation_index(data)
    assert result.composite_di > 85.0, f"Expected near-100, got {result.composite_di}"
    assert result.data_quality == "OK"


def test_insufficient_data_flag():
    """School with >3 missing signals → INSUFFICIENT_DATA."""
    data = DIInput(
        total_enrollment=100,
        # Missing: total_teachers, subject_vacancies, has_toilet, has_electricity,
        #          total_classrooms, total_classes, urban_distance_km, aser_proxy_score
    )
    result = compute_deprivation_index(data)
    assert result.data_quality == "INSUFFICIENT_DATA"
    assert len(result.missing_signals) > 3


def test_null_input_returns_insufficient():
    """Completely empty input."""
    result = compute_deprivation_index(DIInput())
    assert result.data_quality == "INSUFFICIENT_DATA"


def test_partial_data_quality_ok_with_few_missing():
    """3 or fewer missing signals → PARTIAL (still scored)."""
    data = DIInput(
        total_enrollment=150,
        prev_year_enrollment=160,
        total_teachers=4,
        subject_vacancies=2,
        has_toilet=False,
        has_electricity=True,
        total_classrooms=5,
        total_classes=5,
        urban_distance_km=35.0,
        # aser_proxy_score missing — 1 missing signal
    )
    result = compute_deprivation_index(data)
    assert result.data_quality == "PARTIAL"
    assert "aser_proxy" in result.missing_signals
    assert result.composite_di is not None


def test_di_score_in_range():
    """DI score must always be [0, 100]."""
    data = DIInput(
        total_enrollment=1,
        prev_year_enrollment=1000,
        total_teachers=0,
        subject_vacancies=99,
        has_toilet=False,
        has_electricity=False,
        total_classrooms=0,
        total_classes=8,
        urban_distance_km=200.0,
        aser_proxy_score=0.0,
    )
    result = compute_deprivation_index(data)
    assert 0.0 <= result.composite_di <= 100.0
