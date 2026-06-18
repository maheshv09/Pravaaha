import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart,
} from 'recharts';
import { formatNumber, getOffenseLabel, getOffenseColor, getRiskColor, formatHour } from '../lib/utils';

const CHART_COLORS = ['#3b82f6', '#ef4444', '#f97316', '#eab308', '#a855f7', '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#06b6d4'];

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`glass-card p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2.5 !border-border/50 shadow-xl text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPanel({ data }) {
  const {
    offense_breakdown, vehicle_breakdown, hourly_pattern,
    daily_trend, dow_pattern, station_summary, time_periods,
    monthly_trend, summary, hotspots
  } = data;

  // Top stations for radar
  const topStations = station_summary?.slice(0, 8).map(s => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
    violations: s.count,
  })) || [];

  // Risk distribution
  const riskDist = [
    { name: 'Critical', value: summary?.criticalHotspots || 0, color: '#ef4444' },
    { name: 'High', value: summary?.highHotspots || 0, color: '#f97316' },
    { name: 'Medium', value: summary?.mediumHotspots || 0, color: '#eab308' },
    { name: 'Low', value: summary?.lowHotspots || 0, color: '#22c55e' },
  ];

  // Offense data with colors
  const offenseData = offense_breakdown?.slice(0, 8).map(o => ({
    ...o,
    name: getOffenseLabel(o.name),
    fill: getOffenseColor(o.name),
  })) || [];

  // Hourly with formatted labels
  const hourlyData = hourly_pattern?.map(h => ({
    ...h,
    label: formatHour(h.hour),
  })) || [];

  // Treemap data for offense concentration
  const treemapData = offense_breakdown?.map(o => ({
    name: getOffenseLabel(o.name),
    size: o.count,
    fill: getOffenseColor(o.name),
  })) || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Violations', value: formatNumber(summary?.totalViolations), icon: '📋', color: 'text-pravaaha-400' },
          { label: 'Active Hotspots', value: summary?.totalHotspots, icon: '🔥', color: 'text-orange-400' },
          { label: 'Critical Zones', value: summary?.criticalHotspots + summary?.highHotspots, icon: '🚨', color: 'text-red-400' },
          { label: 'Police Stations', value: summary?.policeStations, icon: '🏛️', color: 'text-cyan-400' },
          { label: 'Daily Average', value: formatNumber(summary?.avgDailyViolations), icon: '📊', color: 'text-purple-400' },
          { label: 'Date Span', value: `${summary?.totalDays}d`, icon: '📅', color: 'text-green-400' },
        ].map((s, i) => (
          <div key={i} className="glass-card p-3 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{s.icon}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Daily Trend + Hourly Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily Violation Trend" subtitle={`${summary?.dateRange?.[0]} to ${summary?.dateRange?.[1]}`}>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={daily_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 12%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} interval={14} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="transparent" fill="url(#dailyGrad)" />
              <Line type="monotone" dataKey="count" stroke="#3b82f640" strokeWidth={1} dot={false} name="Violations" />
              <Line type="monotone" dataKey="avg7d" stroke="#3b82f6" strokeWidth={2} dot={false} name="7-Day Avg" />
              <defs>
                <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hourly Violation Pattern" subtitle="Aggregate across all days">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 12%)" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} fill="url(#hourlyGrad)" name="Violations" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Offense Mix + Risk Pie + Vehicle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Offense Type Breakdown" subtitle="Top violation categories" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={offenseData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 12%)" />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={95} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Violations" radius={[0, 6, 6, 0]}>
                {offenseData.map((d, i) => (
                  <Cell key={i} fill={d.fill || CHART_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Distribution" subtitle="Hotspot severity breakdown">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={riskDist}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {riskDist.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Day of Week + Monthly + Time Periods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Day of Week Pattern" subtitle="Weekly violation distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dow_pattern}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 12%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Violations" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Trend" subtitle="Month-over-month progression">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 12%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Violations" radius={[4, 4, 0, 0]}>
                {monthly_trend?.map((d, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Time Period Analysis" subtitle="Violations by time of day">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={time_periods}
                cx="50%" cy="50%"
                innerRadius={40} outerRadius={70}
                paddingAngle={3}
                dataKey="count"
              >
                {time_periods?.map((d, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-[10px] text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4: Vehicle Mix + Top Stations Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Vehicle Type Distribution" subtitle="Breakdown by vehicle category">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={vehicle_breakdown?.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 27.9% 12%)" />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={95} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Violations" radius={[0, 6, 6, 0]}>
                {vehicle_breakdown?.slice(0, 10).map((d, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Police Stations" subtitle="Station-wise violation concentration">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={topStations} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(215 27.9% 16%)" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
              <PolarRadiusAxis tick={{ fontSize: 8, fill: '#475569' }} />
              <Radar name="Violations" dataKey="violations" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 5: Enforcement Priority Table */}
      <ChartCard title="🚔 Enforcement Priority Ranking" subtitle="Top 20 zones by enforcement urgency">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Station</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Landmark</th>
                <th className="text-center py-2 px-2 text-muted-foreground font-medium">Risk</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Severity</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Congestion</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Violations</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Top Offense</th>
              </tr>
            </thead>
            <tbody>
              {data.patrol_priority?.map((p, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2 font-mono font-bold" style={{ color: i < 3 ? '#ef4444' : i < 7 ? '#f97316' : '#eab308' }}>
                    {i + 1}
                  </td>
                  <td className="py-2 px-2 font-medium text-foreground">{p.station}</td>
                  <td className="py-2 px-2 text-muted-foreground">{p.landmark}</td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: getRiskColor(p.riskTier) + '20', color: getRiskColor(p.riskTier) }}
                    >
                      {p.riskTier}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-foreground">{p.severity}</td>
                  <td className="py-2 px-2 text-right font-mono text-pravaaha-400">{p.congestion}</td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">{formatNumber(p.count)}</td>
                  <td className="py-2 px-2 text-muted-foreground">{getOffenseLabel(p.topOffense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="h-4" /> {/* Bottom padding */}
    </div>
  );
}
