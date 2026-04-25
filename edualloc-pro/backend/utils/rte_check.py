"""RTE (Right to Education) PTR compliance checker — pure functions, ZERO I/O."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

# ── RTE PTR Norms (Right to Education Act 2009) ──────────────────────────────
# Classes I-V:   max 30 students per teacher
# Classes VI-VIII: max 35 students per teacher
PTR_NORM_PRIMARY = 30       # Classes I-V
PTR_NORM_UPPER_PRIMARY = 35  # Classes VI-VIII


@dataclass
class RTEResult:
    """RTE compliance check result."""

    is_compliant: bool
    pupil_teacher_ratio: Optional[float]
    norm_applied: int
    shortfall_teachers: int  # 0 if compliant, >0 = teachers needed
    message: str


def check_rte_compliance(
    total_enrollment: int,
    total_teachers: int,
    school_category: str = "PRIMARY",
) -> RTEResult:
    """
    Check if school meets RTE 2009 Pupil-Teacher Ratio norms.

    Args:
        total_enrollment:  Total student count
        total_teachers:    Sanctioned + actual teacher count
        school_category:   'PRIMARY' (I-V) or 'UPPER_PRIMARY' (I-VIII)

    Returns:
        RTEResult with compliance status and shortfall count
    """
    if total_teachers <= 0:
        return RTEResult(
            is_compliant=False,
            pupil_teacher_ratio=None,
            norm_applied=PTR_NORM_PRIMARY,
            shortfall_teachers=max(1, total_enrollment // PTR_NORM_PRIMARY),
            message="No teachers — severe non-compliance",
        )

    norm = (
        PTR_NORM_UPPER_PRIMARY
        if "UPPER" in school_category.upper()
        else PTR_NORM_PRIMARY
    )
    ptr = total_enrollment / total_teachers
    teachers_needed = max(0, (total_enrollment + norm - 1) // norm)
    shortfall = max(0, teachers_needed - total_teachers)

    return RTEResult(
        is_compliant=ptr <= norm,
        pupil_teacher_ratio=round(ptr, 1),
        norm_applied=norm,
        shortfall_teachers=shortfall,
        message=(
            "Compliant"
            if ptr <= norm
            else f"Non-compliant — PTR {ptr:.1f}:{1} exceeds norm {norm}:{1}"
        ),
    )
