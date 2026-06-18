# Pravaaha — Parking Congestion Intelligence Command Center

Pravaaha is a 3-layer GeoIntel platform designed to ingest raw parking violation data, extract statistical hotspot structures, score them for actual congestion impact, and enable an AI Copilot for the Bangalore Police to generate proactive enforcement and patrol plans.

## Project Structure

- `frontend/`: The React + Vite frontend dashboard featuring live heatmaps, hotspot analytics, and an AI Copilot interface.
- `backend/`: The FastAPI Python backend providing routing (OSRM), geocoding cache (Nominatim), and Copilot AI integration (Groq Llama 3.1).

---

## 1. Running the Frontend

The frontend is fully standalone, having processed the raw CSV dataset into optimized JSON analytics using a built-in NodeJS script.

### Preprocessing (Already Done)
To process new data, put your CSV in `frontend/` and run:
```bash
cd frontend
node preprocess.js "jan to may police violation_anonymized791b166.csv"
```
*This extracts spatial grids, analyzes recurrences, builds time-series stats, and places the data in `frontend/public/data/`.*

### Starting the React UI
When you have internet access, install the node modules and start Vite:
```bash
cd frontend
npm install
npm run dev
```

---

## 2. Running the Backend

The Python backend connects the Frontend to Groq AI Copilot, OSRM Patrol Routing, and Geocoding APIs.

### Setup Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Configure Keys
Export your Groq API Key to enable the `llama-3.1-8b-instant` copilot:
```bash
export GROQ_API_KEY="your-groq-key-here"
```

### Start FastAPI Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*API docs will be available at `http://localhost:8000/docs`.*

---

## Features Implemented:
1. **Data Preprocessing & Normalization**: Spatial hex grids (using Haversine fallback), timezone conversion, clustering.
2. **Proxy-based Congestion Impact Model**: A multi-factor severity scoring matrix taking into account recurrences, weekend load, violation density, and proximity to landmarks.
3. **OSRM Route Optimizer**: A dedicated `api/routing.py` to calculate optimal patrol paths through top hotspots.
4. **Nominatim Caching**: A rate-limit-safe geocoding cache implemented in `api/geocoding.py`.
5. **Groq Llama-3.1 Copilot**: Agentic backend integration parsing spatial queries and intents into structured JSON summaries.
6. **Leaflet Heatmap UI**: React UI with dynamic heat layers, cluster point interactions, and drill-down evidence cards.
7. **Analytics Dashboard**: Multi-dimensional charts showing daily trends, hourly spread, offense taxonomy, and enforcement priority lists via Recharts.
