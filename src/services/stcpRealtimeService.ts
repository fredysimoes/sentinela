/**
 * STCP & Porto Digital Realtime & Transit Service
 * Fornece a localização ao vivo de autocarros da STCP e cálculo de trajetos
 * intermodais (Metro do Porto + STCP) através dos nós de dados abertos do Porto.
 */

import { PedestrianRoute, RouteCoordinate, RouteStep } from '../types/navigation';
import { calculateDistanceMeters } from '../utils/geo';
import { formatDuration, formatDistance, calculateEstimatedArrival } from './routingService';

export interface StcpVehicle {
  id: string;
  routeId: string;
  directionId: number;
  lat: number;
  lng: number;
  bearing?: number;
  operator: string;
  timestamp?: number | null;
  speed?: number | null;
}

/**
 * Paleta de cores oficiais da rede STCP por família de linhas
 */
export function getStcpLineColor(routeId: string): { bg: string; border: string; text: string } {
  const clean = String(routeId || '').trim().toUpperCase();

  // Linhas Noturnas (1M a 13M)
  if (clean.endsWith('M') || clean.startsWith('M')) {
    return { bg: '#0F172A', border: '#334155', text: '#F8FAFC' };
  }

  const num = parseInt(clean, 10);

  // Linhas 200, 300, 400 (Linhas Azuis Centrais e Circulares)
  if (num >= 200 && num < 500) {
    return { bg: '#0284C7', border: '#38BDF8', text: '#FFFFFF' };
  }

  // Linhas 500 (Matosinhos / Foz - Amarelo STCP)
  if (num >= 500 && num < 600) {
    return { bg: '#D97706', border: '#FBBF24', text: '#FFFFFF' };
  }

  // Linhas 600 (Maia / Aeroporto - Verde STCP)
  if (num >= 600 && num < 700) {
    return { bg: '#16A34A', border: '#4ADE80', text: '#FFFFFF' };
  }

  // Linhas 700 (Valongo / Ermesinde - Vermelho STCP)
  if (num >= 700 && num < 800) {
    return { bg: '#DC2626', border: '#F87171', text: '#FFFFFF' };
  }

  // Linhas 800 (Gondomar - Roxo STCP)
  if (num >= 800 && num < 900) {
    return { bg: '#9333EA', border: '#C084FC', text: '#FFFFFF' };
  }

  // Linhas 900 (Vila Nova de Gaia - Laranja STCP)
  if (num >= 900 && num < 1000) {
    return { bg: '#EA580C', border: '#FB923C', text: '#FFFFFF' };
  }

  // MetroBus ou Elétricos
  if (clean.startsWith('MB') || clean === '1' || clean === '18' || clean === '22') {
    return { bg: '#B45309', border: '#F59E0B', text: '#FFFFFF' };
  }

  // Padrão / UNIR / Outros
  return { bg: '#0284C7', border: '#38BDF8', text: '#FFFFFF' };
}

/**
 * Obtém a telemetria em tempo real de todos os autocarros STCP ativos no Grande Porto
 */
export async function fetchStcpLiveVehicles(): Promise<StcpVehicle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://porto-live.tiagoanoliveira.workers.dev/vehicles', {
      headers: {
        Origin: 'https://stcp.tiagoanoliveira.pt',
        Referer: 'https://stcp.tiagoanoliveira.pt/',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao obter autocarros STCP: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.vehicles)) {
      return [];
    }

    // Filtrar e normalizar coordenadas válidas
    const validVehicles: StcpVehicle[] = [];
    for (const v of data.vehicles) {
      if (
        typeof v.lat === 'number' &&
        typeof v.lng === 'number' &&
        !isNaN(v.lat) &&
        !isNaN(v.lng) &&
        v.lat >= 40.95 &&
        v.lat <= 41.45 &&
        v.lng >= -8.95 &&
        v.lng <= -8.35
      ) {
        validVehicles.push({
          id: String(v.id || v.tripId || `${v.routeId}-${v.lat}-${v.lng}`),
          routeId: String(v.routeId || v.route_id || '').trim(),
          directionId: Number(v.directionId ?? v.direction_id ?? 0),
          lat: v.lat,
          lng: v.lng,
          bearing: typeof v.bearing === 'number' && !isNaN(v.bearing) ? v.bearing : undefined,
          operator: String(v.operator || 'stcp'),
          timestamp: v.timestamp ? Number(v.timestamp) : null,
          speed: typeof v.speed === 'number' ? v.speed : null,
        });
      }
    }

    return validVehicles;
  } catch (error) {
    console.warn('Erro ao consultar autocarros STCP em tempo real:', error);
    return [];
  }
}

/**
 * Descodifica polilinhas no algoritmo padrão Google (precisão 5)
 */
export function decodeGooglePolyline(str: string): RouteCoordinate[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: RouteCoordinate[] = [];

  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
}

/**
 * Calcula percurso de transportes públicos no Porto através do OpenTripPlanner (Porto Digital)
 */
export async function fetchPortoTransitRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate
): Promise<PedestrianRoute | null> {
  try {
    const query = `{
      plan(
        from: { lat: ${origin.latitude}, lon: ${origin.longitude} }
        to: { lat: ${destination.latitude}, lon: ${destination.longitude} }
        numItineraries: 1
      ) {
        itineraries {
          duration
          startTime
          endTime
          legs {
            mode
            duration
            distance
            legGeometry { points }
            from { name lat lon }
            to { name lat lon }
            route { shortName longName color textColor }
          }
        }
      }
    }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch('https://otp.portodigital.pt/otp/gtfs/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha no cálculo de transportes: ${response.status}`);
    }

    const json = await response.json();
    const itinerary = json?.data?.plan?.itineraries?.[0];

    if (!itinerary || !Array.isArray(itinerary.legs) || itinerary.legs.length === 0) {
      return null;
    }

    const durationSeconds = Math.round(Number(itinerary.duration || 0));
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    let totalDistanceMeters = 0;
    const allCoords: RouteCoordinate[] = [];
    const steps: RouteStep[] = [];

    itinerary.legs.forEach((leg: any, index: number) => {
      const legDist = Math.round(Number(leg.distance || 0));
      totalDistanceMeters += legDist;
      const legDurSec = Math.round(Number(leg.duration || 0));

      if (leg.legGeometry?.points) {
        const decoded = decodeGooglePolyline(leg.legGeometry.points);
        allCoords.push(...decoded);
      } else if (leg.from && leg.to) {
        allCoords.push(
          { latitude: leg.from.lat, longitude: leg.from.lon },
          { latitude: leg.to.lat, longitude: leg.to.lon }
        );
      }

      // Instrução humanizada em português
      let instruction = '';
      const mode = String(leg.mode || '').toUpperCase();
      const fromName = leg.from?.name === 'Origin' ? 'Ponto de Partida' : (leg.from?.name || 'Paragem');
      const toName = leg.to?.name === 'Destination' ? 'Destino Final' : (leg.to?.name || 'Paragem seguinte');

      if (mode === 'WALK') {
        instruction = index === 0
          ? `Caminhe a pé até ${toName} (${formatDistance(legDist)})`
          : index === itinerary.legs.length - 1
          ? `Caminhe de ${fromName} até ao ${toName} (${formatDistance(legDist)})`
          : `Transbordo a pé para ${toName} (${formatDistance(legDist)})`;
      } else if (mode === 'SUBWAY' || mode === 'TRAM') {
        const line = leg.route?.shortName ? `Linha ${leg.route.shortName}` : 'Metro';
        instruction = `Apanhe o Metro (${line}) em ${fromName} até ${toName}`;
      } else if (mode === 'BUS') {
        const line = leg.route?.shortName ? `Autocarro STCP ${leg.route.shortName}` : 'Autocarro STCP';
        instruction = `Apanhe o ${line} em ${fromName} até ${toName}`;
      } else if (mode === 'RAIL') {
        instruction = `Apanhe o Comboio CP em ${fromName} até ${toName}`;
      } else {
        instruction = `Siga de transporte em ${fromName} até ${toName}`;
      }

      steps.push({
        instruction,
        distanceMeters: legDist,
        durationSeconds: legDurSec,
        maneuverType: mode === 'WALK' ? 'walk' : 'transit',
        streetName: leg.route?.shortName ? `Linha ${leg.route.shortName}` : fromName,
        location: leg.from ? { latitude: leg.from.lat, longitude: leg.from.lon } : undefined,
      });
    });

    if (allCoords.length === 0) {
      allCoords.push(origin, destination);
    }

    return {
      id: `transit-porto-${Date.now()}`,
      name: 'Trajeto de Transportes Públicos (Porto)',
      mode: 'transit',
      distanceMeters: totalDistanceMeters,
      durationMinutes,
      formattedDuration: formatDuration(durationMinutes),
      formattedDistance: formatDistance(totalDistanceMeters),
      estimatedArrival: calculateEstimatedArrival(durationMinutes),
      coordinates: allCoords,
      steps,
      isSafe: true,
      hazardsAvoided: [],
      hazardsOnRoute: [],
      summary: `STCP / Metro do Porto · ~${formatDuration(durationMinutes)}`,
    };
  } catch (error) {
    console.warn('Erro ao calcular trajeto de transportes no Porto Digital OTP:', error);
    return null;
  }
}
