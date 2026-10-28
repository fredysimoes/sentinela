import { SAFE_PLACES_PORTUGAL } from '../data/safePlaces';
import { calculateDistanceMeters } from '../utils/geo';

export interface AddressSuggestion {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  type: 'police' | 'pharmacy' | 'street' | 'place' | 'address';
  houseNumber?: string;
  streetName?: string;
  postcode?: string;
  distanceMeters?: number;
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
  let localMatches = SAFE_PLACES_PORTUGAL.filter((place) => {
    const matchName = normalizeStr(place.name).includes(normQuery);
    const matchAddr = normalizeStr(place.address || '').includes(normQuery);
    const matchCity = normalizeStr(place.city || '').includes(normQuery);
    return matchName || matchAddr || matchCity;
  });

  if (userLocation) {
    localMatches = [...localMatches].sort((a, b) => {
      const distA = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );
      const distB = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );
      return distA - distB;
    });
  }

  for (const p of localMatches.slice(0, 3)) {
    const dist = userLocation
      ? calculateDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          p.latitude,
          p.longitude
        )
      : undefined;

    results.push({
      id: `local-${p.id}`,
      title: p.name,
      subtitle: `${p.address ? p.address + ', ' : ''}${p.city || 'Porto'}`,
      latitude: p.latitude,
      longitude: p.longitude,
      type: p.type === 'pharmacy' ? 'pharmacy' : 'police',
      distanceMeters: dist,
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

          // Determine clean title and address type (incorporating official INE / OSM address imports)
          const isAddress = !!props.housenumber;
          let title = '';
          if (props.housenumber && props.street) {
            title = `${props.street}, n.º ${props.housenumber}`;
          } else if (props.name && props.street && props.name !== props.street) {
            title = `${props.name} · ${props.street}${props.housenumber ? ', n.º ' + props.housenumber : ''}`;
          } else {
            title = props.name || props.street || trimmed;
          }

          // Build clean subtitle (locality, city, postal code)
          const parts = [
            props.locality || props.district,
            props.city || props.town || props.county,
            props.postcode,
          ].filter((p) => p && typeof p === 'string');

          const uniqueParts = Array.from(new Set(parts));
          const subtitle = uniqueParts.length > 0 ? uniqueParts.join(' · ') : 'Portugal';

          // Avoid duplicate coordinates
          const alreadyExists = results.some(
            (r) =>
              Math.abs(r.latitude - lat) < 0.0004 &&
              Math.abs(r.longitude - lon) < 0.0004
          );

          if (!alreadyExists) {
            const dist = userLocation
              ? calculateDistanceMeters(
                  userLocation.latitude,
                  userLocation.longitude,
                  lat,
                  lon
                )
              : undefined;

            results.push({
              id: `photon-${props.osm_id || Math.random()}`,
              title,
              subtitle,
              latitude: lat,
              longitude: lon,
              type: isAddress ? 'address' : props.osm_key === 'highway' ? 'street' : 'place',
              houseNumber: props.housenumber,
              streetName: props.street,
              postcode: props.postcode,
              distanceMeters: dist,
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
                ? calculateDistanceMeters(
                    userLocation.latitude,
                    userLocation.longitude,
                    lat,
                    lon
                  )
                : undefined;

              results.push({
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
      }
    } catch {
      // ignore
    }
  }

  // Sort strictly by proximity to user GPS location (Google Maps style)
  if (userLocation) {
    results.sort((a, b) => {
      const distA = a.distanceMeters ?? 999999999;
      const distB = b.distanceMeters ?? 999999999;
      return distA - distB;
    });
  }

  return results.slice(0, 8);
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
