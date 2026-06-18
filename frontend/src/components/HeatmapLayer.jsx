import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius: 20,
      blur: 25,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.3,
      gradient: {
        0.0: '#0d0887',
        0.1: '#46039f',
        0.2: '#7201a8',
        0.3: '#9c179e',
        0.4: '#bd3786',
        0.5: '#d8576b',
        0.6: '#ed7953',
        0.7: '#fb9f3a',
        0.8: '#fdca26',
        0.9: '#f0f921',
        1.0: '#ffffff',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}
