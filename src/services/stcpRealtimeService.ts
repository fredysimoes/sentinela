/**
 * STCP & Porto Digital Realtime & Transit Service
 * Fornece a localização ao vivo de autocarros da STCP e cálculo de trajetos
 * intermodais (Metro do Porto + STCP) através dos nós de dados abertos do Porto.
 */

import { transit_realtime } from 'gtfs-realtime-bindings';
import {
  PedestrianRoute,
  RouteCoordinate,
  RouteStep,
  StopArrivalPrediction,
  TransitStop,
} from '../types/navigation';
import { calculateDistanceMeters } from '../utils/geo';
import { formatDuration, formatDistance, calculateEstimatedArrival } from './routingService';

export interface StcpVehicle {
  id: string;
  routeId: string;
  displayLine?: string;
  directionId: number;
  lat: number;
  lng: number;
  bearing?: number;
  operator: 'stcp' | 'unir' | 'carris' | 'carris_metropolitana' | 'cp' | string;
  vehicleType?: 'bus' | 'tram' | 'train' | string;
  serviceType?: 'alfa_pendular' | 'intercidades' | 'urbano_porto' | 'urbano_lisboa' | 'regional' | string;
  serviceName?: string;
  origin?: string;
  destination?: string;
  delayMinutes?: number;
  timestamp?: number | null;
  speed?: number | null;
}

/**
 * Paleta de cores oficiais das redes STCP, UNIR, Carris, Carris Metropolitana e CP
 */
export function getTransitLineColor(
  routeId: string,
  operator?: string,
  serviceType?: string
): { bg: string; border: string; text: string } {
  const clean = String(routeId || '').trim().toUpperCase();

  // CP - Comboios de Portugal
  if (operator === 'cp') {
    // Alfa Pendular (AP)
    if (serviceType === 'alfa_pendular' || clean.startsWith('AP')) {
      return { bg: '#1E3A8A', border: '#38BDF8', text: '#FFFFFF' };
    }
    // Intercidades (IC)
    if (serviceType === 'intercidades' || clean.startsWith('IC')) {
      return { bg: '#2563EB', border: '#93C5FD', text: '#FFFFFF' };
    }
    // Urbanos do Porto e Lisboa
    if (serviceType === 'urbano_porto' || serviceType === 'urbano_lisboa') {
      return { bg: '#00824B', border: '#4ADE80', text: '#FFFFFF' };
    }
    // Regional / Padrão CP
    return { bg: '#047857', border: '#34D399', text: '#FFFFFF' };
  }

  // Carris (Lisboa Urbana)
  if (operator === 'carris') {
    // Elétricos Históricos e Rápidos (12E, 15E, 18E, 24E, 25E, 28E)
    if (clean.endsWith('E') || clean.includes('E')) {
      return { bg: '#B45309', border: '#FDE047', text: '#FFFFFF' };
    }
    // Linhas Noturnas de Lisboa (201 a 210)
    if (clean.startsWith('20') || clean.startsWith('21')) {
      return { bg: '#0F172A', border: '#334155', text: '#F8FAFC' };
    }
    // Amarelo Característico da Carris Lisboa
    return { bg: '#EAB308', border: '#FEF08A', text: '#0F172A' };
  }

  // Carris Metropolitana (Área Metropolitana de Lisboa)
  if (operator === 'carris_metropolitana') {
    const num = parseInt(clean, 10);
    // Área 1: Amadora, Cascais, Oeiras, Sintra (Linhas 1xxx)
    if (num >= 1000 && num < 2000) {
      return { bg: '#F59E0B', border: '#FDE68A', text: '#0F172A' };
    }
    // Área 2: Loures, Mafra, Odivelas, Vila Franca de Xira (Linhas 2xxx)
    if (num >= 2000 && num < 3000) {
      return { bg: '#D97706', border: '#FBBF24', text: '#FFFFFF' };
    }
    // Área 3: Almada, Seixal, Sesimbra (Linhas 3xxx)
    if (num >= 3000 && num < 4000) {
      return { bg: '#EA580C', border: '#FB923C', text: '#FFFFFF' };
    }
    // Área 4: Alcochete, Barreiro, Moita, Montijo, Palmela, Setúbal (Linhas 4xxx)
    if (num >= 4000 && num < 5000) {
      return { bg: '#C2410C', border: '#F97316', text: '#FFFFFF' };
    }
    return { bg: '#F59E0B', border: '#FDE68A', text: '#0F172A' };
  }

  // Se for operador UNIR ou carreira de 4 dígitos da AMP
  if (operator === 'unir' || (/^\d{4}/.test(clean) && clean.length === 4 && parseInt(clean, 10) >= 5000)) {
    const num = parseInt(clean, 10);
    // Lote 1 & 3: Linhas 3000, 5000, 6000 (Norte Litoral - Matosinhos / Maia / Póvoa)
    if ((num >= 3000 && num < 4000) || (num >= 5000 && num < 7000)) {
      return { bg: '#0891B2', border: '#22D3EE', text: '#FFFFFF' };
    }
    // Lote 2: Linhas 7000, 8000 (Norte Nascente - Valongo / Paredes)
    if (num >= 7000 && num < 9000) {
      return { bg: '#0D9488', border: '#2DD4BF', text: '#FFFFFF' };
    }
    // Lote 4: Linhas 9000 (Sul Poente - Gaia / Espinho)
    if (num >= 9000) {
      return { bg: '#0284C7', border: '#38BDF8', text: '#FFFFFF' };
    }
    // Lote 5: Linhas 1000, 2000 (Sul Nascente - Feira / Arouca)
    return { bg: '#0F766E', border: '#5EEAD4', text: '#FFFFFF' };
  }

  // Linhas Noturnas STCP (1M a 13M)
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

  // Padrão
  return { bg: '#0284C7', border: '#38BDF8', text: '#FFFFFF' };
}

export const getStcpLineColor = (routeId: string, operator?: string, serviceType?: string) =>
  getTransitLineColor(routeId, operator, serviceType);

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
 * Obtém a telemetria em tempo real dos autocarros da rede UNIR (Área Metropolitana do Porto)
 */
export async function fetchUnirLiveVehicles(): Promise<StcpVehicle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://porto-live.tiagoanoliveira.workers.dev/vehicles/unir', {
      headers: {
        Origin: 'https://stcp.tiagoanoliveira.pt',
        Referer: 'https://stcp.tiagoanoliveira.pt/',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao obter autocarros UNIR: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.vehicles)) {
      return [];
    }

    const validVehicles: StcpVehicle[] = [];
    for (const v of data.vehicles) {
      if (
        typeof v.lat === 'number' &&
        typeof v.lng === 'number' &&
        !isNaN(v.lat) &&
        !isNaN(v.lng) &&
        v.lat >= 40.75 &&
        v.lat <= 41.55 &&
        v.lng >= -8.98 &&
        v.lng <= -8.10
      ) {
        // Ex.: "5013:0" -> "5013"
        const rawRoute = String(v.routeId || v.route_id || '').trim();
        const displayLine = rawRoute.split(':')[0] || rawRoute;

        validVehicles.push({
          id: String(v.id || `unir-${rawRoute}-${v.lat}-${v.lng}`),
          routeId: displayLine,
          displayLine,
          directionId: Number(v.directionId ?? v.direction_id ?? 0),
          lat: v.lat,
          lng: v.lng,
          bearing: typeof v.bearing === 'number' && !isNaN(v.bearing) ? v.bearing : undefined,
          operator: 'unir',
          timestamp: v.timestamp ? Number(v.timestamp) : null,
          speed: typeof v.speed === 'number' ? v.speed : null,
        });
      }
    }

    return validVehicles;
  } catch (error) {
    console.warn('Erro ao consultar autocarros UNIR em tempo real:', error);
    return [];
  }
}

/**
 * Obtém todos os autocarros em circulação no Porto (STCP + UNIR em paralelo)
 */
export async function fetchPortoLiveBuses(options?: {
  includeStcp?: boolean;
  includeUnir?: boolean;
}): Promise<StcpVehicle[]> {
  const { includeStcp = true, includeUnir = true } = options || {};

  const promises: Promise<StcpVehicle[]>[] = [];
  if (includeStcp) promises.push(fetchStcpLiveVehicles());
  if (includeUnir) promises.push(fetchUnirLiveVehicles());

  const results = await Promise.allSettled(promises);
  const allVehicles: StcpVehicle[] = [];
  const seenIds = new Set<string>();

  results.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const v of res.value) {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          allVehicles.push(v);
        }
      }
    }
  });

  return allVehicles;
}

/**
 * Obtém a telemetria em tempo real dos autocarros e elétricos da Carris (Lisboa Urbana)
 * Consome o feed oficial GTFS-Realtime Protobuf da Carris Gateway
 */
export async function fetchCarrisLiveVehicles(): Promise<StcpVehicle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch('https://gateway.carris.pt/gateway/gtfs/api/v2.11/GTFS/realtime/vehiclepositions', {
      headers: {
        Accept: 'application/x-protobuf, application/octet-stream, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao obter autocarros Carris: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const u8 = new Uint8Array(arrayBuffer);
    const feed = transit_realtime.FeedMessage.decode(u8);

    if (!feed || !Array.isArray(feed.entity)) {
      return [];
    }

    const validVehicles: StcpVehicle[] = [];

    for (const entity of feed.entity) {
      const v = entity.vehicle;
      if (!v || !v.position) continue;

      const lat = v.position.latitude;
      const lng = v.position.longitude;

      if (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= 38.45 &&
        lat <= 39.15 &&
        lng >= -9.55 &&
        lng <= -8.80
      ) {
        // Ex.: id = "2799_727" -> carreira 727; "558_28E" -> elétrico 28E
        const idParts = String(entity.id || '').split('_');
        let displayLine = idParts.length > 1 ? idParts[1] : '';
        if (!displayLine) {
          displayLine = String(v.trip?.routeId || v.vehicle?.id || 'CARRIS');
        }

        const isTram = /E$/i.test(displayLine);

        validVehicles.push({
          id: String(entity.id || `carris-${lat}-${lng}`),
          routeId: displayLine,
          displayLine,
          directionId: Number(v.trip?.directionId ?? 0),
          lat,
          lng,
          bearing: typeof v.position.bearing === 'number' && !isNaN(v.position.bearing) ? v.position.bearing : undefined,
          operator: 'carris',
          vehicleType: isTram ? 'tram' : 'bus',
          timestamp: typeof v.timestamp === 'number' ? v.timestamp : null,
          speed: typeof v.position.speed === 'number' ? v.position.speed : null,
        });
      }
    }

    return validVehicles;
  } catch (error) {
    console.warn('Erro ao consultar autocarros Carris Lisboa em tempo real:', error);
    return [];
  }
}

/**
 * Obtém a telemetria em tempo real dos autocarros da Carris Metropolitana (AML)
 * Consome a API pública em JSON da TML / Carris Metropolitana
 */
export async function fetchCarrisMetropolitanaLiveVehicles(): Promise<StcpVehicle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch('https://api.carrismetropolitana.pt/v2/vehicles', {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao obter autocarros Carris Metropolitana: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    const validVehicles: StcpVehicle[] = [];

    for (const v of data) {
      const lat = typeof v.lat === 'number' ? v.lat : parseFloat(v.lat);
      const lng = typeof v.lon === 'number' ? v.lon : parseFloat(v.lon);

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= 38.30 &&
        lat <= 39.25 &&
        lng >= -9.60 &&
        lng <= -8.45
      ) {
        const lineId = String(v.line_id || '').trim();

        validVehicles.push({
          id: String(v.id || `cm-${lineId}-${lat}-${lng}`),
          routeId: lineId,
          displayLine: lineId,
          directionId: Number(v.direction_id ?? 0),
          lat,
          lng,
          bearing: typeof v.bearing === 'number' && !isNaN(v.bearing) ? v.bearing : undefined,
          operator: 'carris_metropolitana',
          vehicleType: 'bus',
          timestamp: v.timestamp ? Number(v.timestamp) : null,
          speed: typeof v.speed === 'number' ? v.speed : null,
        });
      }
    }

    return validVehicles;
  } catch (error) {
    console.warn('Erro ao consultar autocarros Carris Metropolitana em tempo real:', error);
    return [];
  }
}

/**
 * Obtém a telemetria em tempo real dos comboios da CP (Comboios de Portugal)
 * Suporta Alfa Pendular, Intercidades, Urbanos do Porto e Urbanos de Lisboa.
 * Regra de visibilidade solicitada:
 * - Intercidades e Alfa Pendular: visíveis para quem estiver em Lisboa e no Porto mesmo fora da área geográfica.
 * - Urbanos: apenas visíveis dentro da respetiva área geográfica.
 */
export async function fetchCpLiveTrains(options?: {
  userCoordinate?: { latitude: number; longitude: number } | null;
}): Promise<StcpVehicle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    const response = await fetch('https://comboios.live/api/vehicles', {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao obter comboios CP: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.vehicles)) {
      return [];
    }

    const userCoord = options?.userCoordinate;
    // Deteção da região de foco do utilizador / mapa
    const isUserInPorto = userCoord ? userCoord.latitude >= 40.3 : true;
    const isUserInLisbon = userCoord ? userCoord.latitude <= 39.8 : true;

    const validVehicles: StcpVehicle[] = [];

    for (const v of data.vehicles) {
      const lat = typeof v.latitude === 'number' ? v.latitude : parseFloat(v.latitude);
      const lng = typeof v.longitude === 'number' ? v.longitude : parseFloat(v.longitude);

      if (isNaN(lat) || isNaN(lng) || lat < 36.8 || lat > 42.5 || lng < -9.8 || lng > -6.0) {
        continue;
      }

      const serviceDesig = String(v.service?.designation || '').trim();
      const isAP = /Alfa Pendular/i.test(serviceDesig);
      const isIC = /Intercidades/i.test(serviceDesig);
      const isLongDistance = isAP || isIC || /InterRegional|Internacional/i.test(serviceDesig);
      const isUrbanoPorto = /Urbano do Porto/i.test(serviceDesig);
      const isUrbanoLisboa = /Urbano de Lisboa/i.test(serviceDesig);
      const isRegional = /Regional/i.test(serviceDesig);

      // Regra de Visibilidade Solicitada:
      // 1. Intercidades e Alfa Pendular: SEMPRE visíveis em todo o território
      if (isLongDistance) {
        // Mantém sempre visível para utilizadores no Porto e Lisboa
      } else if (isUrbanoPorto) {
        // Urbanos do Porto: apenas visíveis se o utilizador estiver no Grande Porto ou norte
        if (userCoord && !isUserInPorto) {
          continue;
        }
      } else if (isUrbanoLisboa) {
        // Urbanos de Lisboa: apenas visíveis se o utilizador estiver na Grande Lisboa ou centro/sul
        if (userCoord && !isUserInLisbon) {
          continue;
        }
      } else if (isRegional) {
        // Regionais: visíveis se estiverem no raio alargado de proximidade (55 km)
        if (userCoord) {
          const distM = calculateDistanceMeters(userCoord.latitude, userCoord.longitude, lat, lng);
          if (distM > 55000) {
            continue;
          }
        }
      }

      const trainNum = String(v.trainNumber || '');
      let displayLine = trainNum;
      let serviceType: StcpVehicle['serviceType'] = 'regional';

      if (isAP) {
        displayLine = `AP ${trainNum}`;
        serviceType = 'alfa_pendular';
      } else if (isIC) {
        displayLine = `IC ${trainNum}`;
        serviceType = 'intercidades';
      } else if (isUrbanoPorto) {
        displayLine = `U ${trainNum}`;
        serviceType = 'urbano_porto';
      } else if (isUrbanoLisboa) {
        displayLine = `U ${trainNum}`;
        serviceType = 'urbano_lisboa';
      } else if (isRegional) {
        displayLine = `R ${trainNum}`;
        serviceType = 'regional';
      }

      const delaySec = typeof v.delay === 'number' ? v.delay : null;
      const delayMinutes = delaySec !== null ? Math.round(delaySec / 60) : undefined;

      validVehicles.push({
        id: `cp-${v.agencyId || 'CP'}-${trainNum}-${v.runDate || ''}`,
        routeId: trainNum,
        displayLine,
        directionId: 0,
        lat,
        lng,
        bearing: typeof v.bearing === 'number' && !isNaN(v.bearing) ? v.bearing : undefined,
        operator: 'cp',
        vehicleType: 'train',
        serviceType,
        serviceName: serviceDesig,
        origin: v.origin?.designation,
        destination: v.destination?.designation,
        delayMinutes,
        timestamp: v.timestamp ? Number(v.timestamp) : null,
      });
    }

    return validVehicles;
  } catch (error) {
    console.warn('Erro ao consultar comboios CP em tempo real:', error);
    return [];
  }
}

export interface UnifiedTransitOptions {
  includeStcp?: boolean;
  includeUnir?: boolean;
  includeCarris?: boolean;
  includeCarrisMetropolitana?: boolean;
  includeCpTrains?: boolean;
  userCoordinate?: { latitude: number; longitude: number } | null;
  maxDistanceKm?: number;
}

/**
 * Consulta unificada e otimizada de transportes em tempo real (Porto + Lisboa + Comboios CP)
 * Permite filtrar por proximidade para poupança de bateria, dados móveis e memória,
 * mantendo o Alfa Pendular e Intercidades visíveis em todo o percurso nacional.
 */
export async function fetchUnifiedTransitBuses(options: UnifiedTransitOptions): Promise<StcpVehicle[]> {
  const {
    includeStcp = false,
    includeUnir = false,
    includeCarris = false,
    includeCarrisMetropolitana = false,
    includeCpTrains = false,
    userCoordinate,
    maxDistanceKm = 40,
  } = options;

  const promises: Promise<StcpVehicle[]>[] = [];

  if (includeStcp) promises.push(fetchStcpLiveVehicles());
  if (includeUnir) promises.push(fetchUnirLiveVehicles());
  if (includeCarris) promises.push(fetchCarrisLiveVehicles());
  if (includeCarrisMetropolitana) promises.push(fetchCarrisMetropolitanaLiveVehicles());
  if (includeCpTrains) promises.push(fetchCpLiveTrains({ userCoordinate }));

  if (promises.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(promises);
  const allVehicles: StcpVehicle[] = [];
  const seenIds = new Set<string>();

  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const v of res.value) {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);

          // Filtragem de proximidade (exceto para comboios de longo curso AP e IC que cobrem todo o país)
          const isFlagshipTrain =
            v.operator === 'cp' && (v.serviceType === 'alfa_pendular' || v.serviceType === 'intercidades');

          if (userCoordinate && maxDistanceKm > 0 && !isFlagshipTrain) {
            const distM = calculateDistanceMeters(userCoordinate.latitude, userCoordinate.longitude, v.lat, v.lng);
            if (distM > maxDistanceKm * 1000) {
              continue;
            }
          }

          allVehicles.push(v);
        }
      }
    }
  }

  return allVehicles;
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

/**
 * Consulta as próximas chegadas em tempo real de autocarros numa paragem
 * Fonte: https://stcp.tiagoanoliveira.pt / proxy Cloudflare Worker
 */
export async function fetchStopRealtimeArrivals(
  stopCodeOrId: string
): Promise<StopArrivalPrediction[]> {
  const cleanCode = String(stopCodeOrId || '')
    .trim()
    .replace(/^stcp:/i, '')
    .replace(/^2:/i, '');

  if (!cleanCode) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(
      `https://porto-live.tiagoanoliveira.workers.dev/${cleanCode}/realtime`,
      {
        headers: {
          Origin: 'https://stcp.tiagoanoliveira.pt',
          Referer: 'https://stcp.tiagoanoliveira.pt/',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const json = await response.json();
    const rawArrivals = json?.arrivals;
    if (!Array.isArray(rawArrivals)) return [];

    return rawArrivals.map((arr: any) => ({
      routeShortName: arr.route_short_name || '',
      headsign: arr.trip_headsign || '',
      arrivalMinutes: Math.max(0, Math.round(Number(arr.arrival_minutes || 0))),
      delayMinutes: arr.delay_minutes !== null ? Number(arr.delay_minutes) : undefined,
      status: arr.status || 'ON_TIME',
      color: arr.route_color ? (arr.route_color.startsWith('#') ? arr.route_color : `#${arr.route_color}`) : undefined,
      textColor: arr.route_text_color ? (arr.route_text_color.startsWith('#') ? arr.route_text_color : `#${arr.route_text_color}`) : undefined,
      estimatedArrivalTime: arr.estimated_arrival_time,
    }));
  } catch (err) {
    console.warn(`Falha ao obter chegadas em tempo real para paragem ${cleanCode}:`, err);
    return [];
  }
}

/**
 * Obtém as paragens de autocarro mais próximas da coordenada geográfica
 * com desduplicação espacial inteligente (garante 1 único ícone por paragem,
 * priorizando paragens STCP com previsões em tempo real ativas).
 * Fonte: https://gtfs-api.tiagoanoliveira.workers.dev
 */
export async function fetchNearbyBusStops(
  lat: number,
  lon: number,
  radiusMeters: number = 900
): Promise<TransitStop[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(
      `https://gtfs-api.tiagoanoliveira.workers.dev/nearby/${lat}/${lon}/${radiusMeters}`,
      {
        headers: {
          Origin: 'https://stcp.tiagoanoliveira.pt',
          Referer: 'https://stcp.tiagoanoliveira.pt/',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const json = await response.json();
    const rawStops = json?.stops || (Array.isArray(json) ? json : []);
    if (!Array.isArray(rawStops)) return [];

    const mappedStops: TransitStop[] = rawStops.map((st: any) => {
      const rawCode = String(st.stop_code || st.stop_id || '').trim();
      const rawId = String(st.stop_id || st.stop_code || '').trim();
      const isStcp =
        st.operator_id === 'stcp' ||
        rawId.startsWith('stcp:') ||
        (!rawCode.includes(':') && /^[A-Z0-9]+$/i.test(rawCode));

      return {
        id: rawId,
        code: rawCode.replace(/^stcp:/i, ''),
        name: st.stop_name || 'Paragem de Autocarro',
        latitude: Number(st.stop_lat || st.latitude),
        longitude: Number(st.stop_lon || st.longitude),
        operator: isStcp ? 'stcp' : 'unir',
        distanceMeters: st.distance_m ? Math.round(Number(st.distance_m)) : undefined,
      };
    });

    // Desduplicação Espacial Inteligente:
    // Prioriza registos STCP (com chegadas em tempo real) sobre códigos UNIR no mesmo local físico.
    mappedStops.sort((a, b) => {
      const aIsStcp = a.operator === 'stcp' && !a.code.includes(':') ? 1 : 0;
      const bIsStcp = b.operator === 'stcp' && !b.code.includes(':') ? 1 : 0;
      return bIsStcp - aIsStcp;
    });

    const deduplicated: TransitStop[] = [];
    const seenCodes = new Set<string>();

    for (const stop of mappedStops) {
      if (isNaN(stop.latitude) || isNaN(stop.longitude)) continue;

      const cleanCode = stop.code.toUpperCase();
      if (seenCodes.has(cleanCode)) continue;

      // Verificar se já existe uma paragem muito próxima (< 28 metros)
      const isDuplicate = deduplicated.some((existing) => {
        const dist = calculateDistanceMeters(
          existing.latitude,
          existing.longitude,
          stop.latitude,
          stop.longitude
        );
        return dist < 28;
      });

      if (!isDuplicate) {
        seenCodes.add(cleanCode);
        deduplicated.push(stop);
      }
    }

    return deduplicated;
  } catch (err) {
    console.warn(`Falha ao pesquisar paragens próximas (${lat}, ${lon}):`, err);
    return [];
  }
}
