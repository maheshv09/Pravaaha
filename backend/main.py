from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
import os
from api.copilot import router as copilot_router
from api.routing import router as routing_router
from api.geocoding import router as geocoding_router

app = FastAPI(
    title="Pravaaha GeoIntel API",
    description="Backend for the Pravaaha Parking Congestion Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(copilot_router, prefix="/api/copilot", tags=["Copilot"])
app.include_router(routing_router, prefix="/api/routing", tags=["Routing"])
app.include_router(geocoding_router, prefix="/api/geocoding", tags=["Geocoding"])

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
