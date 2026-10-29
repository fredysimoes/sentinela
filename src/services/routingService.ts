import { Incident } from '../types';
import { PedestrianRoute, RouteCoordinate, RouteStep, TransportMode } from '../types/navigation';
import { calculateDistanceMeters } from '../utils/geo';
import { isAccessibilityCategory } from '../constants/categories';
import { fetchPortoTransitRoute } from './stcpRealtimeService';

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
  avoidLocations?: RouteCoordinate[],
  avoidAccessibilityBarriers: boolean = false
): Promise<{
  coordinates: RouteCoordinate[];
  distance: number;
  durationMinutes: number;
  steps: RouteStep[];
} | null> {
  const valhallaUrl = 'https://valhalla1.openstreetmap.de/route';
  const costing = mode === 'driving' ? 'auto' : 'pedestrian';

  const pedestrianOptions: any = {
    walking_speed: avoidAccessibilityBarriers && mode !== 'driving' ? 3.6 : 4.5,
  };

  // If accessibility mode is active for pedestrians, enforce native wheelchair routing and avoid stairs
  if (avoidAccessibilityBarriers && mode !== 'driving') {
    pedestrianOptions.wheelchair = true;
    pedestrianOptions.use_stairs = 0.0;
    pedestrianOptions.step_penalty = 5000;
  }

  const body: any = {
    locations: coords.map((c) => ({
      lat: c.latitude,
      lon: c.longitude,
    })),
    costing,
    costing_options: {
      pedestrian: pedestrianOptions,
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
    // Generate cluster per hazard (exact point + cardinal offsets ~18m)
    // to reliably block the entire street segment in Valhalla's edge graph
    const expandedAvoids: { lat: number; lon: number }[] = [];
    const delta = 0.00018; // ~18-20m delta
    for (const a of avoidLocations) {
      expandedAvoids.push({ lat: a.latitude, lon: a.longitude });
      expandedAvoids.push({ lat: a.latitude + delta, lon: a.longitude });
      expandedAvoids.push({ lat: a.latitude - delta, lon: a.longitude });
      expandedAvoids.push({ lat: a.latitude, lon: a.longitude + delta });
      expandedAvoids.push({ lat: a.latitude, lon: a.longitude - delta });
    }
    body.avoid_locations = expandedAvoids;
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
      const legCoords: RouteCoordinate[] = leg.shape ? decodeValhallaPolyline(leg.shape, 6) : [];
      if (legCoords.length > 0) {
        if (geoCoordinates.length > 0) {
          geoCoordinates.push(...legCoords.slice(1));
        } else {
          geoCoordinates.push(...legCoords);
        }
      }

      if (Array.isArray(leg.maneuvers)) {
        for (const m of leg.maneuvers) {
          const shapeIdx = typeof m.begin_shape_index === 'number' ? m.begin_shape_index : 0;
          const stepLocation = legCoords[shapeIdx] || (geoCoordinates.length > 0 ? geoCoordinates[0] : undefined);

          steps.push({
            instruction: m.instruction || 'Siga o percurso',
            distanceMeters: Math.round((m.length || 0) * 1000),
            durationSeconds: Math.round(m.time || 0),
            maneuverType: m.type?.toString() || 'turn',
            streetName: Array.isArray(m.street_names) ? m.street_names.join(', ') : undefined,
            location: stepLocation,
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
        const stepLocation = s.maneuver?.location
          ? { latitude: s.maneuver.location[1], longitude: s.maneuver.location[0] }
          : undefined;

        steps.push({
          instruction: s.maneuver?.instruction || s.name || 'Continue no percurso',
          distanceMeters: Math.round(s.distance || 0),
          durationSeconds: Math.round(s.duration || 0),
          maneuverType: s.maneuver?.type || 'turn',
          maneuverModifier: s.maneuver?.modifier,
          streetName: s.name,
          location: stepLocation,
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
  mode: TransportMode = 'walking',
  avoidLocations?: RouteCoordinate[],
  avoidAccessibilityBarriers: boolean = false
) {
  const valhallaResult = await fetchValhallaRoute(
    coords,
    mode,
    avoidLocations,
    avoidAccessibilityBarriers
  );
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
  mode: TransportMode = 'walking',
  avoidAccessibilityBarriers: boolean = false
): Incident[] {
  const dangerousIncidents: Incident[] = [];

  for (const inc of incidents) {
    if (inc.category === 'safe_haven') continue;

    // Driving mode: cars ignore dark areas and sidewalk accessibility barriers
    if (mode === 'driving') {
      if (inc.category === 'dark_area' || isAccessibilityCategory(inc.category)) {
        continue;
      }
    } else {
      // Walking mode: if accessibility mode is OFF, general pedestrians do not treat
      // architectural accessibility barriers (e.g. stairs) as danger zones.
      if (isAccessibilityCategory(inc.category) && !avoidAccessibilityBarriers) {
        continue;
      }
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
 * Helper to calculate minimum distance from any point of a route to a specific hazard.
 */
function getRouteMinDistanceToHazard(
  routeCoords: RouteCoordinate[],
  hazard: RouteCoordinate
): number {
  let min = Infinity;
  for (const pt of routeCoords) {
    const d = calculateDistanceMeters(pt.latitude, pt.longitude, hazard.latitude, hazard.longitude);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Checks if a hazard has been successfully bypassed by a detour.
 * A hazard is considered avoided if:
 * 1. The detour route never passes within thresholdMeters of it, OR
 * 2. If the direct route collided right through it (< 12m) and the detour maintains safe clearance (>= 18m), OR
 * 3. The detour increases clearance from the hazard by at least 15m.
 */
function isHazardAvoidedByRoute(
  hazard: Incident,
  directCoords: RouteCoordinate[],
  detourCoords: RouteCoordinate[],
  thresholdMeters: number
): boolean {
  const detourMin = getRouteMinDistanceToHazard(detourCoords, hazard);
  if (detourMin > thresholdMeters) return true;

  const directMin = getRouteMinDistanceToHazard(directCoords, hazard);
  if (directMin < 12 && detourMin >= 18) return true;
  if (detourMin - directMin >= 15) return true;

  return false;
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
  avoidAccessibilityBarriers?: boolean;
}): Promise<{
  safeRoute: PedestrianRoute;
  directRoute?: PedestrianRoute;
}> {
  const {
    origin,
    destination,
    incidents,
    mode = 'walking',
    avoidAccessibilityBarriers = false,
  } = params;

  // Accessibility avoidance strictly applies to pedestrian mode, never to driving mode
  const effectiveAccessibilityAvoidance = mode !== 'driving' && Boolean(avoidAccessibilityBarriers);

  // 0. Modo de Transportes Públicos (Porto Digital OTP - STCP / Metro)
  if (mode === 'transit') {
    const transitRoute = await fetchPortoTransitRoute(origin, destination);
    if (transitRoute) {
      const hazardsOnRoute: Incident[] = [];
      const hazardsAvoided: Incident[] = [];

      incidents.forEach((inc) => {
        const isNear = transitRoute.coordinates.some(
          (c) => calculateDistanceMeters(c.latitude, c.longitude, inc.latitude, inc.longitude) < 65
        );
        if (isNear) {
          hazardsOnRoute.push(inc);
        } else {
          hazardsAvoided.push(inc);
        }
      });

      transitRoute.hazardsOnRoute = hazardsOnRoute;
      transitRoute.hazardsAvoided = hazardsAvoided;
      transitRoute.isSafe = hazardsOnRoute.length === 0;

      return {
        safeRoute: transitRoute,
        directRoute: transitRoute,
      };
    }
  }

  // 1. Fetch direct route via Valhalla (fallback OSRM)
  const directData = await fetchRouteMultiEngine(
    [origin, destination],
    mode,
    undefined,
    effectiveAccessibilityAvoidance
  );

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
      id: `fallback-direct-${Date.now()}`,
      name:
        mode === 'driving'
          ? 'Percurso Automóvel'
          : effectiveAccessibilityAvoidance
          ? 'Percurso Acessível'
          : 'Percurso Pedestre',
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
              : effectiveAccessibilityAvoidance
              ? 'Siga no caminho acessível em direção ao seu destino'
              : 'Siga a pé em direção ao seu destino',
          distanceMeters: straightDist,
          durationSeconds: durationMins * 60,
          maneuverType: 'depart',
        },
      ],
      isSafe: true,
      hazardsAvoided: [],
      hazardsOnRoute: [],
      summary:
        mode === 'driving'
          ? 'Percurso automóvel estimado'
          : effectiveAccessibilityAvoidance
          ? '♿ Percurso com acessibilidade estimado'
          : 'Percurso pedestre estimado',
    };
    return { safeRoute: ensureStepCoordinates(fallbackRoute) };
  }

  // Threshold for proximity to hazard:
  // - For driving: 30m (vehicles on roads)
  // - For walking with accessibility barriers: 20m (sidewalk obstacles are localized; parallel street 30-40m away is safe)
  // - For standard walking safety hazards: 25m
  const hazardThreshold =
    mode === 'driving'
      ? 30
      : effectiveAccessibilityAvoidance
      ? 20
      : 25;

  const hazardsOnDirect = findHazardsNearRoute(
    directData.coordinates,
    incidents,
    hazardThreshold,
    mode,
    effectiveAccessibilityAvoidance
  );

  const directRoute: PedestrianRoute = {
    id: `route-direct-${Date.now()}`,
    name:
      mode === 'driving'
        ? 'Caminho Mais Rápido (Valhalla)'
        : effectiveAccessibilityAvoidance
        ? 'Caminho Direto (Com Barreiras/Degraus)'
        : 'Caminho Mais Curto (Valhalla)',
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
        ? effectiveAccessibilityAvoidance
          ? `⚠️ Contém ${hazardsOnDirect.length} barreira(s) de acessibilidade/degraus`
          : `⚠️ Alerta: Passa próximo de ${hazardsOnDirect.length} reporte(s) de perigo`
        : effectiveAccessibilityAvoidance
        ? '♿ Caminho plano sem degraus nem barreiras registadas'
        : 'Caminho seguro e desimpedido',
  };

  // If clean of hazards/barriers, direct route is the safe/accessible route
  if (hazardsOnDirect.length === 0) {
    return {
      safeRoute: ensureStepCoordinates({
        ...directRoute,
        name: effectiveAccessibilityAvoidance
          ? 'Percurso Seguro & Acessível'
          : 'Rota Segura (Valhalla)',
        isSafe: true,
        summary: effectiveAccessibilityAvoidance
          ? '♿ Caminho plano sem degraus nem barreiras registadas'
          : 'Caminho seguro e desimpedido',
      }),
    };
  }

  // 2. Intelligent hazard bypass
  // Strategy A: Native Valhalla street-level avoidance (uses OSM road graph to find nearest alternative street)
  const avoidCoords = hazardsOnDirect.map((h) => ({
    latitude: h.latitude,
    longitude: h.longitude,
  }));

  const valhallaBypass = await fetchValhallaRoute(
    [origin, destination],
    mode,
    avoidCoords,
    effectiveAccessibilityAvoidance
  );

  if (valhallaBypass) {
    const hazardsOnValhallaBypass = findHazardsNearRoute(
      valhallaBypass.coordinates,
      incidents,
      hazardThreshold,
      mode,
      effectiveAccessibilityAvoidance
    );

    const avoided = hazardsOnDirect.filter((h) =>
      isHazardAvoidedByRoute(h, directData.coordinates, valhallaBypass.coordinates, hazardThreshold)
    );

    const isReasonableDistance = valhallaBypass.distance <= directData.distance * 2.5;

    if (avoided.length > 0 && isReasonableDistance) {
      const remainingHazards = hazardsOnValhallaBypass.filter(
        (h) => !avoided.some((av) => av.id === h.id)
      );

      const safeDetourRoute: PedestrianRoute = {
        id: `route-safe-valhalla-${Date.now()}`,
        name: effectiveAccessibilityAvoidance
          ? 'Percurso Seguro & Acessível (Sem Degraus)'
          : 'Rota Segura (Desvio Inteligente Valhalla)',
        mode,
        distanceMeters: Math.round(valhallaBypass.distance),
        durationMinutes: valhallaBypass.durationMinutes,
        formattedDuration: formatDuration(valhallaBypass.durationMinutes),
        formattedDistance: formatDistance(valhallaBypass.distance),
        estimatedArrival: calculateEstimatedArrival(valhallaBypass.durationMinutes),
        coordinates: valhallaBypass.coordinates,
        steps: valhallaBypass.steps,
        isSafe: remainingHazards.length === 0,
        hazardsAvoided: avoided,
        hazardsOnRoute: remainingHazards,
        summary: effectiveAccessibilityAvoidance
          ? `♿ Rota Acessível: contorna ${avoided.length} barreira(s) de mobilidade`
          : `🛡️ Evita ${avoided.length} zona(s) de perigo identificada(s)`,
      };

      return {
        safeRoute: ensureStepCoordinates(safeDetourRoute),
        directRoute: ensureStepCoordinates(directRoute),
      };
    }
  }

  // Strategy B: Lateral waypoint detour (tests multiple perpendicular offsets around the primary hazard)
  const primaryHazard = hazardsOnDirect[0];
  const dLat = destination.latitude - origin.latitude;
  const dLon = destination.longitude - origin.longitude;
  const len = Math.sqrt(dLat * dLat + dLon * dLon) || 1;
  const cosLat = Math.cos((primaryHazard.latitude * Math.PI) / 180);

  // Perpendicular unit vector normalized with cosine latitude
  const perpLat = -dLon / len;
  const perpLon = (dLat / len) / Math.max(0.1, cosLat);

  // Test realistic street block offsets (~70m, ~110m, ~160m)
  const offsets = mode === 'driving' ? [0.0015, 0.0025] : [0.0008, 0.0013, 0.0018];
  const candidates: RouteCoordinate[] = [];
  for (const off of offsets) {
    candidates.push({
      latitude: primaryHazard.latitude + perpLat * off,
      longitude: primaryHazard.longitude + perpLon * off,
    });
    candidates.push({
      latitude: primaryHazard.latitude - perpLat * off,
      longitude: primaryHazard.longitude - perpLon * off,
    });
  }

  for (const evasionCoord of candidates) {
    const safeData = await fetchRouteMultiEngine(
      [origin, evasionCoord, destination],
      mode,
      undefined,
      effectiveAccessibilityAvoidance
    );

    if (safeData && safeData.distance <= directData.distance * 2.5) {
      const hazardsOnDetour = findHazardsNearRoute(
        safeData.coordinates,
        incidents,
        hazardThreshold,
        mode,
        effectiveAccessibilityAvoidance
      );

      const avoided = hazardsOnDirect.filter((h) =>
        isHazardAvoidedByRoute(h, directData.coordinates, safeData.coordinates, hazardThreshold)
      );

      if (avoided.length > 0) {
        const remainingHazards = hazardsOnDetour.filter(
          (h) => !avoided.some((av) => av.id === h.id)
        );

        const safeDetourRoute: PedestrianRoute = {
          id: `route-safe-detour-${Date.now()}`,
          name: effectiveAccessibilityAvoidance
            ? 'Percurso Seguro & Acessível (Desvio)'
            : 'Rota Segura (Desvio de Proteção)',
          mode,
          distanceMeters: Math.round(safeData.distance),
          durationMinutes: safeData.durationMinutes,
          formattedDuration: formatDuration(safeData.durationMinutes),
          formattedDistance: formatDistance(safeData.distance),
          estimatedArrival: calculateEstimatedArrival(safeData.durationMinutes),
          coordinates: safeData.coordinates,
          steps: safeData.steps,
          isSafe: remainingHazards.length === 0,
          hazardsAvoided: avoided,
          hazardsOnRoute: remainingHazards,
          summary: effectiveAccessibilityAvoidance
            ? `♿ Rota Acessível: contorna ${avoided.length} barreira(s) de mobilidade`
            : `🛡️ Evita ${avoided.length} zona(s) de perigo identificada(s)`,
        };

        return {
          safeRoute: ensureStepCoordinates(safeDetourRoute),
          directRoute: ensureStepCoordinates(directRoute),
        };
      }
    }
  }

  // If no detour is possible or all detours are blocked, return direct route with warning
  return { safeRoute: ensureStepCoordinates(directRoute) };
}

/**
 * Ensures that every step along the route has an exact geographical location coordinate.
 * If routing engine didn't provide a step-specific coordinate, it interpolates along the route coordinates.
 */
export function ensureStepCoordinates(route: PedestrianRoute): PedestrianRoute {
  if (!route.coordinates || route.coordinates.length === 0) return route;
  const totalCoords = route.coordinates.length;
  const numSteps = route.steps?.length || 0;

  const steps = (route.steps || []).map((step, idx) => {
    if (step.location) return step;
    const coordIdx = Math.min(
      totalCoords - 1,
      Math.floor((idx / Math.max(1, numSteps)) * totalCoords)
    );
    return {
      ...step,
      location: route.coordinates[coordIdx],
    };
  });

  return { ...route, steps };
}
