import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { getOffenseLabel } from '../lib/utils';

export default function SimulationPanel({ data }) {
  const [simType, setSimType] = useState('whatif');
  const [selectedZone, setSelectedZone] = useState('Koramangala');
  const [intervention, setIntervention] = useState('officers');
  const [simPlaying, setSimPlaying] = useState(false);
  const [timeStep, setTimeStep] = useState(0);

  const zones = ["Koramangala", "Indiranagar", "MG Road", "Silk Board", "Whitefield"];
  
  // What-If Simulation Data
  const baseDelay = [20, 25, 40, 60, 85, 70, 45, 30];
  const interventionDelay = {
    none: baseDelay,
    officers: [20, 25, 35, 45, 50, 45, 35, 25],
    tow: [20, 25, 30, 35, 40, 35, 25, 20],
    clearing: [20, 25, 30, 35, 30, 25, 20, 20],
  };

  const chartData = baseDelay.map((v, i) => ({
    time: `${i+14}:00`,
    scenarioA: v,
    scenarioB: interventionDelay[intervention][i],
  }));

  // Replay Data Mock
  const handlePlayReplay = () => {
    setSimPlaying(true);
    setTimeStep(0);
    const interval = setInterval(() => {
      setTimeStep(prev => {
        if (prev >= 5) {
          clearInterval(interval);
          setSimPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const replayStates = [
    { time: "16:00", msg: "Traffic normal. Minor illegal parking starts.", spread: 0 },
    { time: "16:30", msg: "Hotspot forms on main road. Lane narrowing.", spread: 20 },
    { time: "17:00", msg: "Queue formation. Upstream intersection impacted.", spread: 50 },
    { time: "17:30", msg: "Severe congestion. Secondary roads clogging.", spread: 80 },
    { time: "18:00", msg: "Network-wide spread. 45min delays.", spread: 100 },
    { time: "18:30", msg: "Peak spread reached.", spread: 100 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="flex items-center gap-4 mb-6 border-b border-border/50 pb-4">
        <h2 className="text-xl font-bold text-foreground mr-4">🔬 Traffic Simulator</h2>
        <button onClick={() => setSimType('whatif')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${simType === 'whatif' ? 'bg-pravaaha-500 text-white' : 'bg-muted/50 text-muted-foreground'}`}>What-If Engine</button>
        <button onClick={() => setSimType('event')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${simType === 'event' ? 'bg-pravaaha-500 text-white' : 'bg-muted/50 text-muted-foreground'}`}>Predictive Events</button>
        <button onClick={() => setSimType('replay')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${simType === 'replay' ? 'bg-pravaaha-500 text-white' : 'bg-muted/50 text-muted-foreground'}`}>Digital Twin Replay</button>
      </div>

      {simType === 'whatif' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-5 space-y-5">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Target Zone</label>
              <select value={selectedZone} onChange={e=>setSelectedZone(e.target.value)} className="w-full mt-2 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Intervention Strategy</label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/20">
                  <input type="radio" checked={intervention==='none'} onChange={()=>setIntervention('none')} name="interv" /> No Action (Baseline)
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/20">
                  <input type="radio" checked={intervention==='officers'} onChange={()=>setIntervention('officers')} name="interv" /> Deploy 2 Officers
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/20">
                  <input type="radio" checked={intervention==='tow'} onChange={()=>setIntervention('tow')} name="interv" /> Deploy 1 Tow Truck
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/20">
                  <input type="radio" checked={intervention==='clearing'} onChange={()=>setIntervention('clearing')} name="interv" /> Clear within 30 mins
                </label>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 glass-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-1">Scenario Comparison</h3>
            <p className="text-xs text-muted-foreground mb-6">Predicted congestion delay (minutes) over time.</p>
            
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 12%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(224 71.4% 6%)', border: '1px solid hsl(215 27.9% 20%)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="scenarioA" name="No Action" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
                  <Area type="monotone" dataKey="scenarioB" name="With Intervention" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Peak Delay Reduced</p>
                <p className="text-xl font-bold text-green-400">-{Math.max(...baseDelay) - Math.max(...interventionDelay[intervention])} mins</p>
              </div>
              <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Violation Prevention</p>
                <p className="text-xl font-bold text-pravaaha-400">~35%</p>
              </div>
              <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Hotspot Duration</p>
                <p className="text-xl font-bold text-orange-400">-2.5 hrs</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {simType === 'replay' && (
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-6 text-center">
            <h3 className="text-lg font-bold text-foreground mb-2">Traffic Digital Twin Replay</h3>
            <p className="text-sm text-muted-foreground mb-8">Watch historical congestion evolve and spread across the network to understand propagation paths.</p>
            
            <div className="relative h-20 mb-8">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted rounded-full -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-0 h-1 bg-pravaaha-500 rounded-full -translate-y-1/2 transition-all duration-300" style={{ width: `${(timeStep / 5) * 100}%` }}></div>
              
              {replayStates.map((s, i) => (
                <div key={i} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all duration-300 ${i <= timeStep ? 'bg-pravaaha-500 border-background' : 'bg-muted border-background'}`} style={{ left: `${(i / 5) * 100}%` }}>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground">{s.time}</span>
                </div>
              ))}
            </div>

            <div className="bg-muted/20 border border-border/50 rounded-xl p-6 mb-6 min-h-[120px] flex items-center justify-center">
              <div>
                <p className="text-2xl font-bold text-orange-400 mb-2">{replayStates[timeStep]?.time}</p>
                <p className="text-foreground">{replayStates[timeStep]?.msg}</p>
              </div>
            </div>

            <button onClick={handlePlayReplay} disabled={simPlaying} className="px-8 py-3 bg-pravaaha-600 text-white rounded-full font-bold hover:bg-pravaaha-500 disabled:opacity-50 flex items-center gap-2 mx-auto">
              {simPlaying ? '⏸ Playing Replay...' : '▶ Start Replay'}
            </button>
          </div>
        </div>
      )}

      {simType === 'event' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Predictive Event Impact</h3>
            <div className="space-y-4">
              <button className="w-full text-left p-3 rounded-lg border border-pravaaha-500/50 bg-pravaaha-500/10">
                <span className="text-xl mr-2">🏏</span>
                <span className="font-bold">Cricket Match (Chinnaswamy)</span>
                <p className="text-xs text-muted-foreground mt-1">Tomorrow, 19:00 - High Impact</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-border/50 hover:bg-muted/20">
                <span className="text-xl mr-2">🎤</span>
                <span className="font-bold">Music Concert (Palace Grounds)</span>
                <p className="text-xs text-muted-foreground mt-1">Sat, 18:00 - Medium Impact</p>
              </button>
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold text-red-400 mb-2">Estimated Impact (Cricket Match)</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">Congestion Risk</span>
                <span className="font-bold text-red-400">Critical (+85%)</span>
              </li>
              <li className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">Likely Violations</span>
                <span className="font-bold">Footpath & Wrong Parking</span>
              </li>
              <li className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-muted-foreground">Affected Roads</span>
                <span className="font-bold text-orange-400">Cubbon Road, MG Road</span>
              </li>
              <li className="flex justify-between pt-2">
                <span className="text-muted-foreground">Recommendation</span>
                <span className="font-bold text-pravaaha-400">Pre-deploy 5 towing units</span>
              </li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
