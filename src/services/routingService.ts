import { Incident } from '../types';
import { PedestrianRoute, RouteCoordinate, RouteStep, TransportMode } from '../types/navigation';
import { calculateDistanceMeters } from '../utils/geo';

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours} h ${remainingMins} min` : `${hours} h`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function calculateEstimatedArrival(minutes: number): string {
  const arrivalDate = new Date(Date.now() + minutes * 60 * 1000);
  const hh = arrivalDate.getHours().toString().padStart(2, '0');
  const mm = arrivalDate.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Decodes Valhalla 6-digit precision polyline into RouteCoordinate[]
 */
function decodeValhallaPolyline(str: string, precision: number = 6): RouteCoordinate[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: RouteCoordinate[] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }

  return coordinates;
}

/**
 * Valhalla Routing Engine (Mapbox/Tesla open-source engine)
 * With native Portuguese language support, precision 6 geometry, and multi-modal costing.
 */
async function fetchValhallaRoute(
  coords: RouteCoordinate[],
  mode: TransportMode = 'walking',
  avoidLocations?: RouteCoordinate[]
): Promise<{
  coordinates: RouteCoordinate[];
  distance: number;
  durationMinutes: number;
  steps: RouteStep[];
} | null> {
  const valhallaUrl = 'https://valhalla1.openstreetmap.de/route';
  const costing = mode === 'driving' ? 'auto' : 'pedestrian';

  const body: any = {
    locations: coords.map((c) => ({
      lat: c.latitude,
      lon: c.longitude,
    })),
    costing,
    costing_options: {
      pedestrian: {
        walking_speed: 4.5,
      },
      auto: {
        country_crossing_penalty: 2000,
      },
    },
    directions_options: {
      units: 'kilometers',
      language: 'pt-PT',
    },
  };

  if (avoidLocations && avoidLocations.length > 0) {
    body.avoid_locations = avoidLocations.map((a) => ({
      lat: a.latitude,
      lon: a.longitude,
    }));
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(valhallaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SentinelaValhallaNavigation/1.0',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const trip = data?.trip;
    if (!trip || !trip.legs || trip.legs.length === 0) return null;

    // Accumulate all legs (crucial when waypoints/detours are present!)
    const geoCoordinates: RouteCoordinate[] = [];
    const steps: RouteStep[] = [];

    for (const leg of trip.legs) {
      if (leg.shape) {
        const legCoords = decodeValhallaPolyline(leg.shape, 6);
        if (geoCoordinates.length > 0 && legCoords.length > 0) {
          geoCoordinates.push(...legCoords.slice(1));
        } else {
          geoCoordinates.push(...legCoords);
        }
      }

      if (Array.isArray(leg.maneuvers)) {
        for (const m of leg.maneuvers) {
          steps.push({
            instruction: m.instruction || 'Siga o percurso',
            distanceMeters: Math.round((m.length || 0) * 1000),
            durationSeconds: Math.round(m.time || 0),
            maneuverType: m.type?.toString() || 'turn',
            streetName: Array.isArray(m.street_names) ? m.street_names.join(', ') : undefined,
          });
        }
      }
    }

    if (geoCoordinates.length === 0) return null;

    // Realistic duration from Valhalla summary (in seconds)
    const rawSeconds = trip.summary?.time || 0;
    const totalDistMeters = Math.round((trip.summary?.length || 0) * 1000);

    let durationMinutes: number;
    if (mode === 'walking') {
      const distanceMins = Math.round(totalDistMeters / 75);
      const valhallaMins = Math.round(rawSeconds / 60);
      durationMinutes = Math.max(1, Math.max(distanceMins, valhallaMins));
    } else {
      // For driving, add 12% urban traffic and intersection delay
      const cityDrivingSeconds = rawSeconds * 1.12 + 60;
      durationMinutes = Math.max(1, Math.round(cityDrivingSeconds / 60));
    }

    return {
      coordinates: geoCoordinates,
      distance: totalDistMeters,
      durationMinutes,
      steps,
    };
  } catch (err) {
    console.warn('Valhalla routing error, falling back to OSRM:', err);
    return null;
  }
}

/**
 * OSRM Fallback Engine
 */
async function fetchOsrmRoute(
  coords: RouteCoordinate[],
  mode: TransportMode = 'walking'
): Promise<{
  coordinates: RouteCoordinate[];
  distance: number;
  durationMinutes: number;
  steps: RouteStep[];
} | null> {
  const coordString = coords.map((c) => `${c.longitude},${c.latitude}`).join(';');
  const profile = mode === 'driving' ? 'driving' : 'foot';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordString}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SentinelaMultiModalRouting/2.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.routes?.[0]) return null;

    const route = data.routes[0];
    const geoCoordinates: RouteCoordinate[] = route.geometry.coordinates.map(
      (pt: [number, number]) => ({
        latitude: pt[1],
        longitude: pt[0],
      })
    );

    const steps: RouteStep[] = [];
    for (const leg of route.legs || []) {
      for (const s of leg.steps || []) {
        steps.push({
          instruction: s.maneuver?.instruction || s.name || 'Continue no percurso',
          distanceMeters: Math.round(s.distance || 0),
          durationSeconds: Math.round(s.duration || 0),
          maneuverType: s.maneuver?.type || 'turn',
          maneuverModifier: s.maneuver?.modifier,
          streetName: s.name,
        });
      }
    }

    const durationMinutes =
      mode === 'walking'
        ? Math.max(1, Math.round(route.distance / 75))
        : Math.max(1, Math.round((route.duration * 1.15 + 90) / 60));

    return {
      coordinates: geoCoordinates,
      distance: route.distance,
      durationMinutes,
      steps,
    };
  } catch (err) {
    console.warn('OSRM routing error:', err);
    return null;
  }
}

/**
 * Route Dispatcher: Primary Valhalla -> Fallback OSRM
 */
async function fetchRouteMultiEngine(
  coords: RouteCoordinate[],
  mode: TransportMode = 'walking'
) {
  const valhallaResult = await fetchValhallaRoute(coords, mode);
  if (valhallaResult) return valhallaResult;
  return await fetchOsrmRoute(coords, mode);
}

/**
 * Checks which incidents are close to a route line (within thresholdMeters)
 */
function findHazardsNearRoute(
  routeCoords: RouteCoordinate[],
  incidents: Incident[],
  thresholdMeters: number = 65,
  mode: TransportMode = 'walking'
): Incident[] {
  const dangerousIncidents: Incident[] = [];

  for (const inc of incidents) {
    if (inc.category === 'safe_haven') continue;

    if (mode === 'driving' && inc.category === 'dark_area') {
      continue;
    }

    const isNear = routeCoords.some(
      (pt) =>
        calculateDistanceMeters(pt.latitude, pt.longitude, inc.latitude, inc.longitude) <=
        thresholdMeters
    );

    if (isNear) {
      dangerousIncidents.push(inc);
    }
  }

  return dangerousIncidents;
}

/**
 * Calculates both the Direct Route and the Safe Route (avoiding known danger zones)
 * with the Valhalla routing engine and accurate time calculations.
 */
export async function calculateSafeNavigationRoutes(params: {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  incidents: Incident[];
  mode?: TransportMode;
}): Promise<{
  safeRoute: PedestrianRoute;
  directRoute?: PedestrianRoute;
}> {
  const { origin, destination, incidents, mode = 'walking' } = params;

  // 1. Fetch direct route via Valhalla (fallback OSRM)
  const directData = await fetchRouteMultiEngine([origin, destination], mode);

  // Fallback if offline
  if (!directData) {
    const straightDist = calculateDistanceMeters(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    const speedMetersPerMin = mode === 'driving' ? 500 : 75;
    const durationMins = Math.max(1, Math.round(straightDist / speedMetersPerMin));

    const fallbackRoute: PedestrianRoute = {
      id: 'fallback-direct',
      name: mode === 'driving' ? 'Percurso Automóvel' : 'Percurso Pedestre',
      mode,
      distanceMeters: straightDist,
      durationMinutes: durationMins,
      formattedDuration: formatDuration(durationMins),
      formattedDistance: formatDistance(straightDist),
      estimatedArrival: calculateEstimatedArrival(durationMins),
      coordinates: [origin, destination],
      steps: [
        {
          instruction:
            mode === 'driving'
              ? 'Siga de carro em direção ao destino'
              : 'Siga a pé em direção ao seu destino',
          distanceMeters: straightDist,
          durationSeconds: durationMins * 60,
          maneuverType: 'depart',
        },
      ],
      isSafe: true,
      hazardsAvoided: [],
      hazardsOnRoute: [],
      summary: mode === 'driving' ? 'Percurso automóvel estimado' : 'Percurso pedestre estimado',
    };
    return { safeRoute: fallbackRoute };
  }

  const hazardThreshold = mode === 'driving' ? 50 : 65;
  const hazardsOnDirect = findHazardsNearRoute(
    directData.coordinates,
    incidents,
    hazardThreshold,
    mode
  );

  const directRoute: PedestrianRoute = {
    id: 'route-direct',
    name: mode === 'driving' ? 'Caminho Mais Rápido (Valhalla)' : 'Caminho Mais Curto (Valhalla)',
    mode,
    distanceMeters: Math.round(directData.distance),
    durationMinutes: directData.durationMinutes,
    formattedDuration: formatDuration(directData.durationMinutes),
    formattedDistance: formatDistance(directData.distance),
    estimatedArrival: calculateEstimatedArrival(directData.durationMinutes),
    coordinates: directData.coordinates,
    steps: directData.steps,
    isSafe: hazardsOnDirect.length === 0,
    hazardsAvoided: [],
    hazardsOnRoute: hazardsOnDirect,
    summary:
      hazardsOnDirect.length > 0
        ? `⚠️ Alerta: Passa próximo de ${hazardsOnDirect.length} reporte(s) de perigo`
        : 'Caminho seguro e desimpedido',
  };

  // If clean of hazards, direct route is the safe route
  if (hazardsOnDirect.length === 0) {
    return {
      safeRoute: {
        ...directRoute,
        name: 'Rota Segura (Valhalla)',
        isSafe: true,
      },
    };
  }

  // 2. Intelligent hazard bypass
  // Strategy A: Native Valhalla street-level avoidance (uses OSM road graph to find nearest alternative street)
  const avoidCoords = hazardsOnDirect.map((h) => ({
    latitude: h.latitude,
    longitude: h.longitude,
  }));

  const valhallaBypass = await fetchValhallaRoute([origin, destination], mode, avoidCoords);
  if (valhallaBypass) {
    const hazardsOnValhallaBypass = findHazardsNearRoute(
      valhallaBypass.coordinates,
      incidents,
      hazardThreshold,
      mode
    );

    // If Valhalla avoided the hazard or reduced hazard exposure without excessive detour
    const isReasonableDistance = valhallaBypass.distance <= directData.distance * 2.5;
    if (hazardsOnValhallaBypass.length < hazardsOnDirect.length && isReasonableDistance) {
      const avoided = hazardsOnDirect.filter(
        (h) => !hazardsOnValhallaBypass.some((hb) => hb.id === h.id)
      );

      const safeDetourRoute: PedestrianRoute = {
        id: 'route-safe-valhalla',
        name: 'Rota Segura (Desvio Inteligente Valhalla)',
        mode,
        distanceMeters: Math.round(valhallaBypass.distance),
        durationMinutes: valhallaBypass.durationMinutes,
        formattedDuration: formatDuration(valhallaBypass.durationMinutes),
        formattedDistance: formatDistance(valhallaBypass.distance),
        estimatedArrival: calculateEstimatedArrival(valhallaBypass.durationMinutes),
        coordinates: valhallaBypass.coordinates,
        steps: valhallaBypass.steps,
        isSafe: hazardsOnValhallaBypass.length === 0,
        hazardsAvoided: avoided,
        hazardsOnRoute: hazardsOnValhallaBypass,
        summary: `🛡️ Evita ${avoided.length} zona(s) de perigo identificada(s)`,
      };

      return {
        safeRoute: safeDetourRoute,
        directRoute,
      };
    }
  }

  // Strategy B: Lateral waypoint detour (tests both right and left offsets around the hazard)
  const primaryHazard = hazardsOnDirect[0];
  const dLat = destination.latitude - origin.latitude;
  const dLon = destination.longitude - origin.longitude;
  const len = Math.sqrt(dLat * dLat + dLon * dLon) || 1;

  // Realistic city block offsets (~80m for pedestrians, ~140m for vehicles)
  const offset = mode === 'driving' ? 0.0016 : 0.0009;
  const candidates: RouteCoordinate[] = [
    {
      latitude: primaryHazard.latitude - (dLon / len) * offset,
      longitude: primaryHazard.longitude + (dLat / len) * offset,
    },
    {
      latitude: primaryHazard.latitude + (dLon / len) * offset,
      longitude: primaryHazard.longitude - (dLat / len) * offset,
    },
  ];

  for (const evasionCoord of candidates) {
    const safeData = await fetchRouteMultiEngine([origin, evasionCoord, destination], mode);

    if (safeData && safeData.distance <= directData.distance * 2.5) {
      const hazardsOnDetour = findHazardsNearRoute(
        safeData.coordinates,
        incidents,
        hazardThreshold,
        mode
      );

      if (hazardsOnDetour.length < hazardsOnDirect.length) {
        const avoided = hazardsOnDirect.filter(
          (h) => !hazardsOnDetour.some((hd) => hd.id === h.id)
        );

        const safeDetourRoute: PedestrianRoute = {
          id: 'route-safe-detour',
          name: 'Rota Segura (Desvio de Proteção)',
          mode,
          distanceMeters: Math.round(safeData.distance),
          durationMinutes: safeData.durationMinutes,
          formattedDuration: formatDuration(safeData.durationMinutes),
          formattedDistance: formatDistance(safeData.distance),
          estimatedArrival: calculateEstimatedArrival(safeData.durationMinutes),
          coordinates: safeData.coordinates,
          steps: safeData.steps,
          isSafe: hazardsOnDetour.length === 0,
          hazardsAvoided: avoided,
          hazardsOnRoute: hazardsOnDetour,
          summary: `🛡️ Evita ${avoided.length} zona(s) de perigo identificada(s)`,
        };

        return {
          safeRoute: safeDetourRoute,
          directRoute,
        };
      }
    }
  }

  // If no detour is possible or all detours are blocked, return direct route with warning
  return { safeRoute: directRoute };
}
