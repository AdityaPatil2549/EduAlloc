"""
Gemini API client — gemini-1.5-pro with JSON schema enforcement.

NEVER use flash for government briefings — quality matters.
ALWAYS validate Gemini output against schema before returning.
NEVER return raw Gemini text directly to the frontend.
"""

from __future__ import annotations

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import structlog
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from models.errors import GeminiError, GeminiParseError

log = structlog.get_logger()


class GeminiClient:
    """Async Gemini API client with JSON schema enforcement."""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-pro",
        temperature_briefing: float = 0.3,
        temperature_order: float = 0.6,
    ) -> None:
        genai.configure(api_key=api_key)
        self._model_name = model
        self._temp_briefing = temperature_briefing
        self._temp_order = temperature_order
        self._pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="gemini")
        log.info("gemini.client.init", model=model)

    async def _run(self, fn, *args) -> Any:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._pool, lambda: fn(*args))

    async def generate_json(
        self,
        prompt: str,
        temperature: float,
        validator_fn=None,
    ) -> dict:
        """
        Generate a JSON response from Gemini and validate against schema.

        Args:
            prompt:       Full prompt string
            temperature:  0.3 for briefings, 0.6 for order narrative
            validator_fn: Optional callable that raises GeminiParseError if invalid

        Returns validated dict — NEVER raw text.
        """
        bound_log = log.bind(fn="gemini.generate_json", model=self._model_name, temp=temperature)
        bound_log.info("gemini.generate.start")

        config = GenerationConfig(
            temperature=temperature,
            max_output_tokens=2048,
            response_mime_type="application/json",
        )

        def _call():
            model = genai.GenerativeModel(self._model_name)
            response = model.generate_content(prompt, generation_config=config)
            return response.text

        try:
            raw_text = await self._run(_call)
            bound_log.info("gemini.generate.done", chars=len(raw_text))
        except Exception as e:
            bound_log.error("gemini.generate.error", error=str(e))
            raise GeminiError(f"Gemini API call failed: {e}")

        # ALWAYS validate before returning
        try:
            result = json.loads(raw_text)
        except json.JSONDecodeError as e:
            bound_log.error("gemini.parse.error", error=str(e))
            raise GeminiParseError(f"Invalid JSON from Gemini: {e}")

        if validator_fn is not None:
            validator_fn(result)  # raises GeminiParseError if invalid

        return result

    async def generate_briefing(self, prompt: str) -> dict:
        """Generate district briefing JSON — temperature 0.3 (factual)."""
        return await self.generate_json(
            prompt, self._temp_briefing, _validate_briefing_schema
        )

    async def generate_order_narrative(self, prompt: str) -> dict:
        """Generate deployment order narrative — temperature 0.6 (natural)."""
        return await self.generate_json(prompt, self._temp_order)

    def close(self) -> None:
        self._pool.shutdown(wait=False)
        log.info("gemini.client.closed")


def _validate_briefing_schema(data: dict) -> None:
    """Validate Gemini briefing JSON has required keys. Raises GeminiParseError."""
    required = {"summary", "marathi_summary", "priority_schools", "recommendations", "week_ending"}
    missing = required - set(data.keys())
    if missing:
        raise GeminiParseError(f"Missing required keys: {missing}")
    if not isinstance(data.get("priority_schools"), list):
        raise GeminiParseError("priority_schools must be a list")
