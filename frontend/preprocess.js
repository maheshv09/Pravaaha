#!/usr/bin/env node
/**
 * Pravaaha — Data Preprocessing Pipeline (Node.js)
 * Processes raw police violation CSV into analysis-ready JSON files.
 * No external dependencies required — uses only Node.js built-ins.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Config ──────────────────────────────────────────────────────────────────
const BLR_LAT_MIN = 12.75, BLR_LAT_MAX = 13.20;
const BLR_LON_MIN = 77.40, BLR_LON_MAX = 77.85;
const GRID_SIZE = 0.005;       // ~500m grid cells
const FINE_GRID_SIZE = 0.002;  // ~200m fine grid
const OUTPUT_DIR = path.join(__dirname, 'public', 'data');

// ── Offense normalization ───────────────────────────────────────────────────
const OFFENSE_MAP = {
  'WRONG PARKING': 'WRONG_PARKING',
  'NO PARKING': 'NO_PARKING',
  'PARKING IN A MAIN ROAD': 'MAIN_ROAD_PARKING',
  'PARKING NEAR ROAD CROSSING': 'NEAR_CROSSING',
  'PARKING ON FOOTPATH': 'FOOTPATH_PARKING',
  'DEFECTIVE NUMBER PLATE': 'DEFECTIVE_PLATE',
  'PARKING IN BUS STAND': 'BUS_STAND_PARKING',
  'PARKING ON CURVE': 'CURVE_PARKING',
  'PARKING ON BRIDGE': 'BRIDGE_PARKING',
  'PARKING NEAR TRAFFIC SIGNAL': 'NEAR_SIGNAL',
  'PARKING AGAINST FLOW': 'AGAINST_FLOW',
  'DOUBLE PARKING': 'DOUBLE_PARKING',
};

// ── Bangalore landmarks ────────────────────────────────────────────────────
const LANDMARKS = {
  'Majestic Bus Station': [12.9767, 77.5713],
  'KR Market': [12.9633, 77.5779],
  'MG Road Metro': [12.9756, 77.6068],
  'Koramangala': [12.9352, 77.6245],
  'Indiranagar': [12.9784, 77.6408],
  'Whitefield': [12.9698, 77.7500],
  'Electronic City': [12.8440, 77.6603],
  'Jayanagar': [12.9308, 77.5838],
  'Malleshwaram': [12.9969, 77.5707],
  'HSR Layout': [12.9116, 77.6389],
  'Yeshwanthpur': [13.0220, 77.5482],
  'Hebbal': [13.0358, 77.5970],
  'Silk Board Junction': [12.9173, 77.6229],
  'KR Puram': [13.0074, 77.6960],
  'Marathahalli': [12.9591, 77.6974],
  'Banashankari': [12.9255, 77.5468],
  'BTM Layout': [12.9166, 77.6101],
  'Yelahanka': [13.1007, 77.5963],
  'Peenya': [13.0300, 77.5200],
  'Kempegowda Airport': [13.1989, 77.7068],
};

// ── Utilities ───────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function nearestLandmark(lat, lon) {
  let minDist = Infinity, nearest = 'Unknown';
  for (const [name, [llat, llon]] of Object.entries(LANDMARKS)) {
    const d = haversine(lat, lon, llat, llon);
    if (d < minDist) { minDist = d; nearest = name; }
  }
  return { name: nearest, distance: Math.round(minDist * 100) / 100 };
}

function parseViolationTypes(raw) {
  if (!raw || raw === 'NULL') return ['UNKNOWN'];
  try {
    // The field looks like: ["WRONG PARKING","NO PARKING"]
    const matches = raw.match(/"([^"]+)"/g);
    if (matches) {
      return matches.map(m => {
        const cleaned = m.replace(/"/g, '').trim();
        return OFFENSE_MAP[cleaned] || cleaned.replace(/ /g, '_');
      });
    }
  } catch(e) {}
  return ['UNKNOWN'];
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i+1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function timePeriod(hour) {
  if (hour >= 6 && hour < 10) return 'morning_rush';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon_rush';
  if (hour >= 18 && hour < 22) return 'evening_rush';
  return 'night';
}

// ── Main Pipeline ───────────────────────────────────────────────────────────
async function processCSV(csvPath) {
  console.log(`[Pravaaha] Processing: ${csvPath}`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers = null;
  let violations = [];
  let lineNum = 0;
  let skipped = 0;
  const seen = new Set();

  for await (const rawLine of rl) {
    const line = rawLine.replace(/\r/g, '');
    lineNum++;
    if (lineNum === 1) {
      headers = parseCSVLine(line);
      continue;
    }

    const fields = parseCSVLine(line);
    if (fields.length < headers.length - 2) { skipped++; continue; }

    const row = {};
    headers.forEach((h, i) => { row[h] = fields[i] || ''; });

    // Parse lat/lon
    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);
    if (isNaN(lat) || isNaN(lon)) { skipped++; continue; }

    // Bangalore bounding box filter
    if (lat < BLR_LAT_MIN || lat > BLR_LAT_MAX || lon < BLR_LON_MIN || lon > BLR_LON_MAX) { skipped++; continue; }

    // Parse timestamp
    const dtStr = row.created_datetime;
    if (!dtStr) { skipped++; continue; }
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime())) { skipped++; continue; }

    // Dedup key
    const dedupKey = `${lat.toFixed(6)}_${lon.toFixed(6)}_${dtStr}_${row.vehicle_number}`;
    if (seen.has(dedupKey)) { skipped++; continue; }
    seen.add(dedupKey);

    // Parse offenses
    const offenses = parseViolationTypes(row.violation_type);
    const primaryOffense = offenses[0];

    // Time features (convert to IST = UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(dt.getTime() + istOffset);
    const hour = istDate.getUTCHours();
    const dayOfWeek = istDate.getUTCDay(); // 0=Sun
    const dateStr = istDate.toISOString().slice(0, 10);
    const month = istDate.getUTCMonth() + 1;
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0;

    // Grid cell
    const gridLat = Math.floor(lat / GRID_SIZE);
    const gridLon = Math.floor(lon / GRID_SIZE);
    const gridCell = `${gridLat}_${gridLon}`;

    // Vehicle type
    const vehicleType = (row.vehicle_type || 'UNKNOWN').trim().toUpperCase();
    const station = (row.police_station || 'Unknown').trim();

    violations.push({
      id: row.id,
      lat, lon,
      primaryOffense,
      offenses,
      vehicleType,
      hour, dayOfWeek, dateStr, month, isWeekend,
      timePeriod: timePeriod(hour),
      gridCell,
      station,
      junction: (row.junction_name || 'No Junction').trim(),
    });

    if (lineNum % 50000 === 0) console.log(`  ...processed ${lineNum} lines`);
  }

  console.log(`[Pravaaha] Loaded ${violations.length} violations (${skipped} skipped)`);

  // ── Build grid-cell hotspots ──────────────────────────────────────────
  console.log('[Pravaaha] Building hotspots...');
  const cellMap = {};

  for (const v of violations) {
    if (!cellMap[v.gridCell]) {
      cellMap[v.gridCell] = {
        cellId: v.gridCell,
        lats: [], lons: [],
        offenses: {},
        vehicles: {},
        vehicleNums: new Set(),
        hours: [],
        dates: new Set(),
        stations: {},
        isWeekendCount: 0,
        count: 0,
      };
    }
    const c = cellMap[v.gridCell];
    c.lats.push(v.lat);
    c.lons.push(v.lon);
    c.count++;
    c.offenses[v.primaryOffense] = (c.offenses[v.primaryOffense] || 0) + 1;
    c.vehicles[v.vehicleType] = (c.vehicles[v.vehicleType] || 0) + 1;
    c.hours.push(v.hour);
    c.dates.add(v.dateStr);
    c.stations[v.station] = (c.stations[v.station] || 0) + 1;
    c.isWeekendCount += v.isWeekend;
  }

  // Date range info
  const allDates = violations.map(v => v.dateStr).sort();
  const dateFirst = allDates[0];
  const dateLast = allDates[allDates.length - 1];
  const totalDays = Math.max(1, Math.round((new Date(dateLast) - new Date(dateFirst)) / (86400000)) + 1);
  const midDate = new Date(new Date(dateFirst).getTime() + (totalDays / 2) * 86400000).toISOString().slice(0, 10);

  let maxCount = 0;
  const hotspots = [];

  for (const [cellId, c] of Object.entries(cellMap)) {
    if (c.count < 3) continue; // filter noise

    const latCenter = c.lats.reduce((a,b)=>a+b,0) / c.lats.length;
    const lonCenter = c.lons.reduce((a,b)=>a+b,0) / c.lons.length;

    // Mode for offenses
    let topOffense = 'UNKNOWN', topOffenseCount = 0;
    for (const [o, cnt] of Object.entries(c.offenses)) {
      if (cnt > topOffenseCount) { topOffense = o; topOffenseCount = cnt; }
    }

    // Mode for station
    let topStation = 'Unknown', topStationCount = 0;
    for (const [s, cnt] of Object.entries(c.stations)) {
      if (cnt > topStationCount) { topStation = s; topStationCount = cnt; }
    }

    // Peak hour
    const hourCounts = {};
    c.hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
    let peakHour = 12, peakHourCount = 0;
    for (const [h, cnt] of Object.entries(hourCounts)) {
      if (cnt > peakHourCount) { peakHour = parseInt(h); peakHourCount = cnt; }
    }

    const avgHour = c.hours.reduce((a,b)=>a+b,0) / c.hours.length;
    const uniqueDates = c.dates.size;
    const recurrenceScore = uniqueDates / totalDays;
    const dailyDensity = c.count / Math.max(uniqueDates, 1);
    const weekendRatio = c.isWeekendCount / c.count;

    // Growth trend
    let firstHalf = 0, secondHalf = 0;
    for (const d of c.dates) {
      if (d <= midDate) firstHalf++; else secondHalf++;
    }
    // Count violations in each half
    firstHalf = 0; secondHalf = 0;
    for (const v of violations) {
      if (v.gridCell === cellId) {
        if (v.dateStr <= midDate) firstHalf++; else secondHalf++;
      }
    }
    const growthTrend = (secondHalf - firstHalf) / Math.max(Math.max(firstHalf, secondHalf), 1);

    // Nearest landmark
    const landmark = nearestLandmark(latCenter, lonCenter);

    // Offense percentages
    const offensePct = {};
    for (const [o, cnt] of Object.entries(c.offenses)) {
      offensePct[o] = Math.round((cnt / c.count) * 1000) / 10;
    }

    // Vehicle breakdown
    const vehiclePct = {};
    for (const [v, cnt] of Object.entries(c.vehicles)) {
      vehiclePct[v] = Math.round((cnt / c.count) * 1000) / 10;
    }

    if (c.count > maxCount) maxCount = c.count;

    hotspots.push({
      cellId,
      lat: Math.round(latCenter * 1e6) / 1e6,
      lon: Math.round(lonCenter * 1e6) / 1e6,
      count: c.count,
      uniqueDates,
      recurrenceScore: Math.round(recurrenceScore * 100) / 100,
      dailyDensity: Math.round(dailyDensity * 10) / 10,
      peakHour,
      avgHour: Math.round(avgHour * 10) / 10,
      weekendRatio: Math.round(weekendRatio * 100) / 100,
      growthTrend: Math.round(growthTrend * 100) / 100,
      topOffense,
      offenses: offensePct,
      vehicles: vehiclePct,
      station: topStation,
      landmark: landmark.name,
      landmarkDist: landmark.distance,
      hourlyPattern: hourCounts,
    });
  }

  // ── Compute severity and congestion scores ────────────────────────────
  const maxDailyDensity = Math.max(...hotspots.map(h => h.dailyDensity));
  const maxLandmarkDist = Math.max(...hotspots.map(h => h.landmarkDist));
  const maxUniqueOffenses = Math.max(...hotspots.map(h => Object.keys(h.offenses).length));

  for (const h of hotspots) {
    const nOffenses = Object.keys(h.offenses).length;
    h.severityScore = Math.round(Math.min(100, Math.max(0,
      (0.30 * h.count / maxCount +
       0.20 * h.recurrenceScore +
       0.15 * h.dailyDensity / maxDailyDensity +
       0.15 * (1 - h.landmarkDist / maxLandmarkDist) +
       0.10 * (h.growthTrend * 0.5 + 0.5) +
       0.10 * nOffenses / maxUniqueOffenses
      ) * 100
    )) * 10) / 10;

    h.congestionImpact = Math.round(Math.min(100, Math.max(0,
      (0.35 * h.count / maxCount +
       0.25 * h.dailyDensity / maxDailyDensity +
       0.20 * (1 - h.landmarkDist / maxLandmarkDist) +
       0.10 * h.weekendRatio +
       0.10 * ((h.offenses['MAIN_ROAD_PARKING'] || 0) / 100)
      ) * 100
    )) * 10) / 10;

    // Risk tier
    if (h.severityScore >= 75) h.riskTier = 'CRITICAL';
    else if (h.severityScore >= 50) h.riskTier = 'HIGH';
    else if (h.severityScore >= 25) h.riskTier = 'MEDIUM';
    else h.riskTier = 'LOW';

    // Root causes
    h.rootCauses = [];
    if (h.landmarkDist < 2) h.rootCauses.push(`Proximity to ${h.landmark} (${h.landmarkDist}km)`);
    if (h.offenses['MAIN_ROAD_PARKING'] > 20) h.rootCauses.push('High main-road parking violations');
    if (h.offenses['NO_PARKING'] > 50) h.rootCauses.push('Dominant no-parking zone violations');
    if (h.weekendRatio > 0.35) h.rootCauses.push('Weekend congestion hotspot');
    if (h.peakHour >= 8 && h.peakHour <= 10) h.rootCauses.push('Morning rush hour pressure');
    if (h.peakHour >= 17 && h.peakHour <= 19) h.rootCauses.push('Evening rush hour pressure');
    if (h.recurrenceScore > 0.7) h.rootCauses.push('Chronic recurring violation zone');
    if (h.growthTrend > 0.3) h.rootCauses.push('Worsening trend detected');
    if (h.dailyDensity > 10) h.rootCauses.push('High daily violation density');
    if (Object.keys(h.offenses).length >= 4) h.rootCauses.push('Multiple offense types concentrated');
    if (h.rootCauses.length === 0) h.rootCauses.push('Standard violation density');
  }

  // Sort by severity
  hotspots.sort((a, b) => b.severityScore - a.severityScore);
  hotspots.forEach((h, i) => { h.rank = i + 1; });

  console.log(`[Pravaaha] Built ${hotspots.length} hotspots`);

  // ── Build analytics data ──────────────────────────────────────────────
  console.log('[Pravaaha] Building analytics...');

  // Offense breakdown
  const offenseCounts = {};
  violations.forEach(v => {
    offenseCounts[v.primaryOffense] = (offenseCounts[v.primaryOffense] || 0) + 1;
  });
  const offenseBreakdown = Object.entries(offenseCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Vehicle breakdown
  const vehicleCounts = {};
  violations.forEach(v => {
    vehicleCounts[v.vehicleType] = (vehicleCounts[v.vehicleType] || 0) + 1;
  });
  const vehicleBreakdown = Object.entries(vehicleCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Hourly pattern
  const hourlyPattern = Array(24).fill(0);
  violations.forEach(v => { hourlyPattern[v.hour]++; });
  const hourlyData = hourlyPattern.map((count, hour) => ({ hour, count }));

  // Daily trend
  const dailyCounts = {};
  violations.forEach(v => {
    dailyCounts[v.dateStr] = (dailyCounts[v.dateStr] || 0) + 1;
  });
  const dailyTrend = Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 7-day rolling average
  for (let i = 0; i < dailyTrend.length; i++) {
    const start = Math.max(0, i - 6);
    const window = dailyTrend.slice(start, i + 1);
    dailyTrend[i].avg7d = Math.round(window.reduce((s, d) => s + d.count, 0) / window.length);
  }

  // Day of week pattern
  const dowCounts = Array(7).fill(0);
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  violations.forEach(v => { dowCounts[v.dayOfWeek]++; });
  const dowData = dowCounts.map((count, i) => ({ day: dowNames[i], count }));

  // Station summary
  const stationMap = {};
  violations.forEach(v => {
    if (!stationMap[v.station]) {
      stationMap[v.station] = { name: v.station, count: 0, lats: [], lons: [], offenses: {} };
    }
    stationMap[v.station].count++;
    stationMap[v.station].lats.push(v.lat);
    stationMap[v.station].lons.push(v.lon);
    stationMap[v.station].offenses[v.primaryOffense] = (stationMap[v.station].offenses[v.primaryOffense] || 0) + 1;
  });
  const stationSummary = Object.values(stationMap).map(s => ({
    name: s.name,
    count: s.count,
    lat: s.lats.reduce((a,b)=>a+b,0) / s.lats.length,
    lon: s.lons.reduce((a,b)=>a+b,0) / s.lons.length,
    topOffense: Object.entries(s.offenses).sort((a,b) => b[1]-a[1])[0]?.[0] || 'UNKNOWN',
  })).sort((a, b) => b.count - a.count);

  // Time period breakdown
  const timePeriodCounts = {};
  violations.forEach(v => {
    timePeriodCounts[v.timePeriod] = (timePeriodCounts[v.timePeriod] || 0) + 1;
  });
  const timePeriodData = Object.entries(timePeriodCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly trend
  const monthlyCounts = {};
  violations.forEach(v => {
    const key = v.dateStr.slice(0, 7);
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  });
  const monthlyTrend = Object.entries(monthlyCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Heatmap data (sampled for performance)
  console.log('[Pravaaha] Building heatmap data...');
  const heatPoints = {};
  for (const v of violations) {
    const key = `${Math.round(v.lat*1000)/1000}_${Math.round(v.lon*1000)/1000}`;
    if (!heatPoints[key]) {
      heatPoints[key] = { lat: Math.round(v.lat*1000)/1000, lon: Math.round(v.lon*1000)/1000, w: 0 };
    }
    heatPoints[key].w++;
  }
  const heatmapData = Object.values(heatPoints);

  // ── Summary stats ─────────────────────────────────────────────────────
  const uniqueVehicles = new Set(violations.map(v => v.id)).size;
  const summary = {
    totalViolations: violations.length,
    totalHotspots: hotspots.length,
    criticalHotspots: hotspots.filter(h => h.riskTier === 'CRITICAL').length,
    highHotspots: hotspots.filter(h => h.riskTier === 'HIGH').length,
    mediumHotspots: hotspots.filter(h => h.riskTier === 'MEDIUM').length,
    lowHotspots: hotspots.filter(h => h.riskTier === 'LOW').length,
    dateRange: [dateFirst, dateLast],
    totalDays,
    uniqueVehicles,
    topStation: stationSummary[0]?.name || 'Unknown',
    topOffense: offenseBreakdown[0]?.name || 'UNKNOWN',
    policeStations: stationSummary.length,
    avgDailyViolations: Math.round(violations.length / totalDays),
  };

  // ── Save all outputs ──────────────────────────────────────────────────
  console.log('[Pravaaha] Writing output files...');

  const writeJSON = (name, data) => {
    const filePath = path.join(OUTPUT_DIR, name);
    fs.writeFileSync(filePath, JSON.stringify(data));
    const sizeMB = (fs.statSync(filePath).size / 1048576).toFixed(2);
    console.log(`  → ${name} (${sizeMB} MB)`);
  };

  writeJSON('summary.json', summary);
  writeJSON('hotspots.json', hotspots);
  writeJSON('heatmap.json', heatmapData);
  writeJSON('offense_breakdown.json', offenseBreakdown);
  writeJSON('vehicle_breakdown.json', vehicleBreakdown);
  writeJSON('hourly_pattern.json', hourlyData);
  writeJSON('daily_trend.json', dailyTrend);
  writeJSON('dow_pattern.json', dowData);
  writeJSON('station_summary.json', stationSummary);
  writeJSON('time_periods.json', timePeriodData);
  writeJSON('monthly_trend.json', monthlyTrend);

  // Top 50 hotspots with full detail for detail cards
  writeJSON('hotspots_top50.json', hotspots.slice(0, 50));

  // Patrol priority (top 20 critical zones)
  const patrolPriority = hotspots.slice(0, 20).map(h => ({
    rank: h.rank,
    lat: h.lat, lon: h.lon,
    station: h.station,
    severity: h.severityScore,
    congestion: h.congestionImpact,
    riskTier: h.riskTier,
    topOffense: h.topOffense,
    count: h.count,
    rootCauses: h.rootCauses,
    landmark: h.landmark,
  }));
  writeJSON('patrol_priority.json', patrolPriority);

  console.log(`\n[Pravaaha] ✅ Pipeline complete!`);
  console.log(`  ${violations.length} violations → ${hotspots.length} hotspots`);
  console.log(`  ${summary.criticalHotspots} CRITICAL | ${summary.highHotspots} HIGH | ${summary.mediumHotspots} MEDIUM | ${summary.lowHotspots} LOW`);
  console.log(`  Output: ${OUTPUT_DIR}`);
}

// ── Run ─────────────────────────────────────────────────────────────────────
const csvPath = process.argv[2] || path.join(__dirname, 'jan to may police violation_anonymized791b166.csv');
if (!fs.existsSync(csvPath)) {
  console.error(`[Pravaaha] CSV file not found: ${csvPath}`);
  process.exit(1);
}
processCSV(csvPath);
