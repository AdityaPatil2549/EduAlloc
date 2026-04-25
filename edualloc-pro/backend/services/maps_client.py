"""Google Maps Distance Matrix + Geocoding client."""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import httpx
import structlog

from models.errors import MapsError

log = structlog.get_logger()

GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


class MapsClient:
    """Async Google Maps client for distance matrix and geocoding."""

    def __init__(self, api_key: str, mode: str = "driving", max_commute_km: float = 80.0) -> None:
        self._key = api_key
        self._mode = mode
        self.max_commute_km = max_commute_km
        self._pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="maps")
        log.info("maps.client.init", mode=mode, max_commute_km=max_commute_km)

    async def get_distance_km(self, origin_latlon: tuple, dest_latlon: tuple) -> float:
        """
        Get driving distance in km between two lat/lng points.
        Returns float distance, or raises MapsError.
        """
        origin = f"{origin_latlon[0]},{origin_latlon[1]}"
        destination = f"{dest_latlon[0]},{dest_latlon[1]}"

        bound_log = log.bind(fn="maps.distance", origin=origin, dest=destination)
        bound_log.info("maps.distance.start")

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    DISTANCE_MATRIX_URL,
                    params={
                        "origins": origin,
                        "destinations": destination,
                        "mode": self._mode,
                        "key": self._key,
                    },
                )
                data = resp.json()

            element = data["rows"][0]["elements"][0]
            if element["status"] != "OK":
                raise MapsError(f"Distance Matrix status: {element['status']}")

            distance_m = element["distance"]["value"]
            distance_km = distance_m / 1000.0
            bound_log.info("maps.distance.done", km=distance_km)
            return distance_km
        except MapsError:
            raise
        except Exception as e:
            bound_log.error("maps.distance.error", error=str(e))
            raise MapsError(f"Distance Matrix failed: {e}")

    async def geocode(self, address: str) -> tuple[float, float] | None:
        """
        Geocode an address string. Returns (lat, lng) or None if not found.
        """
        bound_log = log.bind(fn="maps.geocode", address=address[:60])
        bound_log.info("maps.geocode.start")

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    GEOCODING_URL,
                    params={"address": address, "key": self._key},
                )
                data = resp.json()

            if data["status"] == "ZERO_RESULTS" or not data.get("results"):
                bound_log.warning("maps.geocode.no_result")
                return None

            loc = data["results"][0]["geometry"]["location"]
            bound_log.info("maps.geocode.done", lat=loc["lat"], lng=loc["lng"])
            return loc["lat"], loc["lng"]
        except Exception as e:
            bound_log.error("maps.geocode.error", error=str(e))
            raise MapsError(f"Geocoding failed: {e}")
