import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from 'react-leaflet';
import { getRiskColor, getOffenseLabel, formatNumber } from '../lib/utils';
import HeatmapLayer from './HeatmapLayer';

// Bangalore center
const BLR_CENTER = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

function FlyToHotspot({ hotspot, center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (hotspot) {
      map.flyTo([hotspot.lat, hotspot.lon], 16, { duration: 1.2 });
    } else if (center && zoom) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [hotspot, center, zoom, map]);
  return null;
}

function MapLegend() {
  return (
    <div className="absolute bottom-6 left-6 z-[1000] glass-card p-3 pointer-events-auto">
      <p className="text-[10px] font-semibold text-foreground mb-2 uppercase tracking-wider">Risk Level</p>
      <div className="space-y-1">
        {[
          { tier: 'CRITICAL', color: '#ef4444', label: 'Critical (75-100)' },
          { tier: 'HIGH', color: '#f97316', label: 'High (50-75)' },
          { tier: 'MEDIUM', color: '#eab308', label: 'Medium (25-50)' },
          { tier: 'LOW', color: '#22c55e', label: 'Low (0-25)' },
        ].map(r => (
          <div key={r.tier} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: r.color }} />
            <span className="text-[10px] text-muted-foreground">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HotspotMarkers({ hotspots, onHotspotClick }) {
  return (
    <>
      {hotspots.slice(0, 200).map(h => {
        const color = getRiskColor(h.riskTier);
        const radius = Math.max(4, Math.min(18, Math.sqrt(h.count / 10)));
        return (
          <CircleMarker
            key={h.cellId || `${h.lat}_${h.lon}`}
            center={[h.lat, h.lon]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.5,
              weight: 2,
              opacity: 0.8,
            }}
            eventHandlers={{
              click: () => onHotspotClick(h),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">#{h.rank} {h.station}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: color + '30', color }}
                  >
                    {h.riskTier}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                  <div><span className="opacity-60">Violations:</span> <b>{h.count}</b></div>
                  <div><span className="opacity-60">Severity:</span> <b>{h.severityScore}</b></div>
                  <div><span className="opacity-60">Congestion:</span> <b>{h.congestionImpact}</b></div>
                  <div><span className="opacity-60">Peak:</span> <b>{h.peakHour}:00</b></div>
                </div>
                <div className="text-xs opacity-70">
                  📍 {h.landmark} ({h.landmarkDist}km)
                </div>
                <div className="text-xs mt-1 opacity-70">
                  🏷️ {getOffenseLabel(h.topOffense)}
                </div>
                <button
                  className="mt-2 w-full py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium hover:bg-blue-500/30 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onHotspotClick(h); }}
                >
                  View Details →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function MapView({ hotspots, heatmapData, mapLayer, onHotspotClick, selectedHotspot, mapCenter, mapZoom }) {
  const showHeat = mapLayer === 'heat' || mapLayer === 'both';
  const showClusters = mapLayer === 'clusters' || mapLayer === 'both';

  const heatPoints = useMemo(() => {
    if (!heatmapData) return [];
    return heatmapData.map(p => [p.lat, p.lon, Math.min(p.w / 10, 1)]);
  }, [heatmapData]);

  // Congestion Propagation (Feature 3)
  // Mock propagation paths to nearby lower-severity hotspots
  const propagationPaths = useMemo(() => {
    if (!selectedHotspot || !hotspots) return [];
    const nearby = hotspots.filter(h => 
      h.cellId !== selectedHotspot.cellId && 
      Math.abs(h.lat - selectedHotspot.lat) < 0.015 &&
      Math.abs(h.lon - selectedHotspot.lon) < 0.015
    ).slice(0, 4); // Top 4 downstream
    
    return nearby.map(h => ({
      path: [[selectedHotspot.lat, selectedHotspot.lon], [h.lat, h.lon]],
      color: getRiskColor(h.riskTier)
    }));
  }, [selectedHotspot, hotspots]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={mapCenter || BLR_CENTER}
        zoom={mapZoom || DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {showHeat && heatPoints.length > 0 && (
          <HeatmapLayer points={heatPoints} />
        )}

        {/* Congestion Propagation Lines */}
        {propagationPaths.map((p, i) => (
          <Polyline 
            key={i} 
            positions={p.path} 
            pathOptions={{ color: p.color, weight: 3, opacity: 0.6, dashArray: '5, 10' }} 
          />
        ))}

        {showClusters && hotspots && (
          <HotspotMarkers hotspots={hotspots} onHotspotClick={onHotspotClick} />
        )}

        <FlyToHotspot hotspot={selectedHotspot} center={mapCenter} zoom={mapZoom} />
      </MapContainer>

      <MapLegend />

      {/* Top right stats overlay */}
      <div className="absolute top-4 right-4 z-[1000] glass-card p-3 text-right pointer-events-auto">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Showing</p>
        <p className="text-lg font-bold text-foreground font-mono">{hotspots?.length || 0}</p>
        <p className="text-[10px] text-muted-foreground">hotspot zones</p>
      </div>
    </div>
  );
}
