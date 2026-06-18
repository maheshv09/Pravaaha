import { useState, useEffect } from 'react';

const DATA_FILES = [
  'summary',
  'hotspots',
  'heatmap',
  'offense_breakdown',
  'vehicle_breakdown',
  'hourly_pattern',
  'daily_trend',
  'dow_pattern',
  'station_summary',
  'time_periods',
  'monthly_trend',
  'hotspots_top50',
  'patrol_priority',
];

import { apiFetch } from '../lib/utils';

export function useData() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function loadAll() {
      try {
        setProgress(20);
        // Try the dynamic backend API first
        let result = {};
        try {
          result = await apiFetch('/api/data/dashboard');
          setProgress(100);
        } catch (apiErr) {
          console.warn("Backend dynamic data failed, falling back to local static cache.", apiErr);
          // Fallback to the local frontend public/data/ json files
          for (let i = 0; i < DATA_FILES.length; i++) {
            const name = DATA_FILES[i];
            const res = await fetch(`/data/${name}.json`);
            if (!res.ok) throw new Error(`Failed to load ${name}.json`);
            result[name] = await res.json();
            setProgress(Math.round(20 + ((i + 1) / DATA_FILES.length) * 80));
          }
        }
        setData(result);
        setLoading(false);
      } catch (err) {
        console.error('Data load error:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  return { data, loading, error, progress };
}
