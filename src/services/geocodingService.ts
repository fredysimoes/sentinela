import { SAFE_PLACES_PORTUGAL } from '../data/safePlaces';

export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  type: 'police' | 'pharmacy' | 'street' | 'place';
}

function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
  const results: AddressSuggestion[] = [];

  // 1. Instant local match from pre-loaded official catalog (0ms latency)
  const localMatches = SAFE_PLACES_PORTUGAL.filter((place) => {
    const matchName = normalizeStr(place.name).includes(normQuery);
    const matchAddr = normalizeStr(place.address || '').includes(normQuery);
    const matchCity = normalizeStr(place.city || '').includes(normQuery);
    return matchName || matchAddr || matchCity;
  }).slice(0, 4);

  for (const p of localMatches) {
    results.push({
      id: `local-${p.id}`,
      title: p.name,
      subtitle: `${p.address ? p.address + ', ' : ''}${p.city || 'Porto'}`,
      latitude: p.latitude,
      longitude: p.longitude,
      type: p.type === 'pharmacy' ? 'pharmacy' : 'police',
    });
  }

  // 2. Real-time Photon (Komoot / OpenStreetMap) API with Proximity Bias
  // Note: Photon supports lang: 'default', 'de', 'en', 'fr', 'it'.
  // Using 'default' preserves local Portuguese names (ruas, avenidas, praças).
  try {
    const biasLat = userLocation?.latitude ?? 41.1579;
    const biasLon = userLocation?.longitude ?? -8.6291;

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed
    )}&limit=10&lang=default&lat=${biasLat}&lon=${biasLon}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(photonUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SentinelaMobileSafety/2.0',
        'Accept': 'application/json',
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

          // Determine clean title
          let title = props.name || props.street || '';
          if (props.housenumber && props.street) {
            title = `${props.street}, ${props.housenumber}`;
          } else if (props.name && props.street && props.name !== props.street) {
            title = `${props.name} · ${props.street}`;
          }

          if (!title) {
            title = trimmed;
          }

          // Build clean subtitle (locality, city, district)
          const parts = [
            props.locality || props.district,
            props.city || props.town || props.county,
            props.state,
          ].filter((p) => p && typeof p === 'string');

          const uniqueParts = Array.from(new Set(parts));
          const subtitle = uniqueParts.length > 0 ? uniqueParts.join(', ') : 'Portugal';

          // Avoid duplicate coordinates
          const alreadyExists = results.some(
            (r) =>
              Math.abs(r.latitude - lat) < 0.0004 &&
              Math.abs(r.longitude - lon) < 0.0004
          );

          if (!alreadyExists) {
            results.push({
              id: `photon-${props.osm_id || Math.random()}`,
              title,
              subtitle,
              latitude: lat,
              longitude: lon,
              type: props.osm_key === 'highway' ? 'street' : 'place',
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn('Erro ao consultar Photon:', error);
  }

  // 3. Fallback to Nominatim if results are few
  if (results.length < 3) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pt&addressdetails=1&limit=5&q=${encodeURIComponent(
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

            const alreadyExists = results.some(
              (r) =>
                Math.abs(r.latitude - lat) < 0.0004 &&
                Math.abs(r.longitude - lon) < 0.0004
            );

            if (!alreadyExists) {
              const addr = item.address || {};
              const title =
                addr.road ||
                addr.pedestrian ||
                addr.street ||
                item.display_name.split(',')[0];
              const city =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.municipality ||
                'Portugal';

              results.push({
                id: `nom-${item.place_id || item.osm_id}`,
                title: title.trim(),
                subtitle: city,
                latitude: lat,
                longitude: lon,
                type: 'street',
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return results.slice(0, 8);
}
