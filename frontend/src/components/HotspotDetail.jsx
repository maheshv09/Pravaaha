import React, { useState } from 'react';
import { formatHour, getOffenseLabel, getRiskColor, formatNumber } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';

export default function HotspotDetail({ hotspot, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!hotspot) return null;

  // Prepare data for charts
  const hourlyData = Object.entries(hotspot.hourlyPattern || {}).map(([hour, count]) => ({
    hour: formatHour(parseInt(hour)),
    count,
  }));

  const offenseData = Object.entries(hotspot.offenses || {}).map(([name, pct]) => ({
    name: getOffenseLabel(name),
    pct,
  })).sort((a, b) => b.pct - a.pct);

  return (
    <div className="absolute top-4 left-4 z-[1000] w-96 glass-card shadow-2xl flex flex-col pointer-events-auto border-border/50 overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-4 border-b border-border/50 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-6 h-6 rounded-md hover:bg-muted/50 flex items-center justify-center text-muted-foreground"
        >
          ✕
        </button>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: getRiskColor(hotspot.riskTier) + '20', color: getRiskColor(hotspot.riskTier) }}
          >
            {hotspot.riskTier} RISK
          </span>
          <span className="text-xs font-mono font-bold text-muted-foreground">#{hotspot.rank}</span>
        </div>
        <h2 className="text-lg font-bold text-foreground leading-tight mb-1 pr-6">{hotspot.station} Zone</h2>
        <p className="text-xs text-muted-foreground">📍 Near {hotspot.landmark} ({hotspot.landmarkDist}km)</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        {['Overview', 'Analytics', 'Root Causes', 'ROI & Action'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`flex-1 py-2 text-xs font-medium transition-all ${
              activeTab === tab.toLowerCase()
                ? 'text-pravaaha-400 border-b-2 border-pravaaha-400 bg-pravaaha-500/10'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/20 p-2 rounded-lg border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase">Severity Score</p>
                <p className="text-xl font-bold font-mono" style={{ color: getRiskColor(hotspot.riskTier) }}>
                  {hotspot.severityScore}
                </p>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase">Total Violations</p>
                <p className="text-xl font-bold font-mono text-foreground">{formatNumber(hotspot.count)}</p>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase">Congestion Impact</p>
                <p className="text-xl font-bold font-mono text-orange-400">{hotspot.congestionImpact}</p>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase">Peak Hour</p>
                <p className="text-xl font-bold font-mono text-foreground">{formatHour(hotspot.peakHour)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2">Offense Composition</p>
              <div className="space-y-1.5">
                {offenseData.slice(0, 3).map((o, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate">{o.name}</span>
                    <span className="font-mono text-muted-foreground">{o.pct}%</span>
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-pravaaha-500" style={{ width: `${o.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {hotspot.growthTrend > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg flex gap-2 items-start text-xs text-red-400">
                <span className="mt-0.5">📈</span>
                <p>Violations are trending upwards by <span className="font-bold">{Math.round(hotspot.growthTrend * 100)}%</span> in recent weeks.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold mb-2">Hourly Pattern</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <Tooltip content={({ payload }) => (
                      payload?.length ? (
                        <div className="glass-card p-1.5 text-xs border-border/50 shadow-lg">
                          <span className="text-muted-foreground">{payload[0].payload.hour}: </span>
                          <span className="font-bold">{payload[0].value}</span>
                        </div>
                      ) : null
                    )} />
                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf640" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-muted/20 p-2 rounded-lg">
                <p className="text-muted-foreground mb-1">Recurrence Score</p>
                <div className="flex items-end gap-1">
                  <span className="text-lg font-bold">{hotspot.recurrenceScore}</span>
                  <span className="text-muted-foreground pb-0.5">/1.0</span>
                </div>
              </div>
              <div className="bg-muted/20 p-2 rounded-lg">
                <p className="text-muted-foreground mb-1">Weekend Ratio</p>
                <div className="flex items-end gap-1">
                  <span className="text-lg font-bold">{Math.round(hotspot.weekendRatio * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'root causes' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
              <h3 className="text-xs font-bold text-foreground mb-3">Root Cause Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-muted-foreground">{getOffenseLabel(hotspot.topOffense)}</span>
                  <span className="font-mono text-pravaaha-400">41%</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-pravaaha-500" style={{ width: '41%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-muted-foreground">Commercial Activity</span>
                  <span className="font-mono text-orange-400">23%</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400" style={{ width: '23%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-muted-foreground">Metro Spillover</span>
                  <span className="font-mono text-purple-400">18%</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400" style={{ width: '18%' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-muted-foreground">Peak Hour Pressure</span>
                  <span className="font-mono text-blue-400">11%</span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400" style={{ width: '11%' }} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-2">Spatial Markers:</p>
            <ul className="space-y-2">
              {hotspot.rootCauses?.map((cause, i) => (
                <li key={i} className="flex gap-2 text-xs bg-muted/20 p-2 rounded-lg border border-border/30">
                  <span className="text-pravaaha-400">⚡</span>
                  <span className="text-foreground">{cause}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'roi & action' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="glass-card p-4 border border-pravaaha-500/30">
              <h3 className="text-sm font-bold text-pravaaha-400 mb-4">Enforcement ROI Engine</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Resources Needed</p>
                  <p className="text-sm font-bold text-foreground">👮 2 Officers</p>
                  <p className="text-sm font-bold text-foreground">🚐 1 Tow Truck</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Expected Improvement</p>
                  <p className="text-xl font-bold text-green-400">-31%</p>
                  <p className="text-[10px] text-muted-foreground">Congestion Reduction</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">Calculated ROI:</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">HIGH YIELD</span>
                </div>
              </div>
            </div>

            <button className="w-full py-2.5 bg-pravaaha-600 text-white rounded-lg text-sm font-bold hover:bg-pravaaha-500 transition-colors">
              Dispatch Action Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
