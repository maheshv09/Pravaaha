import React, { useState, useMemo } from 'react';
import { formatNumber, getRiskColor, getOffenseLabel } from '../lib/utils';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function MissionModePanel({ data, setActiveTab, setSelectedHotspot }) {
  const [generating, setGenerating] = useState(false);
  const [missionActive, setMissionActive] = useState(false);

  const topCritical = data.hotspots?.filter(h => h.riskTier === 'CRITICAL' || h.riskTier === 'HIGH') || [];
  
  const emergingHotspots = data.hotspots?.filter(h => h.growthTrend > 0.4).slice(0, 3) || [];
  
  const handleGeneratePlan = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setMissionActive(true);
    }, 2000);
  };

  const handleFocus = (hotspot) => {
    setSelectedHotspot(hotspot);
    setActiveTab('map');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
            <span>🚀</span> Mission Control
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Autonomous Enforcement Commander & Daily Intelligence</p>
        </div>
        
        {!missionActive && (
          <button 
            onClick={handleGeneratePlan}
            disabled={generating}
            className="px-6 py-3 bg-pravaaha-600 text-white rounded-xl font-bold hover:bg-pravaaha-500 transition-all flex items-center gap-2 shadow-lg shadow-pravaaha-600/20 disabled:opacity-50"
          >
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Action Plan...</>
            ) : (
              <>⚡ Generate Executive Action Plan</>
            )}
          </button>
        )}
        {missionActive && (
          <button className="px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-bold flex items-center gap-2">
            ✅ Plan Generated. Download PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Autonomous Monitor */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-5 border-l-4 border-l-orange-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-2xl rounded-full" />
            <h3 className="text-sm font-bold text-orange-400 mb-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Autonomous Commander Alerts
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Continuous city-wide condition monitoring.</p>
            
            <div className="space-y-3">
              {emergingHotspots.map((h, i) => (
                <div key={i} className="bg-background/50 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-foreground">Rapid Growth: {h.station}</p>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">+{Math.round(h.growthTrend*100)}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Unusual spike in {getOffenseLabel(h.topOffense)} detected over the last 48 hours.</p>
                  <button onClick={() => handleFocus(h)} className="text-[10px] text-pravaaha-400 font-medium hover:underline">Focus Map →</button>
                </div>
              ))}
              
              <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-foreground">Severe Congestion: Silk Board</p>
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Critical</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">Queue formation spreading downstream due to illegal parking.</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Daily Intelligence Briefing</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-pravaaha-400">•</span> Total Hotspots Monitored: {data.summary?.totalHotspots}</li>
              <li className="flex gap-2"><span className="text-red-400">•</span> High-Risk Zones Active: {topCritical.length}</li>
              <li className="flex gap-2"><span className="text-orange-400">•</span> Predicted Evening Pressure: Indiranagar</li>
              <li className="flex gap-2"><span className="text-green-400">•</span> Suggested Patrol Adjustments: 3</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Mission Action Plan */}
        <div className="lg:col-span-2">
          {missionActive ? (
            <div className="space-y-6 animate-fade-in-up">
              <div className="glass-card p-6 border border-pravaaha-500/30">
                <h3 className="text-lg font-bold text-pravaaha-400 mb-2">Strategic Deployment Plan</h3>
                <p className="text-sm text-muted-foreground mb-6">Generated based on highest enforcement ROI and propagation risk.</p>
                
                <div className="space-y-4">
                  {data.patrol_priority?.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-4 p-4 bg-muted/20 rounded-xl border border-border/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-md bg-pravaaha-500/20 text-pravaaha-400 flex items-center justify-center font-bold text-xs">{i+1}</div>
                          <h4 className="font-bold text-foreground">{p.station}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">📍 Near {p.landmark}</p>
                        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                          "Congestion risk increased. {p.rootCauses[0]}"
                        </p>
                      </div>
                      
                      <div className="w-full md:w-48 space-y-2 bg-background/50 p-3 rounded-lg">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Recommended Action</p>
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <span>👮</span> Deploy 2 Officers
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <span>🚐</span> 1 Towing Vehicle
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <span>⏰</span> 17:00 - 20:00
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-[10px] font-bold text-green-400">Expected ROI: High (32% reduction)</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full glass-card p-8 flex flex-col items-center justify-center text-center border-dashed">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-2xl">📋</div>
              <h3 className="text-lg font-bold text-foreground mb-2">No Active Mission Plan</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Click "Generate Executive Action Plan" to autonomously analyze all city data and produce an optimized deployment and patrol strategy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
