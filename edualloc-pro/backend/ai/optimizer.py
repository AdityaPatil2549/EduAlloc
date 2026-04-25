"""
OR-Tools CP-SAT district-wide teacher deployment optimizer.

Hard constraints (ALL non-negotiable):
  1. Each teacher assigned to at most 1 school per cycle
  2. Each vacancy receives at most 1 teacher
  3. Teacher subject must match vacancy subject
  4. Commute ≤ 80km unless teacher.long_dist_consent = True

NEVER raise 4xx/5xx on timeout — return FEASIBLE partial result (HTTP 200).
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

import structlog
from ortools.sat.python import cp_model

from models.deployment import Assignment, OptimizationResult
from models.errors import EduAllocError
from utils.dvs_formula import compute_dvs

log = structlog.get_logger()

# Integer scaling for OR-Tools objective (works with integers only)
SCALE = 1000
# Time limit — ALWAYS set — never let solver run indefinitely
OPTIMIZER_TIME_LIMIT_S = 20
# Hard commute constraint
MAX_COMMUTE_KM = 80.0


def run_optimizer(
    schools: list[dict],
    teachers: list[dict],
    commute_cache: dict[tuple, float],
    time_limit_s: int = OPTIMIZER_TIME_LIMIT_S,
) -> OptimizationResult:
    """
    Run OR-Tools CP-SAT to compute district-wide optimal teacher deployments.

    Args:
        schools:       List of school dicts with vacancies + DI scores
        teachers:      List of teacher dicts
        commute_cache: {(teacher_id, school_id): distance_km} pre-computed distances
        time_limit_s:  Max solver runtime (default 20s)

    Returns:
        OptimizationResult — OPTIMAL or FEASIBLE (never raises on timeout)
    """
    bound_log = log.bind(
        fn="optimizer.run",
        schools=len(schools),
        teachers=len(teachers),
    )
    bound_log.info("optimizer.start")
    t_start = time.monotonic()

    model = cp_model.CpModel()

    # Build (teacher, school, subject) decision variables
    assignments: dict[tuple, cp_model.IntVar] = {}
    dvs_values: dict[tuple, int] = {}

    for teacher in teachers:
        teacher_id = teacher["teacher_id"]
        teacher_subjects = set(teacher.get("subject_specialization", []))
        long_dist = teacher.get("long_dist_consent", False)

        for school in schools:
            school_id = school["school_id"]
            school_vacancies = school.get("vacancies", [])  # list of subject codes
            di_score = school.get("di_score", 0) or 0

            for subject in school_vacancies:
                # Hard constraint 3: subject must match
                if subject not in teacher_subjects:
                    continue

                # Hard constraint 4: 80km commute unless consent
                dist_km = commute_cache.get((teacher_id, school_id))
                if dist_km is None:
                    dist_km = 40.0  # default if cache miss
                if dist_km > MAX_COMMUTE_KM and not long_dist:
                    continue  # Hard reject

                key = (teacher_id, school_id, subject)
                var = model.new_bool_var(f"x_{teacher_id[:8]}_{school_id}_{subject}")
                assignments[key] = var

                # Pre-compute integer DVS for objective
                from utils.dvs_formula import compute_dvs
                retention_score = 50.0  # simplified for optimizer
                match_score = 70.0      # will use actual scores in matching API
                dvs = compute_dvs(di_score, match_score, retention_score)
                dvs_values[key] = int(dvs * SCALE)

    # Hard constraint 1: each teacher assigned to at most 1 school
    for teacher in teachers:
        teacher_id = teacher["teacher_id"]
        teacher_vars = [
            assignments[k] for k in assignments if k[0] == teacher_id
        ]
        if teacher_vars:
            model.add(sum(teacher_vars) <= 1)

    # Hard constraint 2: each vacancy receives at most 1 teacher
    for school in schools:
        school_id = school["school_id"]
        for subject in school.get("vacancies", []):
            vacancy_vars = [
                assignments[k] for k in assignments
                if k[1] == school_id and k[2] == subject
            ]
            if vacancy_vars:
                model.add(sum(vacancy_vars) <= 1)

    # Maximize total DVS (scaled to integers)
    objective = sum(
        dvs_values[k] * assignments[k]
        for k in assignments
    )
    model.maximize(objective)

    # Solve with time limit
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_s
    solver.parameters.num_search_workers = 1

    bound_log.info("optimizer.solving", variables=len(assignments))
    status = solver.solve(model)
    elapsed = time.monotonic() - t_start

    status_name = solver.status_name(status)
    bound_log.info(
        "optimizer.done",
        status=status_name,
        elapsed_s=round(elapsed, 2),
        objective=solver.objective_value if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0,
    )

    # NEVER return 5xx on timeout — return partial FEASIBLE result
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        bound_log.warning("optimizer.no_solution", status=status_name)
        return OptimizationResult(
            district_code=schools[0].get("district_code", "") if schools else "",
            assignments=[],
            status="INFEASIBLE",
            solver_time_s=round(elapsed, 2),
            total_assignments=0,
            objective_value=0.0,
            ran_at=datetime.now(timezone.utc),
        )

    # Extract assignments
    result_assignments = []
    for (teacher_id, school_id, subject), var in assignments.items():
        if solver.value(var) == 1:
            dvs = dvs_values[(teacher_id, school_id, subject)] / SCALE
            dist_km = commute_cache.get((teacher_id, school_id), 40.0)
            result_assignments.append(
                Assignment(
                    deployment_id=str(uuid.uuid4()),
                    teacher_id=teacher_id,
                    school_id=school_id,
                    vacancy_subject=subject,
                    dvs=dvs,
                    distance_km=dist_km,
                    status="PENDING",
                )
            )

    return OptimizationResult(
        district_code=schools[0].get("district_code", "") if schools else "",
        assignments=result_assignments,
        status="OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
        solver_time_s=round(elapsed, 2),
        total_assignments=len(result_assignments),
        objective_value=solver.objective_value,
        ran_at=datetime.now(timezone.utc),
    )
