import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toString() || '0';
}

export function getRiskColor(tier) {
  const colors = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
  };
  return colors[tier] || '#6b7280';
}

export function getRiskBg(tier) {
  const colors = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return colors[tier] || 'bg-gray-500/20 text-gray-400';
}

export function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export function getOffenseLabel(code) {
  const labels = {
    WRONG_PARKING: 'Wrong Parking',
    NO_PARKING: 'No Parking',
    MAIN_ROAD_PARKING: 'Main Road Parking',
    NEAR_CROSSING: 'Near Crossing',
    FOOTPATH_PARKING: 'Footpath Parking',
    DEFECTIVE_PLATE: 'Defective Plate',
    BUS_STAND_PARKING: 'Bus Stand Parking',
    CURVE_PARKING: 'Curve Parking',
    NEAR_SIGNAL: 'Near Signal',
    AGAINST_FLOW: 'Against Flow',
    DOUBLE_PARKING: 'Double Parking',
    UNKNOWN: 'Unknown',
  };
  return labels[code] || code?.replace(/_/g, ' ') || 'Unknown';
}

export const OFFENSE_COLORS = {
  WRONG_PARKING: '#3b82f6',
  NO_PARKING: '#ef4444',
  MAIN_ROAD_PARKING: '#f97316',
  NEAR_CROSSING: '#eab308',
  FOOTPATH_PARKING: '#a855f7',
  DEFECTIVE_PLATE: '#6b7280',
  DOUBLE_PARKING: '#ec4899',
  UNKNOWN: '#4b5563',
};

export function getOffenseColor(code) {
  return OFFENSE_COLORS[code] || '#6b7280';
}
