"""EduAllocPro error hierarchy — all domain exceptions live here."""

from __future__ import annotations


class EduAllocError(Exception):
    """Base error for all EduAllocPro domain exceptions."""

    def __init__(self, message: str, code: str = "EDUALLOC_ERROR", status: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status

    def to_dict(self) -> dict:
        return {"error": self.code, "message": self.message, "partial_result": False}


class BigQueryError(EduAllocError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "BQ_ERROR", 502)


class VertexRateLimitError(EduAllocError):
    def __init__(self, retry_after: int = 30) -> None:
        super().__init__("Vertex AI rate limit hit", "VERTEX_RATE_LIMIT", 429)
        self.retry_after = retry_after


class VertexError(EduAllocError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "VERTEX_ERROR", 502)


class GeminiParseError(EduAllocError):
    def __init__(self, message: str) -> None:
        super().__init__(f"Gemini schema validation failed: {message}", "GEMINI_PARSE_ERROR", 502)


class GeminiError(EduAllocError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "GEMINI_ERROR", 502)


class OptimizerTimeoutError(EduAllocError):
    """Raised when OR-Tools hits the time limit — partial result should still be returned."""

    def __init__(self, elapsed_s: float) -> None:
        super().__init__(
            f"Optimizer reached time limit after {elapsed_s:.1f}s — returning partial result",
            "OPTIMIZER_TIMEOUT",
            200,  # NOT a 5xx — partial result is valid
        )
        self.elapsed_s = elapsed_s


class MapsError(EduAllocError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "MAPS_ERROR", 502)


class NotFoundError(EduAllocError):
    def __init__(self, resource: str, id_: str) -> None:
        super().__init__(f"{resource} '{id_}' not found", "NOT_FOUND", 404)


class AuthError(EduAllocError):
    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(message, "UNAUTHORIZED", 401)
