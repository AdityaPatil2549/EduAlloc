"""
BigQuery async client — all queries parameterized, runs in ThreadPoolExecutor.

NEVER call BigQuery directly from ai/ modules — always use this service.
NEVER block the FastAPI event loop — always use _run() wrapper.
NEVER use SELECT * — always name required columns.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import structlog
from google.cloud import bigquery

from models.errors import BigQueryError

log = structlog.get_logger()


class BigQueryClient:
    """Async-safe BigQuery client using ThreadPoolExecutor."""

    def __init__(self, project_id: str, dataset: str, location: str = "us-central1") -> None:
        self._project = project_id
        self._dataset = dataset
        self._location = location
        self._client = bigquery.Client(project=project_id)
        self._pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="bq")
        log.info("bq.client.init", project=project_id, dataset=dataset)

    async def _run(self, fn, *args) -> Any:
        """Run a synchronous BQ call in the thread pool — never blocks the event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._pool, lambda: fn(*args))

    def _full_table(self, table: str) -> str:
        return f"`{self._project}.{self._dataset}.{table}`"

    async def query(self, sql: str, params: list[bigquery.ScalarQueryParameter]) -> list[dict]:
        """
        Execute a parameterized query and return rows as list of dicts.

        Args:
            sql:    Parameterized SQL with @param_name placeholders
            params: List of ScalarQueryParameter — NEVER build SQL with f-strings
        """
        job_config = bigquery.QueryJobConfig(query_parameters=params)
        bound_log = log.bind(fn="bq.query", sql_preview=sql[:120])
        bound_log.info("bq.query.start")

        def _run_query():
            try:
                job = self._client.query(sql, job_config=job_config, location=self._location)
                rows = list(job.result())
                return [dict(row) for row in rows]
            except Exception as e:
                bound_log.error("bq.query.error", error=str(e))
                raise BigQueryError(str(e))

        try:
            result = await self._run(_run_query)
            bound_log.info("bq.query.done", row_count=len(result))
            return result
        except BigQueryError:
            raise
        except Exception as e:
            bound_log.error("bq.query.unexpected", error=str(e))
            raise BigQueryError(f"Unexpected BQ error: {e}")

    async def insert_rows(self, table: str, rows: list[dict]) -> None:
        """Stream-insert rows into a BQ table."""
        bound_log = log.bind(fn="bq.insert", table=table, count=len(rows))
        bound_log.info("bq.insert.start")

        def _do_insert():
            table_ref = self._client.get_table(f"{self._project}.{self._dataset}.{table}")
            errors = self._client.insert_rows_json(table_ref, rows)
            if errors:
                raise BigQueryError(f"BQ insert errors: {errors}")

        try:
            await self._run(_do_insert)
            bound_log.info("bq.insert.done")
        except BigQueryError:
            raise
        except Exception as e:
            bound_log.error("bq.insert.error", error=str(e))
            raise BigQueryError(str(e))

    async def get_schools(self, district_code: str, limit: int = 50) -> list[dict]:
        """Fetch schools sorted by DI score descending (most deprived first)."""
        sql = f"""
            SELECT
                school_id, school_name, block_name, village_name, district_code,
                di_score, di_category, total_enrollment, total_teachers,
                subject_vacancies, lat, lng, is_data_stale, geocode_status, updated_at
            FROM {self._full_table("schools")}
            WHERE district_code = @district_id
              AND di_score IS NOT NULL
            ORDER BY di_score DESC NULLS LAST
            LIMIT @limit
        """
        params = [
            bigquery.ScalarQueryParameter("district_id", "STRING", district_code),
            bigquery.ScalarQueryParameter("limit", "INT64", limit),
        ]
        return await self.query(sql, params)

    async def get_school_detail(self, school_id: str) -> dict | None:
        """Fetch full school detail including DI breakdown."""
        sql = f"""
            SELECT
                school_id, school_name, block_name, village_name, district_code,
                di_score, di_category, di_breakdown_json,
                total_enrollment, prev_year_enrollment, total_teachers, subject_vacancies,
                has_toilet, has_electricity, total_classrooms, total_classes,
                urban_distance_km, aser_proxy_score, school_category,
                medium_of_instruction, lat, lng,
                is_data_stale, geocode_status, updated_at
            FROM {self._full_table("schools")}
            WHERE school_id = @school_id
            LIMIT 1
        """
        params = [bigquery.ScalarQueryParameter("school_id", "STRING", school_id)]
        rows = await self.query(sql, params)
        return rows[0] if rows else None

    async def get_teachers(self, district_code: str) -> list[dict]:
        """Fetch teacher roster for a district."""
        sql = f"""
            SELECT
                teacher_id, district_code, subject_specialization,
                qualification, years_service, years_rural,
                languages, long_dist_consent, current_school_id,
                is_synthetic, created_at
            FROM {self._full_table("teachers")}
            WHERE district_code = @district_id
            ORDER BY years_rural DESC
        """
        params = [bigquery.ScalarQueryParameter("district_id", "STRING", district_code)]
        return await self.query(sql, params)

    async def get_teachers_by_subject(self, district_code: str, subject: str) -> list[dict]:
        """Pre-filter teachers by subject vacancy before embedding comparison."""
        sql = f"""
            SELECT
                teacher_id, district_code, subject_specialization,
                qualification, years_service, years_rural,
                languages, long_dist_consent, current_school_id
            FROM {self._full_table("teachers")}
            WHERE district_code = @district_id
              AND @subject IN UNNEST(JSON_VALUE_ARRAY(subject_specialization))
        """
        params = [
            bigquery.ScalarQueryParameter("district_id", "STRING", district_code),
            bigquery.ScalarQueryParameter("subject", "STRING", subject),
        ]
        return await self.query(sql, params)

    async def get_commute_cache(self, school_ids: list[str]) -> list[dict]:
        """Fetch pre-computed commute distances for optimizer."""
        sql = f"""
            SELECT teacher_id, school_id, distance_km
            FROM {self._full_table("commute_cache")}
            WHERE school_id IN UNNEST(@school_ids)
        """
        params = [
            bigquery.ArrayQueryParameter("school_ids", "STRING", school_ids)
        ]
        return await self.query(sql, params)

    async def upsert_di_score(self, school_id: str, di_score: float, di_breakdown: str) -> None:
        """Update di_score for a school after computation."""
        rows = [{"school_id": school_id, "di_score": di_score, "di_breakdown_json": di_breakdown}]
        await self.insert_rows("di_updates", rows)

    async def save_deployment(self, deployment: dict) -> None:
        """
        Stream-insert a single approved deployment assignment to the deployments table.

        Expected keys: deployment_id, teacher_id, school_id, vacancy_subject,
                       dvs_score, distance_km, retention_score, status, approved_by, approved_at
        """
        await self.insert_rows("deployments", [deployment])

    async def get_deployments(self, district_code: str, limit: int = 100) -> list[dict]:
        """Fetch recent deployment assignments for a district."""
        sql = f"""
            SELECT
                deployment_id, teacher_id, school_id, vacancy_subject,
                dvs_score, distance_km, retention_score,
                status, approved_by, approved_at
            FROM {self._full_table("deployments")}
            WHERE district_code = @district_code
            ORDER BY approved_at DESC
            LIMIT @limit
        """
        params = [
            bigquery.ScalarQueryParameter("district_code", "STRING", district_code),
            bigquery.ScalarQueryParameter("limit", "INT64", limit),
        ]
        return await self.query(sql, params)

    async def get_analytics(self, district_code: str) -> dict:
        """Fetch real aggregated analytics from BigQuery."""
        # Top level metrics
        sql_top = f"""
            SELECT
                COUNT(school_id) as total_schools,
                AVG(di_score) as avg_di_score,
                SUM(subject_vacancies) as total_vacancies,
                COUNTIF(di_score >= 80) as critical_schools
            FROM {self._full_table("schools")}
            WHERE district_code = @district_code
        """
        params = [bigquery.ScalarQueryParameter("district_code", "STRING", district_code)]
        rows_top = await self.query(sql_top, params)
        top_metrics = rows_top[0] if rows_top else {"total_schools": 0, "avg_di_score": 0, "total_vacancies": 0, "critical_schools": 0}

        # Block level metrics for charts
        sql_blocks = f"""
            SELECT
                block_name,
                COUNT(school_id) as schools_count,
                AVG(di_score) as avg_di_score,
                SUM(subject_vacancies) as vacancies
            FROM {self._full_table("schools")}
            WHERE district_code = @district_code
            GROUP BY block_name
            ORDER BY avg_di_score DESC
        """
        rows_blocks = await self.query(sql_blocks, params)

        return {
            "total_schools": top_metrics.get("total_schools", 0),
            "avg_di_score": round(top_metrics.get("avg_di_score") or 0, 1),
            "total_vacancies": top_metrics.get("total_vacancies", 0),
            "critical_schools": top_metrics.get("critical_schools", 0),
            "block_stats": [
                {
                    "name": r.get("block_name"),
                    "avg_di": round(r.get("avg_di_score") or 0, 1),
                    "vacancies": r.get("vacancies", 0),
                    "schools": r.get("schools_count", 0)
                } for r in rows_blocks
            ]
        }

    def close(self) -> None:
        """Shutdown thread pool cleanly."""
        self._pool.shutdown(wait=False)
        log.info("bq.client.closed")
