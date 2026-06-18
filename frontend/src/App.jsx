import React, { useState, useMemo, useCallback } from 'react';
import { useData } from './hooks/useData';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsPanel from './components/AnalyticsPanel';
import CopilotPanel from './components/CopilotPanel';
import HotspotDetail from './components/HotspotDetail';
import LoadingScreen from './components/LoadingScreen';
import MissionModePanel from './components/MissionModePanel';
import SimulationPanel from './components/SimulationPanel';

export default function App() {
  const { data, loading, error, progress } = useData();
  const [activeTab, setActiveTab] = useState('map');
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [mapLayer, setMapLayer] = useState('heat');
  const [offenseFilter, setOffenseFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Bangalore
  const [mapZoom, setMapZoom] = useState(12);

  const handleMapAction = useCallback((action) => {
    if (action.type === 'ZOOM_TO') {
      setMapCenter([action.lat, action.lon]);
      setMapZoom(action.zoom || 15);
      if (action.hotspotId) {
        const h = data.hotspots?.find(h => h.cellId === action.hotspotId || h.station.toLowerCase().includes(action.hotspotId.toLowerCase()));
        if (h) setSelectedHotspot(h);
      }
      setActiveTab('map');
    } else if (action.type === 'FILTER') {
      if (action.filterType === 'offense') setOffenseFilter(action.value);
      if (action.filterType === 'risk') setRiskFilter(action.value);
      setActiveTab('map');
    } else if (action.type === 'SET_LAYER') {
      setMapLayer(action.value);
      setActiveTab('map');
    } else if (action.type === 'SWITCH_TAB') {
      setActiveTab(action.tab);
    }
  }, [data.hotspots]);

  const filteredHotspots = useMemo(() => {
    if (!data.hotspots) return [];
    let filtered = data.hotspots;
    if (offenseFilter !== 'ALL') {
      filtered = filtered.filter(h => h.topOffense === offenseFilter);
    }
    if (riskFilter !== 'ALL') {
      filtered = filtered.filter(h => h.riskTier === riskFilter);
    }
    return filtered;
  }, [data.hotspots, offenseFilter, riskFilter]);

  const handleHotspotClick = useCallback((hotspot) => {
    setSelectedHotspot(hotspot);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedHotspot(null);
  }, []);

  if (loading) return <LoadingScreen progress={progress} />;
  if (error) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="glass-card p-8 max-w-md text-center">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-foreground mb-2">Data Load Error</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <p className="text-sm text-muted-foreground">
          Run <code className="bg-muted px-2 py-1 rounded text-xs font-mono">node preprocess.js</code> first to generate data files.
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={data.summary}
      />

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'map' && (
          <>
            <Sidebar
              open={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              hotspots={filteredHotspots}
              summary={data.summary}
              patrolPriority={data.patrol_priority}
              mapLayer={mapLayer}
              setMapLayer={setMapLayer}
              offenseFilter={offenseFilter}
              setOffenseFilter={setOffenseFilter}
              riskFilter={riskFilter}
              setRiskFilter={setRiskFilter}
              onHotspotClick={handleHotspotClick}
            />
            <div className="flex-1 relative">
              <MapView
                hotspots={filteredHotspots}
                heatmapData={data.heatmap}
                mapLayer={mapLayer}
                onHotspotClick={handleHotspotClick}
                selectedHotspot={selectedHotspot}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
              />
              {selectedHotspot && (
                <HotspotDetail
                  hotspot={selectedHotspot}
                  onClose={handleCloseDetail}
                />
              )}
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPanel data={data} />
        )}

        {activeTab === 'simulation' && (
          <SimulationPanel data={data} />
        )}

        {activeTab === 'mission' && (
          <MissionModePanel data={data} setActiveTab={setActiveTab} setSelectedHotspot={setSelectedHotspot} />
        )}

        {activeTab === 'copilot' && (
          <CopilotPanel data={data} hotspots={data.hotspots} onMapAction={handleMapAction} />
        )}
      </div>
    </div>
  );
}
