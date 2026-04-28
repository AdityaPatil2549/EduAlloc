"""OpenRouteService Distance Matrix client."""

import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import openrouteservice
import structlog

from models.errors import MapsError

log = structlog.get_logger()


class MapsClient:
    """Async OpenRouteService client for distance matrix."""

    def __init__(self) -> None:
        self._key = os.environ.get("ORS_API_KEY")
        self._client = openrouteservice.Client(key=self._key) if self._key else None
        self._pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="maps")
        log.info("maps.client.init", provider="openrouteservice")

    async def distance_matrix(
        self,
        origins: list[tuple[float, float]],  # [(lat, lng), ...]
        destination: tuple[float, float],
    ) -> tuple[list[float], list[float]]:
        """Returns lists of (distances in km, durations in min) for each origin to destination."""
        if not origins:
            return [], []

        bound_log = log.bind(fn="distance_matrix", origins=len(origins))
        
        if not self._client:
            bound_log.warning("maps.client.mocking_due_to_missing_key")
            # Mock distances if no key is provided (e.g. hackathon demo safety)
            return [0.0 for _ in origins], [0.0 for _ in origins]

        bound_log.info("maps.distance.start")

        # ORS uses [lng, lat] order (GeoJSON)
        coords = [[lng, lat] for lat, lng in origins]
        coords.append([destination[1], destination[0]])  # dest last

        def _call():
            result = self._client.distance_matrix(
                locations=coords,
                profile="driving-car",
                metrics=["distance", "duration"],
                units="km",
            )
            # Result: distances[origin_idx][dest_idx]
            dest_idx = len(origins)  # destination is last location
            
            distances_km = []
            durations_min = []
            
            for i in range(len(origins)):
                dist = result["distances"][i][dest_idx]
                dur = result["durations"][i][dest_idx]
                # Handle cases where route not found (could be None)
                if dist is None:
                    distances_km.append(81.0) # Penalty distance (over 80km constraint)
                    durations_min.append(120.0)
                else:
                    distances_km.append(float(dist))
                    durations_min.append(float(dur) / 60.0)
            return distances_km, durations_min

        try:
            loop = asyncio.get_event_loop()
            distances_km, durations_min = await loop.run_in_executor(
                self._pool, _call
            )
            bound_log.info("maps.distance.done", count=len(distances_km))
            return distances_km, durations_min
        except Exception as e:
            bound_log.error("maps.distance.error", error=str(e))
            raise MapsError(f"Distance Matrix failed: {e}")
