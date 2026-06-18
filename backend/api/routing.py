import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

router = APIRouter()

# Free OSRM demo server for hackathon purposes.
# In production, this should be a self-hosted OSRM instance.
OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"

class Coordinate(BaseModel):
    lat: float
    lon: float

class RouteRequest(BaseModel):
    start: Coordinate
    hotspots: List[Coordinate]

@router.post("/patrol-route")
async def get_patrol_route(req: RouteRequest):
    """
    Generates an optimized patrol route starting from a given location 
    and traversing a list of high-risk hotspots.
    """
    if not req.hotspots:
        raise HTTPException(status_code=400, detail="No hotspots provided.")

    coords = [req.start] + req.hotspots
    # OSRM expects coordinates in lon,lat format
    coords_str = ";".join([f"{c.lon},{c.lat}" for c in coords])
    
    url = f"{OSRM_BASE_URL}/{coords_str}?overview=full&geometries=geojson"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") != "Ok":
                raise HTTPException(status_code=400, detail="Route not found")
                
            route = data["routes"][0]
            
            return {
                "distance": route["distance"], # in meters
                "duration": route["duration"], # in seconds
                "geometry": route["geometry"]  # GeoJSON LineString
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
