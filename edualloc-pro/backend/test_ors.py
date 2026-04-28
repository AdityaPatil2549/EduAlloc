import asyncio
from services.maps_client import MapsClient

async def test():
    try:
        m = MapsClient()
        origins = [{'lat': 21.3661, 'lng': 74.2167}]
        destinations = [{'lat': 21.4000, 'lng': 74.2500}]
        res = await m.distance_matrix(origins, destinations)
        print("SUCCESS! ORS distance:", res[0][0])
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test())
