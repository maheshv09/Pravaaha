"""
Pravaaha — Data Preprocessing Pipeline
Ingests raw CSV, cleans, normalizes, builds spatial grid, and produces analysis-ready tables.
"""
import os
import json
import hashlib
import re
import math
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import List, Dict, Tuple, Optional

import pandas as pd
import numpy as np

try:
    import h3
    HAS_H3 = True
except ImportError:
    HAS_H3 = False

# ── Bangalore bounding box ──────────────────────────────────────────────────
BLR_LAT_MIN, BLR_LAT_MAX = 12.75, 13.20
BLR_LON_MIN, BLR_LON_MAX = 77.40, 77.85

# ── Offense label normalization map ──────────────────────────────────────────
OFFENSE_NORMALIZE = {
    "WRONG PARKING": "WRONG_PARKING",
    "NO PARKING": "NO_PARKING",
    "PARKING IN A MAIN ROAD": "MAIN_ROAD_PARKING",
    "PARKING NEAR ROAD CROSSING": "NEAR_CROSSING",
    "PARKING ON FOOTPATH": "FOOTPATH_PARKING",
    "DEFECTIVE NUMBER PLATE": "DEFECTIVE_PLATE",
    "PARKING IN BUS STAND": "BUS_STAND_PARKING",
    "PARKING ON CURVE": "CURVE_PARKING",
    "PARKING ON BRIDGE": "BRIDGE_PARKING",
    "PARKING NEAR TRAFFIC SIGNAL": "NEAR_SIGNAL",
    "PARKING AGAINST FLOW": "AGAINST_FLOW",
    "DOUBLE PARKING": "DOUBLE_PARKING",
}

# ── Bangalore landmarks for proximity features ──────────────────────────────
BANGALORE_LANDMARKS = {
    "Majestic Bus Station": (12.9767, 77.5713),
    "KR Market": (12.9633, 77.5779),
    "MG Road Metro": (12.9756, 77.6068),
    "Koramangala": (12.9352, 77.6245),
    "Indiranagar": (12.9784, 77.6408),
    "Whitefield": (12.9698, 77.7500),
    "Electronic City": (12.8440, 77.6603),
    "Jayanagar": (12.9308, 77.5838),
    "Malleshwaram": (12.9969, 77.5707),
    "HSR Layout": (12.9116, 77.6389),
    "Yeshwanthpur": (13.0220, 77.5482),
    "Hebbal": (13.0358, 77.5970),
    "Silk Board Junction": (12.9173, 77.6229),
    "KR Puram": (13.0074, 77.6960),
    "Marathahalli": (12.9591, 77.6974),
    "Banashankari": (12.9255, 77.5468),
    "BTM Layout": (12.9166, 77.6101),
    "Yelahanka": (13.1007, 77.5963),
    "Peenya": (13.0300, 77.5200),
    "Kempegowda Airport": (13.1989, 77.7068),
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def parse_violation_types(raw: str) -> List[str]:
    """Parse the JSON-like violation_type field."""
    if not raw or raw == "NULL":
        return ["UNKNOWN"]
    try:
        parsed = json.loads(raw.replace('""', '"').strip('"'))
        if isinstance(parsed, list):
            return [OFFENSE_NORMALIZE.get(v.strip(), v.strip().replace(" ", "_")) for v in parsed]
        return [OFFENSE_NORMALIZE.get(str(parsed).strip(), str(parsed).strip().replace(" ", "_"))]
    except:
        cleaned = re.findall(r'"([^"]+)"', raw)
        if cleaned:
            return [OFFENSE_NORMALIZE.get(v.strip(), v.strip().replace(" ", "_")) for v in cleaned]
        return ["UNKNOWN"]


def load_and_clean(csv_path: str) -> pd.DataFrame:
    """Load raw CSV and perform cleaning."""
    print(f"[Pravaaha] Loading {csv_path}...")
    df = pd.read_csv(csv_path, low_memory=False)
    original_count = len(df)
    print(f"[Pravaaha] Loaded {original_count} rows, {len(df.columns)} columns")

    # ── Parse timestamps ──
    df["created_datetime"] = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True)
    df["closed_datetime"] = pd.to_datetime(df["closed_datetime"], errors="coerce", utc=True)

    # Convert to IST
    df["created_datetime"] = df["created_datetime"].dt.tz_convert("Asia/Kolkata")
    df.loc[df["closed_datetime"].notna(), "closed_datetime"] = df.loc[df["closed_datetime"].notna(), "closed_datetime"].dt.tz_convert("Asia/Kolkata")

    # ── Remove rows with no lat/lon or datetime ──
    df = df.dropna(subset=["latitude", "longitude", "created_datetime"])
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"])

    # ── Filter to Bangalore bounding box ──
    mask = (
        (df["latitude"] >= BLR_LAT_MIN) & (df["latitude"] <= BLR_LAT_MAX) &
        (df["longitude"] >= BLR_LON_MIN) & (df["longitude"] <= BLR_LON_MAX)
    )
    df = df[mask].copy()

    # ── Deduplicate ──
    df = df.drop_duplicates(subset=["latitude", "longitude", "created_datetime", "vehicle_number"], keep="first")

    # ── Parse violation types ──
    df["offense_list"] = df["violation_type"].apply(parse_violation_types)
    df["primary_offense"] = df["offense_list"].apply(lambda x: x[0] if x else "UNKNOWN")
    df["offense_count"] = df["offense_list"].apply(len)

    # ── Normalize vehicle type ──
    df["vehicle_type"] = df["vehicle_type"].fillna("UNKNOWN").str.strip().str.upper()

    # ── Extract time features ──
    df["hour"] = df["created_datetime"].dt.hour
    df["day_of_week"] = df["created_datetime"].dt.dayofweek  # 0=Mon
    df["date"] = df["created_datetime"].dt.date
    df["month"] = df["created_datetime"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # ── Time period buckets ──
    def time_period(h):
        if 6 <= h < 10:
            return "morning_rush"
        elif 10 <= h < 14:
            return "midday"
        elif 14 <= h < 18:
            return "afternoon_rush"
        elif 18 <= h < 22:
            return "evening_rush"
        else:
            return "night"

    df["time_period"] = df["hour"].apply(time_period)

    # ── Police station normalization ──
    df["police_station"] = df["police_station"].fillna("Unknown").str.strip()

    # ── Junction name ──
    df["junction_name"] = df["junction_name"].fillna("No Junction").str.strip()

    # ── Resolution time (if closed) ──
    df["resolution_hours"] = None
    mask_closed = df["closed_datetime"].notna()
    if mask_closed.any():
        df.loc[mask_closed, "resolution_hours"] = (
            (df.loc[mask_closed, "closed_datetime"] - df.loc[mask_closed, "created_datetime"]).dt.total_seconds() / 3600
        )

    print(f"[Pravaaha] After cleaning: {len(df)} rows ({original_count - len(df)} removed)")
    return df


def add_spatial_features(df: pd.DataFrame, h3_resolution: int = 8) -> pd.DataFrame:
    """Add H3 hex cells and grid cells."""
    # ── H3 hex cells ──
    if HAS_H3:
        df["h3_res7"] = df.apply(lambda r: h3.geo_to_h3(r["latitude"], r["longitude"], 7), axis=1)
        df["h3_res8"] = df.apply(lambda r: h3.geo_to_h3(r["latitude"], r["longitude"], 8), axis=1)
        df["h3_res9"] = df.apply(lambda r: h3.geo_to_h3(r["latitude"], r["longitude"], 9), axis=1)
        print(f"[Pravaaha] H3 cells: res7={df['h3_res7'].nunique()}, res8={df['h3_res8'].nunique()}, res9={df['h3_res9'].nunique()}")
    else:
        # Fallback: grid cells
        print("[Pravaaha] H3 not available, using grid cells")

    # ── Fixed grid cells (always compute as fallback) ──
    grid_size = 0.005  # ~500m cells
    df["grid_lat"] = (df["latitude"] / grid_size).astype(int)
    df["grid_lon"] = (df["longitude"] / grid_size).astype(int)
    df["grid_cell"] = df["grid_lat"].astype(str) + "_" + df["grid_lon"].astype(str)

    # Fine grid (~200m)
    fine_size = 0.002
    df["fine_grid_lat"] = (df["latitude"] / fine_size).astype(int)
    df["fine_grid_lon"] = (df["longitude"] / fine_size).astype(int)
    df["fine_grid_cell"] = df["fine_grid_lat"].astype(str) + "_" + df["fine_grid_lon"].astype(str)

    # ── Nearest landmark ──
    def nearest_landmark(lat, lon):
        min_dist = float("inf")
        nearest = "Unknown"
        for name, (llat, llon) in BANGALORE_LANDMARKS.items():
            d = haversine(lat, lon, llat, llon)
            if d < min_dist:
                min_dist = d
                nearest = name
        return nearest, min_dist

    landmarks = df.apply(lambda r: nearest_landmark(r["latitude"], r["longitude"]), axis=1)
    df["nearest_landmark"] = landmarks.apply(lambda x: x[0])
    df["landmark_distance_km"] = landmarks.apply(lambda x: x[1])

    print(f"[Pravaaha] Grid cells: {df['grid_cell'].nunique()} (500m), {df['fine_grid_cell'].nunique()} (200m)")
    return df


def build_hotspot_table(df: pd.DataFrame) -> pd.DataFrame:
    """Build hotspot analysis at grid-cell level."""
    cell_col = "h3_res8" if "h3_res8" in df.columns else "grid_cell"

    hotspots = df.groupby(cell_col).agg(
        violation_count=("id", "count"),
        unique_vehicles=("vehicle_number", "nunique"),
        lat_center=("latitude", "mean"),
        lon_center=("longitude", "mean"),
        primary_offense_mode=("primary_offense", lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else "UNKNOWN"),
        unique_offenses=("primary_offense", "nunique"),
        avg_hour=("hour", "mean"),
        peak_hour=("hour", lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else 12),
        weekend_ratio=("is_weekend", "mean"),
        date_first=("date", "min"),
        date_last=("date", "max"),
        unique_dates=("date", "nunique"),
        police_station=("police_station", lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else "Unknown"),
        nearest_landmark=("nearest_landmark", lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else "Unknown"),
        landmark_distance_km=("landmark_distance_km", "min"),
    ).reset_index()

    hotspots.rename(columns={cell_col: "cell_id"}, inplace=True)

    # ── Recurrence score ──
    total_days = (df["date"].max() - df["date"].min()).days + 1
    hotspots["recurrence_score"] = hotspots["unique_dates"] / max(total_days, 1)

    # ── Daily density ──
    hotspots["daily_density"] = hotspots["violation_count"] / hotspots["unique_dates"].clip(lower=1)

    # ── Growth trend (compare first half vs second half) ──
    mid_date = df["date"].min() + timedelta(days=total_days // 2)
    first_half = df[df["date"] <= mid_date].groupby(cell_col)["id"].count().rename("first_half_count")
    second_half = df[df["date"] > mid_date].groupby(cell_col)["id"].count().rename("second_half_count")
    trend = pd.DataFrame({"first_half": first_half, "second_half": second_half}).fillna(0)
    trend["growth_trend"] = (trend["second_half"] - trend["first_half"]) / trend[["first_half", "second_half"]].max(axis=1).clip(lower=1)
    hotspots = hotspots.merge(trend[["growth_trend"]].reset_index(), left_on="cell_id", right_on=cell_col, how="left")
    if cell_col in hotspots.columns and cell_col != "cell_id":
        hotspots.drop(columns=[cell_col], inplace=True)
    hotspots["growth_trend"] = hotspots["growth_trend"].fillna(0)

    # ── Offense mix per hotspot ──
    offense_mix = df.groupby(cell_col)["primary_offense"].value_counts().unstack(fill_value=0)
    offense_mix_pct = offense_mix.div(offense_mix.sum(axis=1), axis=0)
    for col in offense_mix_pct.columns:
        safe_col = f"pct_{col}"
        hotspots = hotspots.merge(
            offense_mix_pct[[col]].rename(columns={col: safe_col}).reset_index(),
            left_on="cell_id", right_on=cell_col, how="left"
        )
        if cell_col in hotspots.columns and cell_col != "cell_id":
            hotspots.drop(columns=[cell_col], inplace=True)
        hotspots[safe_col] = hotspots[safe_col].fillna(0)

    # ── Severity score (composite) ──
    hotspots["severity_raw"] = (
        0.30 * hotspots["violation_count"] / hotspots["violation_count"].max() +
        0.20 * hotspots["recurrence_score"] +
        0.15 * hotspots["daily_density"] / hotspots["daily_density"].max() +
        0.15 * (1 - hotspots["landmark_distance_km"] / hotspots["landmark_distance_km"].max()) +
        0.10 * hotspots["growth_trend"].clip(-1, 1) * 0.5 + 0.5 * 0.10 +
        0.10 * hotspots["unique_offenses"] / hotspots["unique_offenses"].max()
    )
    hotspots["severity_score"] = (hotspots["severity_raw"] * 100).clip(0, 100).round(1)

    # ── Risk tier ──
    hotspots["risk_tier"] = pd.cut(
        hotspots["severity_score"],
        bins=[0, 25, 50, 75, 100],
        labels=["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        include_lowest=True
    )

    # ── Congestion impact score (proxy) ──
    hotspots["congestion_impact"] = (
        0.35 * hotspots["violation_count"] / hotspots["violation_count"].max() +
        0.25 * hotspots["daily_density"] / hotspots["daily_density"].max() +
        0.20 * (1 - hotspots["landmark_distance_km"] / hotspots["landmark_distance_km"].max()) +
        0.10 * hotspots["weekend_ratio"] +
        0.10 * hotspots.get("pct_MAIN_ROAD_PARKING", pd.Series(0, index=hotspots.index)).fillna(0)
    )
    hotspots["congestion_impact"] = (hotspots["congestion_impact"] * 100).clip(0, 100).round(1)

    hotspots = hotspots.sort_values("severity_score", ascending=False).reset_index(drop=True)
    hotspots["rank"] = range(1, len(hotspots) + 1)

    print(f"[Pravaaha] Built {len(hotspots)} hotspots, top severity: {hotspots['severity_score'].iloc[0]}")
    return hotspots


def build_time_series(df: pd.DataFrame) -> pd.DataFrame:
    """Build daily time series for forecasting."""
    cell_col = "h3_res8" if "h3_res8" in df.columns else "grid_cell"
    ts = df.groupby(["date", cell_col]).agg(
        count=("id", "count"),
        unique_vehicles=("vehicle_number", "nunique"),
    ).reset_index()
    ts.rename(columns={cell_col: "cell_id"}, inplace=True)
    ts["date"] = pd.to_datetime(ts["date"])
    ts["day_of_week"] = ts["date"].dt.dayofweek
    ts["is_weekend"] = ts["day_of_week"].isin([5, 6]).astype(int)
    ts["month"] = ts["date"].dt.month
    return ts


def build_station_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Police station level summary."""
    summary = df.groupby("police_station").agg(
        total_violations=("id", "count"),
        unique_vehicles=("vehicle_number", "nunique"),
        lat_center=("latitude", "mean"),
        lon_center=("longitude", "mean"),
        primary_offense=("primary_offense", lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else "UNKNOWN"),
        avg_daily=("date", lambda x: len(x) / max(x.nunique(), 1)),
        peak_hour=("hour", lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else 12),
    ).reset_index()
    summary = summary.sort_values("total_violations", ascending=False).reset_index(drop=True)
    return summary


def build_hourly_pattern(df: pd.DataFrame) -> pd.DataFrame:
    """Hourly violation pattern."""
    return df.groupby("hour").agg(
        count=("id", "count"),
    ).reset_index()


def build_daily_trend(df: pd.DataFrame) -> pd.DataFrame:
    """Daily violation trend."""
    daily = df.groupby("date").agg(
        count=("id", "count"),
        unique_vehicles=("vehicle_number", "nunique"),
    ).reset_index()
    daily["date"] = pd.to_datetime(daily["date"])
    daily = daily.sort_values("date")
    daily["7d_avg"] = daily["count"].rolling(7, min_periods=1).mean()
    return daily


def build_offense_breakdown(df: pd.DataFrame) -> pd.DataFrame:
    """Offense type breakdown."""
    return df["primary_offense"].value_counts().reset_index().rename(
        columns={"index": "offense", "primary_offense": "offense", "count": "count"}
    )


def build_vehicle_breakdown(df: pd.DataFrame) -> pd.DataFrame:
    """Vehicle type breakdown."""
    return df["vehicle_type"].value_counts().reset_index().rename(
        columns={"index": "vehicle_type", "vehicle_type": "vehicle_type", "count": "count"}
    )


def run_full_pipeline(csv_path: str, output_dir: str) -> Dict:
    """Run the entire preprocessing pipeline and save outputs."""
    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Load and clean
    df = load_and_clean(csv_path)

    # Step 2: Add spatial features
    df = add_spatial_features(df)

    # Step 3: Build analysis tables
    hotspots = build_hotspot_table(df)
    time_series = build_time_series(df)
    station_summary = build_station_summary(df)
    hourly_pattern = build_hourly_pattern(df)
    daily_trend = build_daily_trend(df)
    offense_breakdown = build_offense_breakdown(df)
    vehicle_breakdown = build_vehicle_breakdown(df)

    # Step 4: Save all outputs
    print("[Pravaaha] Saving processed data...")

    # Save violation points (sampled for frontend perf)
    points_cols = ["id", "latitude", "longitude", "primary_offense", "vehicle_type",
                   "hour", "day_of_week", "date", "time_period", "is_weekend",
                   "police_station", "junction_name", "nearest_landmark", "grid_cell"]
    if "h3_res8" in df.columns:
        points_cols.append("h3_res8")

    df[points_cols].to_csv(os.path.join(output_dir, "violations_clean.csv"), index=False)
    hotspots.to_csv(os.path.join(output_dir, "hotspots.csv"), index=False)
    time_series.to_csv(os.path.join(output_dir, "time_series.csv"), index=False)
    station_summary.to_csv(os.path.join(output_dir, "station_summary.csv"), index=False)
    hourly_pattern.to_csv(os.path.join(output_dir, "hourly_pattern.csv"), index=False)
    daily_trend.to_csv(os.path.join(output_dir, "daily_trend.csv"), index=False)
    offense_breakdown.to_csv(os.path.join(output_dir, "offense_breakdown.csv"), index=False)
    vehicle_breakdown.to_csv(os.path.join(output_dir, "vehicle_breakdown.csv"), index=False)

    # Save heatmap data (lat, lon, weight for Leaflet.heat)
    heat_data = df[["latitude", "longitude"]].copy()
    heat_data["weight"] = 1
    heat_agg = heat_data.groupby(["latitude", "longitude"]).agg(weight=("weight", "sum")).reset_index()
    heat_agg.to_csv(os.path.join(output_dir, "heatmap_data.csv"), index=False)

    # Save a JSON summary for the frontend
    summary = {
        "total_violations": int(len(df)),
        "total_hotspots": int(len(hotspots)),
        "critical_hotspots": int((hotspots["risk_tier"] == "CRITICAL").sum()),
        "high_hotspots": int((hotspots["risk_tier"] == "HIGH").sum()),
        "date_range": [str(df["date"].min()), str(df["date"].max())],
        "total_days": int((df["date"].max() - df["date"].min()).days + 1),
        "unique_vehicles": int(df["vehicle_number"].nunique()),
        "top_station": station_summary.iloc[0]["police_station"],
        "top_offense": offense_breakdown.iloc[0]["offense"],
        "police_stations": int(df["police_station"].nunique()),
    }
    with open(os.path.join(output_dir, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2, default=str)

    print(f"[Pravaaha] Pipeline complete! {len(df)} violations → {len(hotspots)} hotspots")
    return summary


if __name__ == "__main__":
    import sys
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "../jan to may police violation_anonymized791b166.csv"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "./processed"
    run_full_pipeline(csv_path, output_dir)
