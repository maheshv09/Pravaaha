import React from 'react';
import { formatNumber } from '../lib/utils';

const TABS = [
  { id: 'mission', label: 'Mission Control', icon: '🚀' },
  { id: 'map', label: 'Live Heatmap', icon: '🗺️' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'simulation', label: 'Simulator', icon: '🔬' },
  { id: 'copilot', label: 'Copilot', icon: '🤖' },
];

export default function Header({ activeTab, setActiveTab, summary }) {
  return (
    <header className="h-14 glass border-b border-border/50 flex items-center px-4 z-50 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pravaaha-500 to-purple-600 flex items-center justify-center shadow-md shadow-pravaaha-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold gradient-text leading-none">PRAVAAHA</h1>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Intelligence Command Center</p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 mr-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-pravaaha-500/15 text-pravaaha-400 shadow-sm shadow-pravaaha-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
            `}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Quick Stats */}
      {summary && (
        <div className="hidden lg:flex items-center gap-5 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-pravaaha-400 animate-pulse" />
            <span className="text-muted-foreground">Violations</span>
            <span className="font-bold text-foreground font-mono">{formatNumber(summary.totalViolations)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-muted-foreground">Critical</span>
            <span className="font-bold text-red-400 font-mono">{summary.criticalHotspots}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-muted-foreground">High</span>
            <span className="font-bold text-orange-400 font-mono">{summary.highHotspots}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-muted-foreground">Stations</span>
            <span className="font-bold text-foreground font-mono">{summary.policeStations}</span>
          </div>
        </div>
      )}
    </header>
  );
}
