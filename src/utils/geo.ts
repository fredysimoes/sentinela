/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculates initial bearing (azimuth in degrees 0..360) from coord 1 to coord 2
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

/**
 * Calculates relative angle between phone compass heading and target bearing.
 * 0 = directly in front, 90 = to the right, 180 = directly behind, 270 = to the left.
 */
export function calculateRelativeAngle(bearing: number, userHeading: number): number {
  return ((bearing - userHeading + 360) % 360);
}

/**
 * Human-readable directional orientation relative to the user's perspective
 */
export function getCompassDirectionLabel(relativeAngle: number): string {
  if (relativeAngle >= 337.5 || relativeAngle < 22.5) {
    return 'Em frente';
  } else if (relativeAngle >= 22.5 && relativeAngle < 67.5) {
    return 'À sua frente, à direita';
  } else if (relativeAngle >= 67.5 && relativeAngle < 112.5) {
    return 'À sua direita';
  } else if (relativeAngle >= 112.5 && relativeAngle < 157.5) {
    return 'Atrás de si, à direita';
  } else if (relativeAngle >= 157.5 && relativeAngle < 202.5) {
    return 'Atrás de si';
  } else if (relativeAngle >= 202.5 && relativeAngle < 247.5) {
    return 'Atrás de si, à esquerda';
  } else if (relativeAngle >= 247.5 && relativeAngle < 292.5) {
    return 'À sua esquerda';
  } else {
    return 'À sua frente, à esquerda';
  }
}

/**
 * Proximity classification for crowd radar finding
 */
export function getProximityStatus(distanceMeters: number): {
  label: string;
  color: string;
  hapticIntervalMs: number | null;
  isImmediateProximity: boolean;
} {
  if (distanceMeters <= 5) {
    return {
      label: 'Contacto Visual Iminente! (Ao seu lado)',
      color: '#10B981',
      hapticIntervalMs: 200, // Rapid Geiger pulse
      isImmediateProximity: true,
    };
  } else if (distanceMeters <= 12) {
    return {
      label: 'Muito Perto (Levante o olhar)',
      color: '#34D399',
      hapticIntervalMs: 400,
      isImmediateProximity: false,
    };
  } else if (distanceMeters <= 28) {
    return {
      label: 'Na mesma área (A aproximar-se)',
      color: '#06B6D4',
      hapticIntervalMs: 750,
      isImmediateProximity: false,
    };
  } else if (distanceMeters <= 65) {
    return {
      label: 'Na mesma multidão',
      color: '#38BDF8',
      hapticIntervalMs: 1300,
      isImmediateProximity: false,
    };
  } else {
    return {
      label: 'A caminho',
      color: '#94A3B8',
      hapticIntervalMs: null,
      isImmediateProximity: false,
    };
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Há ${diffDays}d`;
}

export function getGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

/**
 * Counts unique reporters/incidents within a given radius in meters
 */
export function countNearbyReporters(
  location: { latitude: number; longitude: number },
  incidents: Array<{ id: string; latitude: number; longitude: number; reportedBy?: string; confirmations?: number }>,
  radiusMeters: number = 300
): number {
  const nearby = incidents.filter((inc) => {
    const dist = calculateDistanceMeters(location.latitude, location.longitude, inc.latitude, inc.longitude);
    return dist <= radiusMeters;
  });

  const uniqueUsers = new Set<string>();
  nearby.forEach((inc) => {
    uniqueUsers.add(inc.reportedBy || inc.id);
  });

  return uniqueUsers.size;
}

/**
 * Counts total protest infiltrator signals (reports + confirmations) within a given radius in meters.
 */
export function countNearbyInfiltratorSignals(
  location: { latitude: number; longitude: number },
  allIncidents: Array<{ id: string; category: string; latitude: number; longitude: number; confirmations?: number }>,
  radiusMeters: number = 300
): number {
  let totalSignals = 0;
  for (const item of allIncidents) {
    if (item.category === 'protest_infiltrator') {
      const dist = calculateDistanceMeters(
        location.latitude,
        location.longitude,
        item.latitude,
        item.longitude
      );
      if (dist <= radiusMeters) {
        totalSignals += Math.max(1, item.confirmations || 1);
      }
    }
  }
  return totalSignals;
}

/**
 * Calculates the triangulated centroid (weighted average coordinate) of nearby reports
 * within a specified radius (e.g. 300m) to consolidate multiple scattered sightings into a unified epicenter.
 */
export function calculateTriangulatedCluster(
  newCoord: { latitude: number; longitude: number },
  existingIncidents: Array<{ id: string; category: string; latitude: number; longitude: number; confirmations?: number }>,
  targetCategory: string = 'protest_infiltrator',
  radiusMeters: number = 300
): {
  triangulatedCoord: { latitude: number; longitude: number };
  clusterIds: string[];
  totalReports: number;
} {
  const matchingCluster = existingIncidents.filter((inc) => {
    if (inc.category !== targetCategory) return false;
    const dist = calculateDistanceMeters(newCoord.latitude, newCoord.longitude, inc.latitude, inc.longitude);
    return dist <= radiusMeters;
  });

  if (matchingCluster.length === 0) {
    return {
      triangulatedCoord: newCoord,
      clusterIds: [],
      totalReports: 1,
    };
  }

  // Weight each coordinate by its confirmations (default 1)
  let totalWeight = 1; // 1 for the new report
  let sumLat = newCoord.latitude;
  let sumLng = newCoord.longitude;

  matchingCluster.forEach((inc) => {
    const weight = Math.max(1, inc.confirmations || 1);
    sumLat += inc.latitude * weight;
    sumLng += inc.longitude * weight;
    totalWeight += weight;
  });

  return {
    triangulatedCoord: {
      latitude: sumLat / totalWeight,
      longitude: sumLng / totalWeight,
    },
    clusterIds: matchingCluster.map((m) => m.id),
    totalReports: totalWeight,
  };
}

/**
 * Checks if a protest infiltrator incident has reached the community verification threshold (>= 2 or 3 signals within 300m)
 * to be displayed publicly on the map.
 */
export function isProtestInfiltratorVerified(
  incident: { id: string; category: string; latitude: number; longitude: number; confirmations?: number },
  allIncidents: Array<{ id: string; category: string; latitude: number; longitude: number; confirmations?: number }>,
  radiusMeters: number = 300,
  minSignalsThreshold: number = 2
): boolean {
  if (incident.category !== 'protest_infiltrator') return true;

  // If this specific incident already has >= minSignalsThreshold confirmations
  if ((incident.confirmations || 1) >= minSignalsThreshold) {
    return true;
  }

  const totalSignals = countNearbyInfiltratorSignals(
    { latitude: incident.latitude, longitude: incident.longitude },
    allIncidents,
    radiusMeters
  );

  return totalSignals >= minSignalsThreshold;
}
