import { SafePlace, SafePlaceType, WheelchairAccessibility } from '../types';
import { parseOsmOpeningHours } from '../utils/pharmacySchedule';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

// In-memory cache by bounding box key to avoid redundant requests
const CACHED_REGIONS: Map<string, SafePlace[]> = new Map();

/**
 * Dynamically queries OpenStreetMap Overpass API for real police stations, pharmacies, and hospitals
 * in the user's visible map region (bounding box).
 */
export async function fetchOsmPlacesInBoundingBox(params: {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}): Promise<SafePlace[]> {
  const { minLat, minLon, maxLat, maxLon } = params;

  // Round key to ~1km grid
  const key = `${minLat.toFixed(2)},${minLon.toFixed(2)},${maxLat.toFixed(2)},${maxLon.toFixed(2)}`;
  if (CACHED_REGIONS.has(key)) {
    return CACHED_REGIONS.get(key)!;
  }

  const query = `[out:json][timeout:12];
(
  node["amenity"="police"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="pharmacy"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="hospital"](${minLat},${minLon},${maxLat},${maxLon});
  way["amenity"="hospital"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="school"](${minLat},${minLon},${maxLat},${maxLon});
  way["amenity"="school"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="university"](${minLat},${minLon},${maxLat},${maxLon});
  node["heritage"](${minLat},${minLon},${maxLat},${maxLon});
  way["heritage"](${minLat},${minLon},${maxLat},${maxLon});
  node["historic"="castle"](${minLat},${minLon},${maxLat},${maxLon});
  node["historic"="monument"](${minLat},${minLon},${maxLat},${maxLon});
  node["railway"="station"](${minLat},${minLon},${maxLat},${maxLon});
  node["station"="subway"](${minLat},${minLon},${maxLat},${maxLon});
);
out center 160;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(endpoint + '?data=' + encodeURIComponent(query), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SentinelaPedestrianSafety/1.0',
        },
      });
      clearTimeout(timeout);

      if (!resp.ok) continue;

      const data = await resp.json();
      if (!data?.elements) continue;

      const places: SafePlace[] = [];

      for (const el of data.elements) {
        const tags = el.tags || {};
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;

        if (!lat || !lon) continue;

        // Wheelmap / OpenStreetMap accessibility metadata
        const wheelchairTag = tags.wheelchair;
        let wheelchair: WheelchairAccessibility | undefined;
        if (
          wheelchairTag === 'yes' ||
          wheelchairTag === 'limited' ||
          wheelchairTag === 'no' ||
          wheelchairTag === 'unknown'
        ) {
          wheelchair = wheelchairTag;
        }
        const wheelchairDescription =
          tags['wheelchair:description'] || tags['wheelchair:description:pt'] || undefined;
        const toiletTag = tags['toilets:wheelchair'];
        let wheelchairToilet: 'yes' | 'limited' | 'no' | 'unknown' | undefined;
        if (
          toiletTag === 'yes' ||
          toiletTag === 'limited' ||
          toiletTag === 'no' ||
          toiletTag === 'unknown'
        ) {
          wheelchairToilet = toiletTag;
        }

        const hasElevator =
          tags.elevator === 'yes' ||
          (wheelchairDescription || '').toLowerCase().includes('elevador') ||
          (tags.description || '').toLowerCase().includes('elevador') ||
          (tags['description:pt'] || '').toLowerCase().includes('elevador');

        if (tags.amenity === 'pharmacy') {
          const rawName = tags.name || tags['name:pt'] || 'Farmácia';
          const { hours, hoursDescription } = parseOsmOpeningHours(tags.opening_hours);
          const street = tags['addr:street']
            ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}`
            : 'Portugal';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const phone = tags.phone || tags['contact:phone'];

          places.push({
            id: `osm-pharm-${el.id}`,
            type: 'pharmacy',
            name: rawName,
            address: street,
            city: city || 'Local',
            district: '',
            phone,
            latitude: lat,
            longitude: lon,
            hours,
            hoursDescription,
            wheelchair,
            wheelchairDescription,
            wheelchairToilet,
            hasElevator,
          });
        } else if (tags.amenity === 'hospital') {
          const rawName = tags.name || tags['name:pt'];
          if (!rawName || rawName.toLowerCase().includes('veterin')) continue;

          const isEmergency = tags.emergency === 'yes' || !tags.opening_hours;
          const { hours, hoursDescription } = isEmergency
            ? {
                hours: { is24h: true },
                hoursDescription: 'Atendimento e Urgência Hospitalar 24h',
              }
            : parseOsmOpeningHours(tags.opening_hours);

          const street = tags['addr:street']
            ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}`
            : 'Portugal';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const phone = tags.phone || tags['contact:phone'] || '112';

          places.push({
            id: `osm-hosp-${el.id}`,
            type: 'hospital',
            name: rawName,
            address: street,
            city: city || 'Local',
            district: '',
            phone,
            latitude: lat,
            longitude: lon,
            hours,
            hoursDescription,
            wheelchair,
            wheelchairDescription,
            wheelchairToilet,
            hasElevator,
          });
        } else if (tags.amenity === 'police') {
          const nameLower = (tags.name || tags.operator || '').toLowerCase();
          let type: SafePlaceType = 'psp';
          if (nameLower.includes('gnr') || nameLower.includes('republicana')) {
            type = 'gnr';
          } else if (nameLower.includes('pj') || nameLower.includes('judiciária')) {
            type = 'pj';
          }

          const rawName =
            tags.name ||
            (type === 'psp' ? 'Esquadra da PSP' : type === 'gnr' ? 'Posto da GNR' : 'Polícia Judiciária');

          const street = tags['addr:street']
            ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}`
            : 'Portugal';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const phone = tags.phone || tags['contact:phone'] || '112';

          places.push({
            id: `osm-police-${el.id}`,
            type,
            name: rawName,
            address: street,
            city: city || 'Local',
            district: '',
            phone,
            latitude: lat,
            longitude: lon,
            hoursDescription: 'Atendimento Permanente 24 Horas',
            wheelchair,
            wheelchairDescription,
            wheelchairToilet,
            hasElevator,
          });
        } else if (
          tags.amenity === 'school' ||
          tags.amenity === 'university' ||
          tags.amenity === 'college' ||
          tags.amenity === 'kindergarten'
        ) {
          const rawName = tags.name || tags['name:pt'];
          if (!rawName) continue;

          let schoolType: 'basic' | 'secondary' | 'university' | 'kindergarten' | 'integrated' = 'basic';
          const nameLower = rawName.toLowerCase();
          if (
            tags.amenity === 'university' ||
            nameLower.includes('universidade') ||
            nameLower.includes('faculdade') ||
            nameLower.includes('instituto superior') ||
            nameLower.includes('politécnico')
          ) {
            schoolType = 'university';
          } else if (
            nameLower.includes('secundária') ||
            nameLower.includes('secundaria') ||
            nameLower.includes('liceu')
          ) {
            schoolType = 'secondary';
          } else if (
            nameLower.includes('básica') ||
            nameLower.includes('basica') ||
            nameLower.includes('eb1') ||
            nameLower.includes('eb 2,3') ||
            nameLower.includes('eb23')
          ) {
            schoolType = 'basic';
          } else if (
            tags.amenity === 'kindergarten' ||
            nameLower.includes('jardim de infância') ||
            nameLower.includes('infantário')
          ) {
            schoolType = 'kindergarten';
          } else {
            schoolType = 'integrated';
          }

          const operator = tags.operator || tags['operator:type'];
          const street = tags['addr:street']
            ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}`
            : 'Portugal';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const phone = tags.phone || tags['contact:phone'];

          const schoolTypeLabel =
            schoolType === 'university'
              ? 'Ensino Superior / Universidade'
              : schoolType === 'secondary'
              ? 'Ensino Secundário (Escola Segura)'
              : schoolType === 'basic'
              ? 'Ensino Básico (Escola Segura)'
              : schoolType === 'kindergarten'
              ? 'Educação Pré-Escolar / Jardim de Infância'
              : 'Estabelecimento de Ensino (Escola Segura)';

          places.push({
            id: `osm-school-${el.id}`,
            type: 'school',
            name: rawName,
            address: street,
            city: city || 'Local',
            district: '',
            phone,
            latitude: lat,
            longitude: lon,
            hoursDescription: `${schoolTypeLabel}${operator ? ' · ' + operator : ''}`,
            wheelchair,
            wheelchairDescription,
            wheelchairToilet,
            hasElevator,
            schoolType,
            operator,
          });
        } else if (
          tags.heritage ||
          tags['heritage:operator'] === 'pc' ||
          tags.protection_title ||
          tags.historic === 'castle' ||
          tags.historic === 'monument' ||
          tags.historic === 'memorial' ||
          tags.historic === 'archaeological_site'
        ) {
          const rawName = tags.name || tags['name:pt'];
          if (!rawName) continue;

          let heritageProtection: 'national_monument' | 'public_interest' | 'municipal_interest' | 'unesco' | 'classified' = 'classified';
          const protTitle = (tags.protection_title || tags.short_protection_title || '').toLowerCase();

          if (tags.heritage === '1' || protTitle.includes('unesco') || protTitle.includes('mundial')) {
            heritageProtection = 'unesco';
          } else if (tags.heritage === '2' || protTitle.includes('monumento nacional') || protTitle.includes('nacional')) {
            heritageProtection = 'national_monument';
          } else if (protTitle.includes('público') || protTitle.includes('publico') || protTitle.includes('iip')) {
            heritageProtection = 'public_interest';
          } else if (protTitle.includes('municipal') || protTitle.includes('iim')) {
            heritageProtection = 'municipal_interest';
          }

          const protectionTitle =
            tags.protection_title ||
            (heritageProtection === 'unesco'
              ? 'Património Mundial da UNESCO'
              : heritageProtection === 'national_monument'
              ? 'Monumento Nacional'
              : heritageProtection === 'public_interest'
              ? 'Imóvel de Interesse Público'
              : heritageProtection === 'municipal_interest'
              ? 'Imóvel de Interesse Municipal'
              : 'Património Cultural Classificado');

          const street = tags['addr:street']
            ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}`
            : 'Portugal';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const phone = tags.phone || tags['contact:phone'];

          places.push({
            id: `osm-heritage-${el.id}`,
            type: 'heritage',
            name: rawName,
            address: street,
            city: city || 'Local',
            district: '',
            phone,
            latitude: lat,
            longitude: lon,
            hoursDescription: `${protectionTitle} · Património Cultural, I.P.`,
            wheelchair,
            wheelchairDescription,
            wheelchairToilet,
            hasElevator,
            heritageProtection,
            protectionTitle,
          });
        } else if (
          tags.railway === 'station' ||
          tags.station === 'subway' ||
          tags.subway === 'yes'
        ) {
          const rawName = tags.name || tags['name:pt'] || 'Estação de Metro / Comboio';
          const street = tags['addr:street']
            ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}`
            : 'Portugal';
          const city = tags['addr:city'] || tags['addr:suburb'] || '';
          const phone = tags.phone || tags['contact:phone'];

          places.push({
            id: `osm-metro-${el.id}`,
            type: 'metro',
            name: rawName,
            address: street,
            city: city || 'Local',
            district: '',
            phone,
            latitude: lat,
            longitude: lon,
            hoursDescription: hasElevator
              ? 'Estação com Elevadores e Acessibilidade · Metro / CP'
              : 'Estação de Transporte Público',
            wheelchair,
            wheelchairDescription,
            wheelchairToilet,
            hasElevator,
          });
        }
      }

      CACHED_REGIONS.set(key, places);
      return places;
    } catch (e) {
      // Try next mirror
      continue;
    }
  }

  return [];
}
