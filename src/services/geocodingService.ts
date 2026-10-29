import { SAFE_PLACES_PORTUGAL } from '../data/safePlaces';
import { calculateDistanceMeters } from '../utils/geo';
import { findMatchingRoads } from '../data/estradasPortugal';

export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  type: 'police' | 'pharmacy' | 'street' | 'place' | 'address' | 'school' | 'heritage' | 'road' | 'wheelmap';
  houseNumber?: string;
  streetName?: string;
  postcode?: string;
  distanceMeters?: number;
  roadClassification?: 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';
  roadRef?: string;
}

function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const SECURITY_KEYWORDS = [
  'farmacia',
  'farmacias',
  'policia',
  'psp',
  'gnr',
  'pj',
  'esquadra',
  'posto policial',
  'posto gnr',
  'hospital',
  'hospitais',
  'urgencia',
  'urgencias',
  'centro de saude',
  'acessivel',
  'acessibilidade',
  'wheelchair',
  'wheelmap',
];

/**
 * Calcula a pontuação de relevância de cada sugestão (estilo Google Maps e Waze).
 * Dá prioridade a endereços com número de porta, ruas e vias principais,
 * e só prioriza farmácias/esquadras/hospitais se o utilizador manifestar intenção explícita.
 */
function calculateSuggestionScore(
  item: AddressSuggestion,
  normQuery: string,
  isSecurityIntent: boolean,
  hasHouseNumber: boolean
): number {
  let score = 0;
  const normTitle = normalizeStr(item.title);
  const normSubtitle = normalizeStr(item.subtitle);

  // 1. Relevância Textual
  if (normTitle === normQuery) {
    score += 1200; // Correspondência total exata
  } else if (normTitle.startsWith(normQuery)) {
    score += 800; // O título começa pelo termo pesquisado
  } else if (normTitle.includes(normQuery)) {
    score += 550; // O título contém o termo pesquisado
  } else if (normSubtitle.includes(normQuery)) {
    score += 180; // O termo surge na localidade / concelho
  } else {
    // Correspondência por tokens
    const queryTokens = normQuery.split(/\s+/).filter(Boolean);
    const matchedTokens = queryTokens.filter((token) => normTitle.includes(token) || normSubtitle.includes(token));
    score += matchedTokens.length * 100;
  }

  // 2. Hierarquia de Tipos (Estilo Google Maps / Waze)
  switch (item.type) {
    case 'address':
      // Se a pesquisa tinha número de porta, a morada exata ganha o topo absoluto
      score += hasHouseNumber ? 500 : 350;
      break;
    case 'street':
      score += 400; // Ruas, avenidas, praças
      break;
    case 'road':
      score += 370; // Autoestradas, vias rápidas e estradas nacionais
      break;
    case 'place':
      score += 280; // Cidades, vilas, freguesias e bairros
      break;
    case 'school':
    case 'heritage':
      score += 200; // POIs e equipamentos públicos
      break;
    case 'pharmacy':
    case 'police':
    case 'wheelmap':
      if (isSecurityIntent) {
        score += 750; // Prioridade máxima quando o utilizador pede farmácia/polícia/hospital
      } else {
        score += 40; // Baixa prioridade em pesquisas normais de ruas/endereços
      }
      break;
    default:
      score += 120;
      break;
  }

  // 3. Proximidade Suave (Proximity Bias)
  // Desempata localidades próximas sem esmagar o nome da rua ou morada
  if (typeof item.distanceMeters === 'number') {
    const km = item.distanceMeters / 1000;
    if (km < 5) {
      score += Math.round((5 - km) * 15); // Até +75 pontos para menos de 5 km
    } else {
      const penalty = Math.min(120, Math.round((km - 5) * 2)); // Máximo 120 pontos de penalização
      score -= penalty;
    }
  }

  return score;
}

/**
 * Searches destinations with instant local database match and real-time
 * OSM Photon / Nominatim geocoding with proximity bias.
 */
export async function searchAddressSuggestions(
  query: string,
  userLocation?: { latitude: number; longitude: number } | null
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const normQuery = normalizeStr(trimmed);
  const isSecurityIntent = SECURITY_KEYWORDS.some((kw) => normQuery.includes(kw));
  const hasHouseNumber = /\b\d{1,4}[a-z]?\b/i.test(trimmed);

  const candidates: (AddressSuggestion & { score?: number })[] = [];
  const seenKeys = new Set<string>();

  const addCandidate = (item: AddressSuggestion) => {
    // Chave de desduplicação por rua + número + concelho para não duplicar vias no OSM
    const streetNorm = normalizeStr(item.streetName || item.title);
    const houseNorm = normalizeStr(item.houseNumber || '');
    const subNorm = normalizeStr(item.subtitle);

    const dedupKey =
      item.type === 'address'
        ? `addr:${streetNorm}:${houseNorm}:${subNorm}`
        : item.type === 'street' || item.type === 'road'
        ? `street:${streetNorm}:${subNorm}`
        : item.type === 'place'
        ? `place:${streetNorm}:${subNorm}`
        : `${item.type}:${streetNorm}:${subNorm}`;

    if (seenKeys.has(dedupKey)) {
      return;
    }

    // Se já existir um item com o mesmo título a menos de 400 metros, evitar duplicado técnico de segmento
    const isNearbyDuplicate = candidates.some(
      (c) =>
        normalizeStr(c.title) === normalizeStr(item.title) &&
        Math.abs(c.latitude - item.latitude) < 0.0035 &&
        Math.abs(c.longitude - item.longitude) < 0.0035
    );

    if (isNearbyDuplicate) {
      return;
    }

    seenKeys.add(dedupKey);
    candidates.push(item);
  };

  // 1. Catálogo Local de Locais Seguros:
  // Se houver intenção explícita de segurança/farmácia/hospital, pesquisa por nome e morada.
  // Se for uma pesquisa normal de rua/endereço, pesquisa estritamente pelo nome do estabelecimento (para nunca sobrepor farmácias a ruas).
  let localMatches = SAFE_PLACES_PORTUGAL.filter((place) => {
    const matchName = normalizeStr(place.name).includes(normQuery);
    if (isSecurityIntent) {
      const matchAddr = normalizeStr(place.address || '').includes(normQuery);
      const matchCity = normalizeStr(place.city || '').includes(normQuery);
      return matchName || matchAddr || matchCity;
    }
    return matchName;
  });

  if (userLocation) {
    localMatches = [...localMatches].sort((a, b) => {
      const distA = calculateDistanceMeters(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
      const distB = calculateDistanceMeters(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
      return distA - distB;
    });
  }

  // Em pesquisas normais, limita a 1 ou 2 estabelecimentos no máximo para deixar espaço às vias e moradas
  const maxLocal = isSecurityIntent ? 5 : 2;
  for (const p of localMatches.slice(0, maxLocal)) {
    const dist = userLocation
      ? calculateDistanceMeters(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude)
      : undefined;

    addCandidate({
      id: `local-${p.id}`,
      title: p.name,
      subtitle: `${p.address ? p.address + ', ' : ''}${p.city || 'Portugal'}`,
      latitude: p.latitude,
      longitude: p.longitude,
      type: p.type === 'pharmacy' ? 'pharmacy' : p.type === 'wheelmap' ? 'wheelmap' : 'police',
      distanceMeters: dist,
    });
  }

  // 1b. Rede Rodoviária Nacional (Autoestradas, Vias Rápidas, Estradas Nacionais)
  const roadMatches = findMatchingRoads(trimmed);
  for (const road of roadMatches.slice(0, 3)) {
    const dist = userLocation
      ? calculateDistanceMeters(userLocation.latitude, userLocation.longitude, road.latitude, road.longitude)
      : undefined;

    addCandidate({
      id: `road-${road.code}`,
      title: `${road.ref} · ${road.name}`,
      subtitle: `${road.categoryLabel} · ${road.startLocation} ➔ ${road.endLocation}`,
      latitude: road.latitude,
      longitude: road.longitude,
      type: 'road',
      distanceMeters: dist,
      roadClassification: road.type,
      roadRef: road.ref,
    });
  }

  // 2. Geocodificação em Tempo Real no Photon (Komoot / OpenStreetMap) com Proximity Bias
  try {
    const biasLat = userLocation?.latitude ?? 41.1579;
    const biasLon = userLocation?.longitude ?? -8.6291;

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed
    )}&limit=15&lang=default&lat=${biasLat}&lon=${biasLon}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(photonUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SentinelaMobileSafety/2.0',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.features)) {
        for (const feat of data.features) {
          const props = feat.properties || {};
          const geom = feat.geometry || {};
          const coords = geom.coordinates;

          if (!coords || coords.length < 2) continue;
          const lon = coords[0];
          const lat = coords[1];

          const isRoad =
            props.osm_key === 'highway' &&
            (props.osm_value === 'motorway' ||
              props.osm_value === 'trunk' ||
              props.osm_value === 'primary' ||
              props.osm_value === 'secondary' ||
              props.osm_value === 'tertiary');
          const roadClassification = isRoad ? (props.osm_value as any) : undefined;
          const roadRef = props.ref;

          const isAddress = !!props.housenumber;
          let title = '';
          if (isRoad && props.ref) {
            title = `${props.ref}${props.name && props.name !== props.ref ? ' · ' + props.name : ''}`;
          } else if (props.housenumber && props.street) {
            title = `${props.street}, n.º ${props.housenumber}`;
          } else if (props.name && props.street && props.name !== props.street) {
            title = `${props.name} · ${props.street}${props.housenumber ? ', n.º ' + props.housenumber : ''}`;
          } else {
            title = props.name || props.street || trimmed;
          }

          const parts: (string | undefined)[] = [];
          if (isRoad) {
            const roadBadge =
              props.osm_value === 'motorway'
                ? 'Autoestrada (PRN 2000)'
                : props.osm_value === 'trunk'
                ? 'Via Rápida (IP/IC)'
                : props.osm_value === 'primary'
                ? 'Estrada Nacional (EN)'
                : props.osm_value === 'secondary'
                ? 'Estrada Regional (ER)'
                : 'Estrada Municipal (EM)';
            parts.push(roadBadge);
          }
          parts.push(
            props.locality || props.district,
            props.city || props.town || props.county,
            props.postcode
          );

          const uniqueParts = Array.from(new Set(parts.filter((p) => p && typeof p === 'string')));
          const subtitle = uniqueParts.length > 0 ? uniqueParts.join(' · ') : 'Portugal';

          const dist = userLocation
            ? calculateDistanceMeters(userLocation.latitude, userLocation.longitude, lat, lon)
            : undefined;

          addCandidate({
            id: `photon-${props.osm_id || Math.random()}`,
            title,
            subtitle,
            latitude: lat,
            longitude: lon,
            type:
              isRoad
                ? 'road'
                : props.wheelchair || props.osm_key === 'wheelchair'
                ? 'wheelmap'
                : props.osm_key === 'historic' || props.osm_key === 'heritage'
                ? 'heritage'
                : props.osm_key === 'amenity' &&
                  (props.osm_value === 'school' || props.osm_value === 'university' || props.osm_value === 'college')
                ? 'school'
                : isAddress
                ? 'address'
                : props.osm_key === 'highway'
                ? 'street'
                : 'place',
            houseNumber: props.housenumber,
            streetName: props.street,
            postcode: props.postcode,
            distanceMeters: dist,
            roadClassification,
            roadRef,
          });
        }
      }
    }
  } catch (error) {
    console.warn('Erro ao consultar Photon:', error);
  }

  // 3. Fallback / Enriquecimento via Nominatim OpenStreetMap (especialmente se houver número de porta)
  if (candidates.length < 5 || hasHouseNumber) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pt&addressdetails=1&limit=6&q=${encodeURIComponent(
        trimmed
      )}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const nomRes = await fetch(nomUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SentinelaMobileSafety/2.0',
          'Accept-Language': 'pt-PT,pt;q=0.9',
        },
      });
      clearTimeout(timeout);

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData)) {
          for (const item of nomData) {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);

            const addr = item.address || {};
            const isAddress = !!addr.house_number;
            const streetName = addr.road || addr.pedestrian || addr.street || '';
            const title =
              isAddress && streetName
                ? `${streetName}, n.º ${addr.house_number}`
                : streetName || item.display_name.split(',')[0];

            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.suburb ||
              'Portugal';

            const subParts = [city, addr.postcode].filter(Boolean);
            const subtitle = subParts.length > 0 ? subParts.join(' · ') : 'Portugal';

            const dist = userLocation
              ? calculateDistanceMeters(userLocation.latitude, userLocation.longitude, lat, lon)
              : undefined;

            addCandidate({
              id: `nom-${item.place_id || item.osm_id}`,
              title: title.trim(),
              subtitle,
              latitude: lat,
              longitude: lon,
              type: isAddress ? 'address' : 'street',
              houseNumber: addr.house_number,
              streetName: streetName || undefined,
              postcode: addr.postcode,
              distanceMeters: dist,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Ordenação por Relevância Ponderada (Estilo Google Maps e Waze)
  const scoredResults = candidates.map((item) => ({
    ...item,
    score: calculateSuggestionScore(item, normQuery, isSecurityIntent, hasHouseNumber),
  }));

  scoredResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return scoredResults.slice(0, 8);
}

export interface ReverseGeocodeResult {
  title: string;
  subtitle: string;
  street?: string;
  houseNumber?: string;
  postcode?: string;
  city?: string;
  fullAddress?: string;
}

/**
 * Reverse geocodes a coordinate to find place, street, or POI name (Google Maps style),
 * with exact house numbers from official INE / OpenStreetMap Portugal imports.
 */
export async function reverseGeocodeCoordinate(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  // First check if this coordinate is right next to a known safe place (< 40m)
  for (const p of SAFE_PLACES_PORTUGAL) {
    const d = calculateDistanceMeters(latitude, longitude, p.latitude, p.longitude);
    if (d <= 40) {
      return {
        title: p.name,
        subtitle: `${p.address ? p.address + ', ' : ''}${p.city || 'Portugal'}`,
        street: p.address,
        city: p.city,
        fullAddress: `${p.name}, ${p.address}, ${p.city}`,
      };
    }
  }

  // Real-time reverse geocode from Nominatim / OpenStreetMap at door level (zoom 19)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=19&addressdetails=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SentinelaMobileSafety/2.0',
        'Accept-Language': 'pt-PT,pt;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const street = addr.road || addr.pedestrian || addr.street || addr.footway || '';
      const houseNumber = addr.house_number || '';
      const postcode = addr.postcode || '';
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.village ||
        addr.town ||
        addr.city ||
        addr.municipality ||
        '';

      // 1. Prioritize official street and door number from INE / OSM import
      let title = '';
      if (street && houseNumber) {
        title = `${street}, n.º ${houseNumber}`;
      } else if (data.name && data.name !== street) {
        title = street && houseNumber ? `${data.name} · ${street}, n.º ${houseNumber}` : data.name;
      } else if (street) {
        title = street;
      } else {
        title =
          addr.supermarket ||
          addr.shop ||
          addr.amenity ||
          addr.building ||
          'Ponto Selecionado';
      }

      // 2. Build informative subtitle with locality and postcode
      const parts = [locality, postcode].filter(Boolean);
      const subtitle = parts.length > 0 ? parts.join(' · ') : 'Portugal';

      const fullAddress = [
        street ? `${street}${houseNumber ? ', n.º ' + houseNumber : ''}` : null,
        locality,
        postcode,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        title: title.trim(),
        subtitle,
        street: street || undefined,
        houseNumber: houseNumber || undefined,
        postcode: postcode || undefined,
        city: locality || undefined,
        fullAddress,
      };
    }
  } catch (err) {
    console.warn('Erro ao obter reverse geocode:', err);
  }

  return {
    title: 'Ponto Selecionado',
    subtitle: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
  };
}
