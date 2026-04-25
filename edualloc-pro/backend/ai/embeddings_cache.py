"""
Thread-safe in-memory embeddings cache with TTL and LRU eviction.

ALWAYS check cache before calling Vertex AI — never re-embed same teacher_id.
DO NOT call Vertex AI for the same teacher_id if it's in cache.
"""

from __future__ import annotations

import time
from threading import Lock
from typing import Optional

import structlog

log = structlog.get_logger()


class EmbeddingsCache:
    """
    Thread-safe in-memory LRU cache for teacher embedding vectors.

    Keys: teacher_id (str)
    Values: embedding vector (list[float])
    TTL: configurable hours (default 24h — teacher profiles change rarely)
    """

    def __init__(self, max_size: int = 10_000, ttl_hours: float = 24.0) -> None:
        self._cache: dict[str, tuple[list[float], float]] = {}  # id → (vector, expires_at)
        self._lock = Lock()
        self._max_size = max_size
        self._ttl_s = ttl_hours * 3600
        log.info("embed_cache.init", max_size=max_size, ttl_hours=ttl_hours)

    def get(self, teacher_id: str) -> Optional[list[float]]:
        """Return cached embedding or None if absent/expired."""
        with self._lock:
            entry = self._cache.get(teacher_id)
            if entry is None:
                return None
            vec, expires_at = entry
            if time.monotonic() > expires_at:
                del self._cache[teacher_id]
                log.info("embed_cache.expired", teacher_id=teacher_id)
                return None
            return vec

    def set(self, teacher_id: str, vector: list[float]) -> None:
        """Store embedding with TTL. Evicts oldest entry if at capacity."""
        with self._lock:
            if len(self._cache) >= self._max_size and teacher_id not in self._cache:
                # Evict the oldest entry (simple FIFO — good enough for Phase 1)
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                log.info("embed_cache.evict", evicted_teacher_id=oldest_key)
            self._cache[teacher_id] = (vector, time.monotonic() + self._ttl_s)

    def invalidate(self, teacher_id: str) -> None:
        """Remove a specific teacher from cache."""
        with self._lock:
            self._cache.pop(teacher_id, None)

    def clear(self) -> None:
        """Flush entire cache."""
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
        log.info("embed_cache.cleared", removed=count)

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._cache)

    @property
    def stats(self) -> dict:
        with self._lock:
            return {"size": len(self._cache), "max_size": self._max_size, "ttl_hours": self._ttl_s / 3600}
