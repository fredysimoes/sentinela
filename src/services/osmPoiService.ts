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

  const query = `[out:json][timeout:10];
(
  node["amenity"="police"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="pharmacy"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="hospital"](${minLat},${minLon},${maxLat},${maxLon});
  way["amenity"="hospital"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="school"](${minLat},${minLon},${maxLat},${maxLon});
  way["amenity"="school"](${minLat},${minLon},${maxLat},${maxLon});
  node["amenity"="university"](${minLat},${minLon},${maxLat},${maxLon});
);
out center 120;`;

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
            schoolType,
            operator,
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
