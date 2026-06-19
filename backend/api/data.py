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
            raw_summary = json.load(f)
            # Map snake_case to camelCase
            summary = {
                "totalViolations": raw_summary.get("total_violations", 0),
                "totalHotspots": raw_summary.get("total_hotspots", 0),
                "criticalHotspots": raw_summary.get("critical_hotspots", 0),
                "highHotspots": raw_summary.get("high_hotspots", 0),
                "mediumHotspots": raw_summary.get("medium_hotspots", 0),
                "lowHotspots": raw_summary.get("low_hotspots", 0),
                "dateRange": raw_summary.get("date_range", []),
                "totalDays": raw_summary.get("total_days", 0),
                "uniqueVehicles": raw_summary.get("unique_vehicles", 0),
                "topStation": raw_summary.get("top_station", "Unknown"),
                "topOffense": raw_summary.get("top_offense", "Unknown"),
                "policeStations": raw_summary.get("police_stations", 0)
            }
            
    # The frontend expects specific camelCase keys.
    hotspots_raw = load_csv("hotspots.csv")
    hotspots_mapped = []
    for h in hotspots_raw:
        # Extract offense percentages dynamically
        offenses = {}
        for k, v in h.items():
            if k.startswith("pct_") and not pd.isna(v) and v > 0:
                offenses[k.replace("pct_", "")] = round(v * 100, 1)

        root_causes = []
        if h.get("landmark_distance_km", 10) < 2: root_causes.append(f"Proximity to {h.get('nearest_landmark', 'Landmark')}")
        if offenses.get("MAIN_ROAD_PARKING", 0) > 20: root_causes.append("High main-road parking")
        if offenses.get("NO_PARKING", 0) > 50: root_causes.append("Dominant no-parking zone")
        if h.get("weekend_ratio", 0) > 0.35: root_causes.append("Weekend congestion hotspot")
        if h.get("peak_hour", 0) in [8,9,10]: root_causes.append("Morning rush pressure")
        if h.get("peak_hour", 0) in [17,18,19]: root_causes.append("Evening rush pressure")
        if not root_causes: root_causes.append("High violation density")

        hotspots_mapped.append({
            "cellId": str(h.get("cell_id", "")),
            "lat": h.get("lat_center", 0),
            "lon": h.get("lon_center", 0),
            "count": h.get("violation_count", 0),
            "uniqueDates": h.get("unique_dates", 0),
            "recurrenceScore": round(h.get("recurrence_score", 0), 2),
            "dailyDensity": round(h.get("daily_density", 0), 1),
            "peakHour": int(h.get("peak_hour", 0)),
            "avgHour": round(h.get("avg_hour", 0), 1),
            "weekendRatio": round(h.get("weekend_ratio", 0), 2),
            "growthTrend": round(h.get("growth_trend", 0), 2),
            "topOffense": h.get("primary_offense_mode", "UNKNOWN"),
            "offenses": offenses,
            "station": h.get("police_station", "Unknown"),
            "landmark": h.get("nearest_landmark", "Unknown"),
            "landmarkDist": round(h.get("landmark_distance_km", 0), 2),
            "severityScore": round(h.get("severity_score", 0), 1),
            "congestionImpact": round(h.get("congestion_impact", 0), 1),
            "riskTier": h.get("risk_tier", "LOW"),
            "rank": int(h.get("rank", 0)),
            "rootCauses": root_causes
        })
    
    # Process heatmap points for frontend
    heatmap_raw = load_csv("heatmap_data.csv")
    heatmap_data = [{"lat": r["latitude"], "lon": r["longitude"], "w": r["weight"]} for r in heatmap_raw]
    
    # Load other tables
    offense_breakdown_raw = load_csv("offense_breakdown.csv")
    offense_breakdown = [{"name": r.get("offense", "Unknown"), "count": r.get("count", 0)} for r in offense_breakdown_raw]

    vehicle_breakdown_raw = load_csv("vehicle_breakdown.csv")
    vehicle_breakdown = [{"name": r.get("vehicle_type", "Unknown"), "count": r.get("count", 0)} for r in vehicle_breakdown_raw]
    
    hourly_pattern = load_csv("hourly_pattern.csv")
    
    daily_trend_raw = load_csv("daily_trend.csv")
    daily_trend = []
    for r in daily_trend_raw:
        # map date -> date and count -> count
        r_mapped = {"date": r.get("date", ""), "count": r.get("count", 0)}
        if "7d_avg" in r: r_mapped["avg7d"] = r["7d_avg"]
        daily_trend.append(r_mapped)

    station_summary_raw = load_csv("station_summary.csv")
    station_summary = []
    for r in station_summary_raw:
        station_summary.append({
            "name": r.get("police_station", "Unknown"),
            "count": r.get("total_violations", 0),
            "lat": r.get("lat_center", 0),
            "lon": r.get("lon_center", 0),
            "topOffense": r.get("primary_offense", "UNKNOWN")
        })

    return {
        "summary": summary,
        "hotspots": hotspots_mapped,
        "heatmap": heatmap_data,
        "offense_breakdown": offense_breakdown,
        "vehicle_breakdown": vehicle_breakdown,
        "hourly_pattern": hourly_pattern,
        "daily_trend": daily_trend,
        "station_summary": station_summary,
        "hotspots_top50": hotspots_mapped[:50],
        "patrol_priority": hotspots_mapped[:20],
        "dow_pattern": [], # Not computed in python preprocessor currently
        "time_periods": [],
        "monthly_trend": []
    }
