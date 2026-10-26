import { RouteStep } from '../types/navigation';

/**
 * Returns a prominent directional arrow emoji based on maneuver type and modifier.
 * Used for big right-aligned arrow in navigation notification and in-app banner.
 */
export function getManeuverArrow(maneuverType?: string, modifier?: string): string {
  const mod = (modifier || '').toLowerCase();
  const type = (maneuverType || '').toLowerCase();

  if (type === 'arrive' || mod === 'arrive') {
    return '🏁';
  }

  if (mod.includes('uturn') || type.includes('uturn')) {
    return '↩️';
  }

  if (mod.includes('sharp right')) {
    return '↘️';
  }
  if (mod.includes('slight right')) {
    return '↗️';
  }
  if (mod.includes('right') || type.includes('right')) {
    return '➡️';
  }

  if (mod.includes('sharp left')) {
    return '↙️';
  }
  if (mod.includes('slight left')) {
    return '↖️';
  }
  if (mod.includes('left') || type.includes('left')) {
    return '⬅️';
  }

  if (type.includes('roundabout') || type.includes('rotary')) {
    return '🔄';
  }

  // Straight / continue default
  return '⬆️';
}

/**
 * Formats arrival ETA time as HH:MM based on remaining duration minutes
 */
export function formatArrivalTime(durationMinutes: number): string {
  const arrival = new Date(Date.now() + Math.max(1, durationMinutes) * 60 * 1000);
  const hours = arrival.getHours().toString().padStart(2, '0');
  const minutes = arrival.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats distance in meters or kilometers (e.g. "450 m" or "1,8 km")
 */
export function formatNavigationDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    const km = (distanceMeters / 1000).toFixed(1).replace('.', ',');
    return `${km} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

/**
 * Determines current step index based on progress along route steps
 */
export function calculateCurrentStepIndex(
  steps: RouteStep[] | undefined,
  distanceRemainingMeters: number,
  totalDistanceMeters: number,
  fallbackIndex: number = 0
): number {
  if (!steps || steps.length === 0) return 0;
  if (steps.length === 1) return 0;

  const distanceCovered = Math.max(0, totalDistanceMeters - distanceRemainingMeters);
  let accumulated = 0;

  for (let i = 0; i < steps.length; i++) {
    accumulated += steps[i].distanceMeters;
    if (distanceCovered < accumulated) {
      return i;
    }
  }

  return Math.min(steps.length - 1, Math.max(fallbackIndex, steps.length - 1));
}
