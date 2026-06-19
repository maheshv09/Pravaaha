import os
import pandas as pd
import json

DATA_DIR = os.path.dirname(__file__)
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

def convert_all():
    print("Converting processed CSV files to JSON...")
    
    # 1. hotspots.csv -> hotspots.json
    hotspots_csv = os.path.join(PROCESSED_DIR, "hotspots.csv")
    if os.path.exists(hotspots_csv):
        df = pd.read_csv(hotspots_csv)
        df.to_json(os.path.join(PROCESSED_DIR, "hotspots.json"), orient="records", indent=2)
        print("Converted hotspots.csv -> hotspots.json")
        
    # 2. heatmap_data.csv -> heatmap_data.json
    heatmap_csv = os.path.join(PROCESSED_DIR, "heatmap_data.csv")
    if os.path.exists(heatmap_csv):
        df = pd.read_csv(heatmap_csv)
        df.to_json(os.path.join(PROCESSED_DIR, "heatmap_data.json"), orient="records", indent=2)
        print("Converted heatmap_data.csv -> heatmap_data.json")

    # 3. station_summary.csv -> station_summary.json
    station_csv = os.path.join(PROCESSED_DIR, "station_summary.csv")
    if os.path.exists(station_csv):
        df = pd.read_csv(station_csv)
        df.to_json(os.path.join(PROCESSED_DIR, "station_summary.json"), orient="records", indent=2)
        print("Converted station_summary.csv -> station_summary.json")

    # 4. daily_trend.csv -> daily_trend.json
    daily_csv = os.path.join(PROCESSED_DIR, "daily_trend.csv")
    if os.path.exists(daily_csv):
        df = pd.read_csv(daily_csv)
        df.to_json(os.path.join(PROCESSED_DIR, "daily_trend.json"), orient="records", indent=2)
        print("Converted daily_trend.csv -> daily_trend.json")

    # 5. hourly_pattern.csv -> hourly_pattern.json
    hourly_csv = os.path.join(PROCESSED_DIR, "hourly_pattern.csv")
    if os.path.exists(hourly_csv):
        df = pd.read_csv(hourly_csv)
        df.to_json(os.path.join(PROCESSED_DIR, "hourly_pattern.json"), orient="records", indent=2)
        print("Converted hourly_pattern.csv -> hourly_pattern.json")

    # 6. offense_breakdown.csv -> offense_breakdown.json
    offense_csv = os.path.join(PROCESSED_DIR, "offense_breakdown.csv")
    if os.path.exists(offense_csv):
        df = pd.read_csv(offense_csv)
        df.to_json(os.path.join(PROCESSED_DIR, "offense_breakdown.json"), orient="records", indent=2)
        print("Converted offense_breakdown.csv -> offense_breakdown.json")

    # 7. vehicle_breakdown.csv -> vehicle_breakdown.json
    vehicle_csv = os.path.join(PROCESSED_DIR, "vehicle_breakdown.csv")
    if os.path.exists(vehicle_csv):
        df = pd.read_csv(vehicle_csv)
        df.to_json(os.path.join(PROCESSED_DIR, "vehicle_breakdown.json"), orient="records", indent=2)
        print("Converted vehicle_breakdown.csv -> vehicle_breakdown.json")

    print("All conversions complete!")

if __name__ == "__main__":
    convert_all()
