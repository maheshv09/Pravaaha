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

export function useData() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function loadAll() {
      try {
        const result = {};
        for (let i = 0; i < DATA_FILES.length; i++) {
          const name = DATA_FILES[i];
          const res = await fetch(`/data/${name}.json`);
          if (!res.ok) throw new Error(`Failed to load ${name}.json`);
          result[name] = await res.json();
          setProgress(Math.round(((i + 1) / DATA_FILES.length) * 100));
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
