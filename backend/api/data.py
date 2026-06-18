import pandas as pd
import json
import os
from fastapi import APIRouter

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data/processed")

def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        return pd.read_csv(path).to_dict(orient="records")
    return []

@router.get("/dashboard")
def get_dashboard_data():
    summary_path = os.path.join(DATA_DIR, "summary.json")
    summary = {}
    if os.path.exists(summary_path):
        with open(summary_path, "r") as f:
            summary = json.load(f)
            
    # For hotspots, the frontend expects specific casing/naming.
    # The preprocessor generates them, let's just pass them through
    # We will adjust names if needed in the frontend or here.
    hotspots_raw = load_csv("hotspots.csv")
    
    # Process heatmap points for frontend
    heatmap_raw = load_csv("heatmap_data.csv")
    heatmap_data = [{"lat": r["latitude"], "lon": r["longitude"], "w": r["weight"]} for r in heatmap_raw]
    
    # Load other tables
    offense_breakdown = load_csv("offense_breakdown.csv")
    vehicle_breakdown = load_csv("vehicle_breakdown.csv")
    hourly_pattern = load_csv("hourly_pattern.csv")
    daily_trend = load_csv("daily_trend.csv")
    station_summary = load_csv("station_summary.csv")

    return {
        "summary": summary,
        "hotspots": hotspots_raw,
        "heatmap": heatmap_data,
        "offense_breakdown": offense_breakdown,
        "vehicle_breakdown": vehicle_breakdown,
        "hourly_pattern": hourly_pattern,
        "daily_trend": daily_trend,
        "station_summary": station_summary
    }
