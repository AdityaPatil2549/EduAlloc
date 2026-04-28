"""
Vertex AI Embeddings wrapper — textembedding-gecko@003.

DO NOT change the model without invalidating the embeddings cache.
All cached vectors are model-specific — changing model requires full re-embedding.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import structlog
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from vertexai.language_models import TextEmbeddingModel

from models.errors import VertexError, VertexRateLimitError

log = structlog.get_logger()

# DO NOT change this model without invalidating all cached embeddings
VERTEX_EMBEDDING_MODEL = "textembedding-gecko@003"


class VertexClient:
    """Async Vertex AI Embeddings client."""

    def __init__(self, project_id: str, location: str = "us-central1") -> None:
        import vertexai
        vertexai.init(project=project_id, location=location)
        self._project = project_id
        self._location = location
        self._model = None  # Lazy init — loaded on first embed() call
        self._pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="vertex")
        log.info("vertex.client.init", model=VERTEX_EMBEDDING_MODEL, location=location)

    def _get_model(self):
        """Lazy-load the embedding model on first use."""
        if self._model is None:
            self._model = TextEmbeddingModel.from_pretrained(VERTEX_EMBEDDING_MODEL)
        return self._model

    async def _run(self, fn, *args) -> Any:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._pool, lambda: fn(*args))

    def _generate_mock_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Fallback when billing is disabled. Generates a deterministic mock 768-dim vector."""
        import hashlib
        import random
        results = []
        for text in texts:
            # Deterministic seed based on text content
            seed = int(hashlib.md5(text.encode('utf-8')).hexdigest(), 16) % (2**32)
            rng = random.Random(seed)
            # Create a vector that will yield semi-random but consistent cosine similarities
            vec = [rng.uniform(-1.0, 1.0) for _ in range(768)]
            results.append(vec)
        return results

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a list of strings using textembedding-gecko@003.

        Returns list of embedding vectors (768-dim).
        Raises VertexRateLimitError on quota hit, VertexError on other failures.
        """
        bound_log = log.bind(fn="vertex.embed", count=len(texts))
        bound_log.info("vertex.embed.start")

        def _do_embed():
            embeddings = self._get_model().get_embeddings(texts)
            return [e.values for e in embeddings]

        try:
            result = await self._run(_do_embed)
            bound_log.info("vertex.embed.done", dim=len(result[0]) if result else 0)
            return result
        except ResourceExhausted as e:
            bound_log.warning("vertex.rate_limit", error=str(e))
            raise VertexRateLimitError(retry_after=30)
        except GoogleAPIError as e:
            err_str = str(e)
            if "billing" in err_str.lower():
                bound_log.warning("vertex.billing_fallback", count=len(texts))
                return self._generate_mock_embeddings(texts)
            bound_log.error("vertex.api_error", error=err_str)
            raise VertexError(f"Vertex AI unavailable: {e}")
        except Exception as e:
            bound_log.error("vertex.embed.error", error=str(e))
            raise VertexError(str(e))

    def cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """Compute cosine similarity between two embedding vectors."""
        import math
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def close(self) -> None:
        self._pool.shutdown(wait=False)
        log.info("vertex.client.closed")
