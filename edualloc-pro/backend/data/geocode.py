"""Geocoding utilities using Nominatim (OpenStreetMap)."""

import asyncio
from typing import Dict, List
import structlog
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

log = structlog.get_logger()

# Initialize Nominatim and RateLimiter
geolocator = Nominatim(user_agent="edualloc-pro-hackathon-2026")
# Rate limit: 1 request/second (Nominatim's free policy)
_geocode_sync = RateLimiter(geolocator.geocode, min_delay_seconds=1.1)

def _do_geocode(address: str) -> tuple[float | None, float | None, str]:
    try:
        location = _geocode_sync(address)
        if location:
            return location.latitude, location.longitude, 'OK'
        return None, None, 'ZERO_RESULTS'
    except Exception as e:
        log.error("geocode.single.error", address=address, error=str(e))
        return None, None, 'ERROR'

async def batch_geocode(
    maps_client, # Ignored, kept for API compatibility
    schools: List[Dict], 
    district_name: str = "Nandurbar", 
    state_name: str = "Maharashtra"
) -> List[Dict]:
    """
    Takes a list of school dicts, generates address strings, and geocodes them.
    Updates the dictionaries in place with 'lat', 'lng', and 'geocode_status'.
    Returns the updated list.
    """
    log.info("geocode.batch.start", count=len(schools))
    
    for school in schools:
        if school.get('lat') and school.get('lng'):
            continue # Already geocoded
            
        # Construct best possible address
        parts = [
            school.get('school_name', ''),
            school.get('village_name', ''),
            school.get('block_name', ''),
            district_name,
            state_name,
            "India"
        ]
        address = ", ".join([p for p in parts if p])
        
        # Nominatim must be called sequentially with rate limiting
        # Use run_in_executor to not block the event loop
        loop = asyncio.get_event_loop()
        lat, lng, status = await loop.run_in_executor(None, _do_geocode, address)
        
        if lat and lng:
            school['lat'] = lat
            school['lng'] = lng
        school['geocode_status'] = status
        
    success = sum(1 for s in schools if s.get('geocode_status') == 'OK')
    log.info("geocode.batch.done", total=len(schools), success=success)
    return schools
