import React, { useState } from 'react';
import { formatNumber, getRiskBg, getRiskColor, getOffenseLabel } from '../lib/utils';

export default function Sidebar({
  open, onToggle, hotspots, summary, patrolPriority,
  mapLayer, setMapLayer, offenseFilter, setOffenseFilter,
  riskFilter, setRiskFilter, onHotspotClick
}) {
  const [sidebarTab, setSidebarTab] = useState('zones');

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-3 top-3 z-[1000] w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-pravaaha-500/20 transition-colors"
        title="Open sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-80 shrink-0 glass border-r border-border/50 flex flex-col z-10 overflow-hidden">
      {/* Controls Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Command Panel</h2>
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Map Layer Toggle */}
        <div className="flex gap-1 mb-3">
          {[
            { id: 'heat', label: '🔥 Heat' },
            { id: 'clusters', label: '📍 Clusters' },
            { id: 'both', label: '🔀 Both' },
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setMapLayer(l.id)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                mapLayer === l.id
                  ? 'bg-pravaaha-500/20 text-pravaaha-400 ring-1 ring-pravaaha-500/30'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Risk Tier</label>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="w-full mt-1 bg-muted/50 border border-border/50 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-pravaaha-500/50"
            >
              <option value="ALL">All Tiers</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Offense</label>
            <select
              value={offenseFilter}
              onChange={e => setOffenseFilter(e.target.value)}
              className="w-full mt-1 bg-muted/50 border border-border/50 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-pravaaha-500/50"
            >
              <option value="ALL">All Offenses</option>
              <option value="WRONG_PARKING">Wrong Parking</option>
              <option value="NO_PARKING">No Parking</option>
              <option value="MAIN_ROAD_PARKING">Main Road</option>
              <option value="FOOTPATH_PARKING">Footpath</option>
              <option value="NEAR_CROSSING">Near Crossing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-border/50">
        {[
          { id: 'zones', label: 'Top Zones', count: hotspots?.length },
          { id: 'patrol', label: 'Patrol Priority', count: patrolPriority?.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSidebarTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-all relative ${
              sidebarTab === t.id
                ? 'text-pravaaha-400 tab-active'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            <span className="ml-1 text-[10px] opacity-60">({t.count || 0})</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'zones' && hotspots && (
          <div className="p-2 space-y-1.5">
            {hotspots.slice(0, 50).map((h, i) => (
              <button
                key={h.cellId}
                onClick={() => onHotspotClick(h)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border/50"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-5">#{h.rank}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${getRiskBg(h.riskTier)}`}>
                      {h.riskTier}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-foreground">{h.severityScore}</span>
                </div>
                <div className="ml-7">
                  <p className="text-xs font-medium text-foreground/90 truncate">{h.station}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {h.landmark} · {h.count} violations · {getOffenseLabel(h.topOffense)}
                  </p>
                  {/* Mini severity bar */}
                  <div className="mt-1.5 flex gap-1 items-center">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${h.severityScore}%`,
                          background: `linear-gradient(90deg, ${getRiskColor(h.riskTier)}, ${getRiskColor(h.riskTier)}88)`
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono w-8 text-right">
                      {h.congestionImpact}ci
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {sidebarTab === 'patrol' && patrolPriority && (
          <div className="p-2 space-y-1.5">
            <div className="p-3 rounded-xl bg-pravaaha-500/10 border border-pravaaha-500/20 mb-2">
              <p className="text-xs font-semibold text-pravaaha-400 mb-1">🚔 Patrol Recommendation</p>
              <p className="text-[10px] text-muted-foreground">
                Top {patrolPriority.length} zones ranked by enforcement priority. Deploy officers to these zones for maximum congestion reduction.
              </p>
            </div>
            {patrolPriority.map((p, i) => (
              <button
                key={i}
                onClick={() => onHotspotClick(p)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    i < 3 ? 'bg-red-500/20 text-red-400' :
                    i < 7 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.station}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.landmark}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold font-mono" style={{ color: getRiskColor(p.riskTier) }}>
                      {p.severity}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{p.count} viol.</p>
                  </div>
                </div>
                {p.rootCauses && p.rootCauses.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/70 ml-8 truncate italic">
                    ⚡ {p.rootCauses[0]}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {summary && (
        <div className="p-3 border-t border-border/50 bg-muted/20">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-foreground font-mono">{formatNumber(summary.totalViolations)}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Violations</p>
            </div>
            <div>
              <p className="text-lg font-bold text-pravaaha-400 font-mono">{summary.totalHotspots}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Hotspots</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400 font-mono">{summary.criticalHotspots + summary.highHotspots}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">High Risk</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
