import {
  PedestrianRoute,
  RouteCoordinate,
  RouteStep,
  TransitLegInfo,
  StopArrivalPrediction,
} from '../types/navigation';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import {
  decodeGooglePolyline,
  fetchStopRealtimeArrivals,
} from './stcpRealtimeService';
import {
  formatDuration,
  calculateEstimatedArrival,
  fetchRouteMultiEngine,
} from './routingService';

const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAauiNB51SJ4QdfHGGoTB87sJZ-DVsozjk';

// Coordenadas centrais de referência geográfica
const PORTO_CENTER: RouteCoordinate = { latitude: 41.1579, longitude: -8.6291 };
const LISBOA_CENTER: RouteCoordinate = { latitude: 38.7223, longitude: -9.1393 };

/**
 * Mapeia os tipos de veículo da Google Routes / Directions API para o formato unificado do Sentinela
 */
function normalizeGoogleVehicleType(
  rawType?: string
): TransitLegInfo['vehicleType'] {
  if (!rawType) return 'bus';
  const t = rawType.toUpperCase();
  if (t.includes('SUBWAY') || t.includes('METRO') || t.includes('UNDERGROUND')) {
    return 'subway';
  }
  if (
    t.includes('TRAIN') ||
    t.includes('HEAVY_RAIL') ||
    t.includes('COMMUTER_TRAIN') ||
    t.includes('RAIL')
  ) {
    return 'train';
  }
  if (t.includes('TRAM') || t.includes('LIGHT_RAIL')) {
    return 'tram';
  }
  if (t.includes('FERRY') || t.includes('BOAT')) {
    return 'ferry';
  }
  if (t.includes('CABLE_CAR') || t.includes('FUNICULAR') || t.includes('GONDOLA')) {
    return 'funicular';
  }
  return 'bus';
}

/**
 * Converte um itinerário individual do OpenTripPlanner em PedestrianRoute,
 * identificando transbordos, paragens de troca de veículo e caminhos pedonais reais.
 */
async function convertOtpItinerary(
  itinerary: any,
  itinIndex: number,
  origin: RouteCoordinate,
  destination: RouteCoordinate
): Promise<PedestrianRoute | null> {
  if (!itinerary || !Array.isArray(itinerary.legs) || itinerary.legs.length === 0) {
    return null;
  }

  const durationSeconds = Math.round(Number(itinerary.duration || 0));
  let totalDistanceMeters = 0;
  let accumulatedDurationSeconds = 0;
  let additionalWaitMinutes = 0;
  const allCoords: RouteCoordinate[] = [];
  const steps: RouteStep[] = [];
  const transitLines: string[] = [];
  let transitLegsCount = 0;

  for (let index = 0; index < itinerary.legs.length; index++) {
    const leg = itinerary.legs[index];
    const legDist = Math.round(Number(leg.distance || 0));
    totalDistanceMeters += legDist;
    const legDurSec = Math.round(Number(leg.duration || 0));
    accumulatedDurationSeconds += legDurSec;

    let legCoords: RouteCoordinate[] = leg.legGeometry?.points
      ? decodeGooglePolyline(leg.legGeometry.points)
      : leg.from && leg.to
      ? [
          { latitude: leg.from.lat, longitude: leg.from.lon },
          { latitude: leg.to.lat, longitude: leg.to.lon },
        ]
      : [];

    const rawMode = String(leg.mode || '').toUpperCase();
    const fromName =
      leg.from?.name === 'Origin' ? 'Ponto de Partida' : leg.from?.name || 'Paragem';
    const toName =
      leg.to?.name === 'Destination' ? 'Destino Final' : leg.to?.name || 'Paragem seguinte';

    const fromCoord = leg.from ? { latitude: leg.from.lat, longitude: leg.from.lon } : undefined;
    const toCoord = leg.to ? { latitude: leg.to.lat, longitude: leg.to.lon } : undefined;

    // Detetar se há um troço de transporte subsequente após este passo (transbordo)
    const subsequentTransitLegs = itinerary.legs
      .slice(index + 1)
      .filter((l: any) => String(l.mode || '').toUpperCase() !== 'WALK');
    const hasNextTransit = subsequentTransitLegs.length > 0;
    const nextTransitLeg = subsequentTransitLegs[0];
    const nextRawMode = String(nextTransitLeg?.mode || '').toUpperCase();
    const nextLineShort = nextTransitLeg?.route?.shortName || nextTransitLeg?.route?.longName || '';
    const nextLineLabel =
      nextRawMode === 'SUBWAY' || nextRawMode === 'TRAM'
        ? `Metro Linha ${nextLineShort}`.trim()
        : nextRawMode === 'RAIL'
        ? `Comboio CP ${nextLineShort}`.trim()
        : `Autocarro ${nextLineShort}`.trim();

    // Garantir que os troços a pé seguem a geometria real das ruas pedonais
    if (rawMode === 'WALK' && fromCoord && toCoord) {
      if (legCoords.length <= 2 && legDist > 20) {
        try {
          const streetWalk = await fetchRouteMultiEngine([fromCoord, toCoord], 'walking');
          if (streetWalk && streetWalk.coordinates && streetWalk.coordinates.length > 2) {
            legCoords = streetWalk.coordinates;
          }
        } catch {}
      }
    }

    allCoords.push(...legCoords);

    if (rawMode === 'WALK') {
      const isTransferWalk = index > 0 && hasNextTransit;
      const instruction =
        index === 0
          ? `Caminhe a pé até à paragem ${toName} (${formatDistance(legDist)})`
          : index === itinerary.legs.length - 1
          ? `Caminhe de ${fromName} até ao ${toName} (${formatDistance(legDist)})`
          : isTransferWalk
          ? `Transbordo: caminhe até ${toName} para apanhar ${nextLineLabel} (${formatDistance(legDist)})`
          : `Transbordo a pé para ${toName} (${formatDistance(legDist)})`;

      steps.push({
        instruction,
        distanceMeters: legDist,
        durationSeconds: legDurSec,
        maneuverType: 'walk',
        streetName: toName,
        location: fromCoord,
        fromLocation: fromCoord,
        toLocation: toCoord,
        coordinates: legCoords,
        isTransfer: isTransferWalk,
        transferStopName: isTransferWalk ? toName : undefined,
        transferToLine: isTransferWalk ? nextLineLabel : undefined,
        transferInstruction: isTransferWalk
          ? `Transbordo a pé para ${nextLineLabel}`
          : undefined,
      });
    } else {
      transitLegsCount++;
      let vehicleType: TransitLegInfo['vehicleType'] = 'bus';
      let lineLabel = leg.route?.shortName || leg.route?.longName || 'Linha';

      if (rawMode === 'SUBWAY' || rawMode === 'TRAM') {
        vehicleType = 'subway';
        lineLabel = `Metro ${leg.route?.shortName || ''}`.trim();
      } else if (rawMode === 'RAIL') {
        vehicleType = 'train';
        lineLabel = `Comboio CP ${leg.route?.shortName || ''}`.trim();
      } else {
        vehicleType = 'bus';
        lineLabel = `Autocarro ${leg.route?.shortName || ''}`.trim();
      }

      const headsignSuffix = leg.headsign ? ` (sentido ${leg.headsign})` : '';
      const depStopCode =
        leg.from?.stop?.code ||
        String(leg.from?.stop?.gtfsId || '')
          .replace(/^stcp:/i, '')
          .replace(/^2:/i, '');
      const arrStopCode =
        leg.to?.stop?.code ||
        String(leg.to?.stop?.gtfsId || '')
          .replace(/^stcp:/i, '')
          .replace(/^2:/i, '');

      // Consultar chegadas em tempo real da paragem de partida
      let realtimeArrivalMinutes: number | undefined;
      let delayMinutes: number | undefined;
      let realtimeStatus: string | undefined;
      let waitingMinutes: number | undefined;
      let liveArrivals: StopArrivalPrediction[] = [];

      if (depStopCode) {
        liveArrivals = await fetchStopRealtimeArrivals(depStopCode);
        if (liveArrivals.length > 0) {
          const shortNameClean = String(leg.route?.shortName || '').toUpperCase();
          const matched =
            liveArrivals.find(
              (a) => a.routeShortName.toUpperCase() === shortNameClean
            ) || liveArrivals[0];

          if (matched) {
            realtimeArrivalMinutes = matched.arrivalMinutes;
            delayMinutes = matched.delayMinutes;
            realtimeStatus = matched.status;

            const walkTimeToStopMinutes =
              index > 0 && itinerary.legs[index - 1].mode === 'WALK'
                ? Math.round(Number(itinerary.legs[index - 1].duration || 0) / 60)
                : 0;

            waitingMinutes = Math.max(0, realtimeArrivalMinutes - walkTimeToStopMinutes);
            if (waitingMinutes > 0) {
              additionalWaitMinutes += waitingMinutes;
            }
          }
        }
      }

      const isTransferTransit = hasNextTransit;
      let instruction = `Apanhe o ${lineLabel}${headsignSuffix} em ${fromName} e saia em ${toName}`;
      if (isTransferTransit) {
        instruction = `Apanhe o ${lineLabel}${headsignSuffix} em ${fromName} e faça transbordo em ${toName} para ${nextLineLabel}`;
      }
      if (realtimeArrivalMinutes !== undefined) {
        const waitTxt =
          waitingMinutes !== undefined && waitingMinutes > 0
            ? ` • Chega em ${realtimeArrivalMinutes} min (espera: ~${waitingMinutes} min)`
            : ` • Chega em ${realtimeArrivalMinutes} min`;
        instruction = `${instruction}${waitTxt}`;
      }

      const transitInfo: TransitLegInfo = {
        lineName: leg.route?.longName || leg.route?.shortName || lineLabel,
        lineShortName: leg.route?.shortName || lineLabel,
        headsign: leg.headsign || undefined,
        vehicleType,
        operator:
          leg.agency?.name ||
          (vehicleType === 'subway'
            ? 'Metro do Porto'
            : vehicleType === 'train'
            ? 'CP'
            : 'STCP'),
        departureStop: fromName,
        departureStopCode: depStopCode || undefined,
        arrivalStop: toName,
        arrivalStopCode: arrStopCode || undefined,
        color: leg.route?.color ? `#${leg.route.color}` : vehicleType === 'subway' ? '#0284C7' : '#0891B2',
        textColor: leg.route?.textColor ? `#${leg.route.textColor}` : '#FFFFFF',
        waitingMinutes,
        realtimeArrivalMinutes,
        delayMinutes,
        realtimeStatus,
        upcomingArrivals: liveArrivals.length > 0 ? liveArrivals : undefined,
      };

      if (transitInfo.lineShortName && !transitLines.includes(transitInfo.lineShortName)) {
        transitLines.push(transitInfo.lineShortName);
      }

      steps.push({
        instruction,
        distanceMeters: legDist,
        durationSeconds: legDurSec,
        maneuverType: 'transit',
        streetName: lineLabel,
        location: fromCoord,
        fromLocation: fromCoord,
        toLocation: toCoord,
        coordinates: legCoords,
        transitInfo,
        isTransfer: isTransferTransit,
        transferStopName: isTransferTransit ? toName : undefined,
        transferToLine: isTransferTransit ? nextLineLabel : undefined,
        transferInstruction: isTransferTransit
          ? `Transbordo em ${toName}: saia e apanhe ${nextLineLabel}`
          : undefined,
      });
    }
  }

  if (allCoords.length === 0) {
    allCoords.push(origin, destination);
  }

  const durationMinutes =
    Math.max(1, Math.round(accumulatedDurationSeconds / 60)) + additionalWaitMinutes;

  const summaryText =
    transitLines.length > 0
      ? `${transitLines.join(' ➔ ')} · ~${formatDuration(durationMinutes)}`
      : `Transportes Públicos · ~${formatDuration(durationMinutes)}`;

  const routeName =
    itinIndex === 0
      ? 'Transportes Públicos (Mais Rápido)'
      : transitLegsCount <= 1
      ? `Opção Direta · ${transitLines.join(' ➔ ') || 'Sem transbordo'}`
      : `Opção Alternativa · ${transitLines.join(' ➔ ')}`;

  return {
    id: `transit-otp-${itinIndex}-${Date.now()}`,
    name: routeName,
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
    summary: summaryText,
    transitLegsCount,
    transitLines,
  };
}

/**
 * Consulta a API GraphQL de OpenTripPlanner (Porto Digital)
 * Cobre com elevada precisão o Grande Porto (STCP, Metro do Porto e conexões urbanas)
 * Retorna múltiplas opções de itinerário (até 3 opções)
 */
async function fetchPortoOtpTransitRoutes(
  origin: RouteCoordinate,
  destination: RouteCoordinate
): Promise<PedestrianRoute[]> {
  try {
    const query = `{
      plan(
        from: { lat: ${origin.latitude}, lon: ${origin.longitude} }
        to: { lat: ${destination.latitude}, lon: ${destination.longitude} }
        numItineraries: 3
      ) {
        itineraries {
          duration
          startTime
          endTime
          legs {
            mode
            duration
            distance
            headsign
            legGeometry { points }
            from {
              name
              lat
              lon
              stop {
                gtfsId
                code
                name
              }
            }
            to {
              name
              lat
              lon
              stop {
                gtfsId
                code
                name
              }
            }
            route { shortName longName color textColor }
            agency { name }
          }
        }
      }
    }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500);

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
      return [];
    }

    const json = await response.json();
    const itineraries: any[] = json?.data?.plan?.itineraries || [];

    if (!Array.isArray(itineraries) || itineraries.length === 0) {
      return [];
    }

    const routes: PedestrianRoute[] = [];
    for (let i = 0; i < itineraries.length; i++) {
      const r = await convertOtpItinerary(itineraries[i], i, origin, destination);
      if (r) {
        routes.push(r);
      }
    }

    return routes;
  } catch (err) {
    console.warn('Falha na consulta ao OpenTripPlanner Porto:', err);
    return [];
  }
}

/**
 * Consulta a Google Routes API v2 (ou fallback para Directions API clássica)
 * Cobre Lisboa (Metro, Carris, Carris Metropolitana, Fertagus, Transtejo), CP Nacional e todo o país
 * Retorna até 3 alternativas de itinerário
 */
async function fetchGoogleTransitRoutes(
  origin: RouteCoordinate,
  destination: RouteCoordinate
): Promise<PedestrianRoute[]> {
  if (!GOOGLE_API_KEY) {
    return [];
  }

  // 1. Tentativa via Google Routes API v2 (moderna com FieldMask e alternativas)
  try {
    const v2Url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const body = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: 'TRANSIT',
      languageCode: 'pt-PT',
      computeAlternativeRoutes: true,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500);

    const res = await fetch(v2Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawRoutes: any[] = data?.routes || [];

      if (rawRoutes.length > 0) {
        const parsedRoutes: PedestrianRoute[] = [];

        rawRoutes.forEach((route: any, rIdx: number) => {
          const leg = route?.legs?.[0];
          if (!leg || !Array.isArray(leg.steps) || leg.steps.length === 0) return;

          const durationSeconds = parseInt(String(route.duration || '0').replace('s', ''), 10) || 0;
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          const totalDistanceMeters = route.distanceMeters || 0;

          const allCoords: RouteCoordinate[] = [];
          const steps: RouteStep[] = [];
          const transitLines: string[] = [];
          let transitLegsCount = 0;

          if (route.polyline?.encodedPolyline) {
            allCoords.push(...decodeGooglePolyline(route.polyline.encodedPolyline));
          }

          leg.steps.forEach((st: any, sIdx: number) => {
            const stepDist = st.distanceMeters || 0;
            const stepDurSec = parseInt(String(st.staticDuration || '0').replace('s', ''), 10) || 0;
            const travelMode = String(st.travelMode || '').toUpperCase();

            if (st.polyline?.encodedPolyline && allCoords.length === 0) {
              allCoords.push(...decodeGooglePolyline(st.polyline.encodedPolyline));
            }

            const startCoord = st.startLocation?.latLng
              ? {
                  latitude: st.startLocation.latLng.latitude,
                  longitude: st.startLocation.latLng.longitude,
                }
              : undefined;
            const endCoord = st.endLocation?.latLng
              ? {
                  latitude: st.endLocation.latLng.latitude,
                  longitude: st.endLocation.latLng.longitude,
                }
              : undefined;
            const stepCoords = st.polyline?.encodedPolyline
              ? decodeGooglePolyline(st.polyline.encodedPolyline)
              : startCoord && endCoord
              ? [startCoord, endCoord]
              : [];

            // Verificar se há troços de transportes públicos à frente (transbordo)
            const remainingTransit = leg.steps
              .slice(sIdx + 1)
              .filter((s: any) => String(s.travelMode || '').toUpperCase() === 'TRANSIT');
            const hasNextTransit = remainingTransit.length > 0;
            const nextTransitStep = remainingTransit[0];
            const nextLineShort =
              nextTransitStep?.transitDetails?.transitLine?.nameShort ||
              nextTransitStep?.transitDetails?.transitLine?.name ||
              'próximo transporte';

            if (travelMode === 'TRANSIT' && st.transitDetails) {
              transitLegsCount++;
              const td = st.transitDetails;
              const line = td.transitLine || {};
              const stopDetails = td.stopDetails || {};
              const departureStop = stopDetails.departureStop?.name || 'Paragem de Partida';
              const arrivalStop = stopDetails.arrivalStop?.name || 'Paragem de Destino';
              const vehicleType = normalizeGoogleVehicleType(line.vehicle?.type);
              const lineShortName = line.nameShort || line.name || 'Transporte';
              const headsign = td.headsign ? ` (sentido ${td.headsign})` : '';
              const stopsCountInfo = td.stopCount ? ` · ${td.stopCount} paragens` : '';

              const isTrainMode = vehicleType === 'train';
              const isTransferTransit = hasNextTransit;
              let instruction = isTrainMode
                ? `Apanhe Comboio CP ${lineShortName}${headsign} na estação ${departureStop} e saia em ${arrivalStop}${stopsCountInfo}`
                : `Apanhe ${lineShortName}${headsign} em ${departureStop} e saia em ${arrivalStop}${stopsCountInfo}`;

              if (isTransferTransit) {
                instruction = isTrainMode
                  ? `Apanhe Comboio CP ${lineShortName}${headsign} na estação ${departureStop} e faça transbordo em ${arrivalStop} para ${nextLineShort}`
                  : `Apanhe ${lineShortName}${headsign} em ${departureStop} e faça transbordo em ${arrivalStop} para ${nextLineShort}`;
              }

              const transitInfo: TransitLegInfo = {
                lineName: line.name || lineShortName,
                lineShortName,
                headsign: td.headsign,
                vehicleType,
                operator: line.agencies?.[0]?.name,
                departureStop,
                arrivalStop,
                numStops: td.stopCount,
                color: line.color ? (line.color.startsWith('#') ? line.color : `#${line.color}`) : undefined,
                textColor: line.textColor ? (line.textColor.startsWith('#') ? line.textColor : `#${line.textColor}`) : undefined,
              };

              if (lineShortName && !transitLines.includes(lineShortName)) {
                transitLines.push(lineShortName);
              }

              steps.push({
                instruction,
                distanceMeters: stepDist,
                durationSeconds: stepDurSec,
                maneuverType: 'transit',
                streetName: lineShortName,
                location: startCoord,
                fromLocation: startCoord,
                toLocation: endCoord,
                coordinates: stepCoords,
                transitInfo,
                isTransfer: isTransferTransit,
                transferStopName: isTransferTransit ? arrivalStop : undefined,
                transferToLine: isTransferTransit ? nextLineShort : undefined,
                transferInstruction: isTransferTransit
                  ? `Transbordo em ${arrivalStop}: saia e apanhe ${nextLineShort}`
                  : undefined,
              });
            } else {
              const isTransferWalk = sIdx > 0 && hasNextTransit;
              let walkInstruction =
                st.navigationInstruction?.instructions ||
                (isTransferWalk
                  ? `Transbordo a pé para ${nextLineShort} (${formatDistance(stepDist)})`
                  : `Caminhe a pé (${formatDistance(stepDist)})`);

              steps.push({
                instruction: walkInstruction.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                distanceMeters: stepDist,
                durationSeconds: stepDurSec,
                maneuverType: 'walk',
                location: startCoord,
                fromLocation: startCoord,
                toLocation: endCoord,
                coordinates: stepCoords,
                isTransfer: isTransferWalk,
                transferStopName: isTransferWalk ? endCoord ? 'Paragem seguinte' : undefined : undefined,
                transferToLine: isTransferWalk ? nextLineShort : undefined,
                transferInstruction: isTransferWalk ? `Transbordo a pé para ${nextLineShort}` : undefined,
              });
            }
          });

          if (allCoords.length === 0) {
            allCoords.push(origin, destination);
          }

          const summaryText =
            transitLines.length > 0
              ? `${transitLines.join(' ➔ ')} · ~${formatDuration(durationMinutes)}`
              : `Transportes Públicos · ~${formatDuration(durationMinutes)}`;

          const routeName =
            rIdx === 0
              ? 'Transportes Públicos (Mais Rápido)'
              : transitLegsCount <= 1
              ? `Opção Direta · ${transitLines.join(' ➔ ') || 'Sem transbordo'}`
              : `Opção Alternativa · ${transitLines.join(' ➔ ')}`;

          parsedRoutes.push({
            id: `transit-google-v2-${rIdx}-${Date.now()}`,
            name: routeName,
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
            summary: summaryText,
            transitLegsCount,
            transitLines,
          });
        });

        if (parsedRoutes.length > 0) {
          return parsedRoutes;
        }
      }
    }
  } catch (err) {
    console.warn('Google Routes API v2 falhou:', err);
  }

  // 2. Fallback para Google Directions API clássica
  try {
    const classicUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=transit&alternatives=true&language=pt-PT&key=${GOOGLE_API_KEY}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500);

    const res = await fetch(classicUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'OK' && Array.isArray(data.routes) && data.routes.length > 0) {
        const parsedRoutes: PedestrianRoute[] = [];

        data.routes.forEach((route: any, rIdx: number) => {
          const leg = route.legs?.[0];
          if (!leg || !Array.isArray(leg.steps)) return;

          const durationMinutes = Math.max(1, Math.round((leg.duration?.value || 0) / 60));
          const totalDistanceMeters = leg.distance?.value || 0;

          const allCoords: RouteCoordinate[] = [];
          const steps: RouteStep[] = [];
          const transitLines: string[] = [];
          let transitLegsCount = 0;

          if (route.overview_polyline?.points) {
            allCoords.push(...decodeGooglePolyline(route.overview_polyline.points));
          }

          leg.steps.forEach((st: any, sIdx: number) => {
            const stepDist = st.distance?.value || 0;
            const stepDurSec = st.duration?.value || 0;
            const isTransit = st.travel_mode === 'TRANSIT';

            const startCoord = st.start_location
              ? { latitude: st.start_location.lat, longitude: st.start_location.lng }
              : undefined;
            const endCoord = st.end_location
              ? { latitude: st.end_location.lat, longitude: st.end_location.lng }
              : undefined;
            const stepCoords = st.polyline?.points
              ? decodeGooglePolyline(st.polyline.points)
              : startCoord && endCoord
              ? [startCoord, endCoord]
              : [];

            if (st.polyline?.points && allCoords.length === 0) {
              allCoords.push(...stepCoords);
            }

            const remainingTransit = leg.steps
              .slice(sIdx + 1)
              .filter((s: any) => s.travel_mode === 'TRANSIT');
            const hasNextTransit = remainingTransit.length > 0;
            const nextTransitStep = remainingTransit[0];
            const nextLineShort =
              nextTransitStep?.transit_details?.line?.short_name ||
              nextTransitStep?.transit_details?.line?.name ||
              'próximo transporte';

            if (isTransit && st.transit_details) {
              transitLegsCount++;
              const td = st.transit_details;
              const line = td.line || {};
              const vehicleType = normalizeGoogleVehicleType(line.vehicle?.type);
              const lineShortName = line.short_name || line.name || 'Transporte';
              const departureStop = td.departure_stop?.name || 'Paragem de Partida';
              const arrivalStop = td.arrival_stop?.name || 'Paragem de Destino';
              const headsign = td.headsign ? ` (sentido ${td.headsign})` : '';
              const stopsCountInfo = td.num_stops ? ` · ${td.num_stops} paragens` : '';

              const isTrainMode = vehicleType === 'train';
              const isTransferTransit = hasNextTransit;
              let instruction = isTrainMode
                ? `Apanhe Comboio CP ${lineShortName}${headsign} na estação ${departureStop} e saia em ${arrivalStop}${stopsCountInfo}`
                : `Apanhe ${lineShortName}${headsign} em ${departureStop} e saia em ${arrivalStop}${stopsCountInfo}`;

              if (isTransferTransit) {
                instruction = isTrainMode
                  ? `Apanhe Comboio CP ${lineShortName}${headsign} na estação ${departureStop} e faça transbordo em ${arrivalStop} para ${nextLineShort}`
                  : `Apanhe ${lineShortName}${headsign} em ${departureStop} e faça transbordo em ${arrivalStop} para ${nextLineShort}`;
              }

              const transitInfo: TransitLegInfo = {
                lineName: line.name || lineShortName,
                lineShortName,
                headsign: td.headsign,
                vehicleType,
                operator: line.agencies?.[0]?.name,
                departureStop,
                arrivalStop,
                numStops: td.num_stops,
                color: line.color ? (line.color.startsWith('#') ? line.color : `#${line.color}`) : undefined,
                textColor: line.text_color ? (line.text_color.startsWith('#') ? line.text_color : `#${line.text_color}`) : undefined,
              };

              if (lineShortName && !transitLines.includes(lineShortName)) {
                transitLines.push(lineShortName);
              }

              steps.push({
                instruction,
                distanceMeters: stepDist,
                durationSeconds: stepDurSec,
                maneuverType: 'transit',
                streetName: lineShortName,
                location: startCoord,
                fromLocation: startCoord,
                toLocation: endCoord,
                coordinates: stepCoords,
                transitInfo,
                isTransfer: isTransferTransit,
                transferStopName: isTransferTransit ? arrivalStop : undefined,
                transferToLine: isTransferTransit ? nextLineShort : undefined,
                transferInstruction: isTransferTransit
                  ? `Transbordo em ${arrivalStop}: saia e apanhe ${nextLineShort}`
                  : undefined,
              });
            } else {
              const isTransferWalk = sIdx > 0 && hasNextTransit;
              const cleanInstruction = (st.html_instructions || (isTransferWalk ? `Transbordo a pé para ${nextLineShort}` : `Caminhe a pé (${formatDistance(stepDist)})`))
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              steps.push({
                instruction: cleanInstruction,
                distanceMeters: stepDist,
                durationSeconds: stepDurSec,
                maneuverType: 'walk',
                location: startCoord,
                fromLocation: startCoord,
                toLocation: endCoord,
                coordinates: stepCoords,
                isTransfer: isTransferWalk,
                transferStopName: isTransferWalk ? nextTransitStep?.transit_details?.departure_stop?.name || 'Paragem seguinte' : undefined,
                transferToLine: isTransferWalk ? nextLineShort : undefined,
                transferInstruction: isTransferWalk ? `Transbordo a pé para ${nextLineShort}` : undefined,
              });
            }
          });

          if (allCoords.length === 0) {
            allCoords.push(origin, destination);
          }

          const summaryText =
            transitLines.length > 0
              ? `${transitLines.join(' ➔ ')} · ~${formatDuration(durationMinutes)}`
              : `Transportes Públicos · ~${formatDuration(durationMinutes)}`;

          const routeName =
            rIdx === 0
              ? 'Transportes Públicos (Mais Rápido)'
              : transitLegsCount <= 1
              ? `Opção Direta · ${transitLines.join(' ➔ ') || 'Sem transbordo'}`
              : `Opção Alternativa · ${transitLines.join(' ➔ ')}`;

          parsedRoutes.push({
            id: `transit-google-classic-${rIdx}-${Date.now()}`,
            name: routeName,
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
            summary: summaryText,
            transitLegsCount,
            transitLines,
          });
        });

        if (parsedRoutes.length > 0) {
          return parsedRoutes;
        }
      }
    }
  } catch (err) {
    console.warn('Google Directions API clássica falhou:', err);
  }

  return [];
}

/**
 * Motor Unificado de Navegação por Transportes Públicos
 * Retorna lista de opções de itinerários ordenadas por conveniência e rapidez (estilo Google Maps)
 */
export async function fetchUnifiedTransitRoutes(
  origin: RouteCoordinate,
  destination: RouteCoordinate
): Promise<PedestrianRoute[]> {
  const distOriginToPortoKm =
    calculateDistanceMeters(
      origin.latitude,
      origin.longitude,
      PORTO_CENTER.latitude,
      PORTO_CENTER.longitude
    ) / 1000;

  const distDestToPortoKm =
    calculateDistanceMeters(
      destination.latitude,
      destination.longitude,
      PORTO_CENTER.latitude,
      PORTO_CENTER.longitude
    ) / 1000;

  const isPortoRegion = distOriginToPortoKm < 45 && distDestToPortoKm < 45;

  // 1. Se estiver na Área Metropolitana do Porto, prioriza o OTP do Porto Digital
  if (isPortoRegion) {
    const portoRoutes = await fetchPortoOtpTransitRoutes(origin, destination);
    if (portoRoutes && portoRoutes.length > 0) {
      return portoRoutes;
    }
  }

  // 2. Consulta Google Routes / Directions API (Lisboa, Área Metropolitana, CP e restante país)
  const googleRoutes = await fetchGoogleTransitRoutes(origin, destination);
  if (googleRoutes && googleRoutes.length > 0) {
    return googleRoutes;
  }

  // 3. Fallback: se não estiver no Porto ou a Google falhar, tenta o OTP como salvaguarda
  if (!isPortoRegion) {
    const secondaryOtpRoutes = await fetchPortoOtpTransitRoutes(origin, destination);
    if (secondaryOtpRoutes && secondaryOtpRoutes.length > 0) {
      return secondaryOtpRoutes;
    }
  }

  return [];
}

export async function fetchUnifiedTransitRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate
): Promise<PedestrianRoute | null> {
  const routes = await fetchUnifiedTransitRoutes(origin, destination);
  return routes.length > 0 ? routes[0] : null;
}
