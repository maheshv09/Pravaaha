from fastapi import APIRouter, HTTPException
import httpx
import os
import json

router = APIRouter()

CACHE_FILE = "cache/geocode_cache.json"

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_cache(cache_data):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(cache_data, f)

cache = load_cache()

@router.get("/geocode")
async def geocode(address: str):
    """
    Nominatim geocoding with local cache to avoid rate limits.
    """
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")

    address_lower = address.lower()
    if address_lower in cache:
        return cache[address_lower]

    url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1"
    headers = {"User-Agent": "Pravaaha-Hackathon-Project/1.0"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            if not data:
                raise HTTPException(status_code=404, detail="Location not found")
                
            result = {
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"]),
                "display_name": data[0]["display_name"]
            }
            
            cache[address_lower] = result
            save_cache(cache)
            
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
