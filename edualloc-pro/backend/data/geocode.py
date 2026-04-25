"""Geocoding utilities using Google Maps API."""

import asyncio
from typing import Dict, List, Optional
import structlog

log = structlog.get_logger()

async def batch_geocode(
    maps_client, 
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
    
    tasks = []
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
        tasks.append(_geocode_single(maps_client, school, address))
        
    if tasks:
        # Batch execution (maps_client should handle rate limits internally, 
        # but we use gather for concurrent requests)
        await asyncio.gather(*tasks)
        
    success = sum(1 for s in schools if s.get('geocode_status') == 'OK')
    log.info("geocode.batch.done", total=len(schools), success=success)
    return schools

async def _geocode_single(maps_client, school: Dict, address: str) -> None:
    try:
        result = await maps_client.geocode(address)
        if result and result.get('lat') and result.get('lng'):
            school['lat'] = result['lat']
            school['lng'] = result['lng']
            school['geocode_status'] = 'OK'
        else:
            school['geocode_status'] = 'ZERO_RESULTS'
    except Exception as e:
        log.error("geocode.single.error", school_id=school.get('school_id'), error=str(e))
        school['geocode_status'] = 'ERROR'
