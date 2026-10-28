import { SafePlace, SafePlaceType } from '../types';
import { SAFE_PLACES_PORTUGAL } from '../data/safePlaces';
import { calculateDistanceMeters } from '../utils/geo';
import { getPharmacyStatus, PharmacyStatus } from '../utils/pharmacySchedule';
import { fetchOsmPlacesInBoundingBox } from './osmPoiService';

export interface SafePlaceWithDistance extends SafePlace {
  distanceMeters?: number;
  pharmacyStatus?: PharmacyStatus;
}

export function getSafePlaces(
  typeFilter: SafePlaceType | 'all' | 'police' = 'all',
  userLat?: number,
  userLon?: number,
  additionalPlaces: SafePlace[] = []
): SafePlaceWithDistance[] {
  // Merge core curated places with dynamically loaded OSM places
  const combined = [...SAFE_PLACES_PORTUGAL, ...additionalPlaces];

  // De-duplicate items within 40m of each other
  const uniqueList: SafePlace[] = [];
  for (const place of combined) {
    const isDuplicate = uniqueList.some(
      (existing) =>
        existing.type === place.type &&
        calculateDistanceMeters(existing.latitude, existing.longitude, place.latitude, place.longitude) < 40
    );
    if (!isDuplicate) {
      uniqueList.push(place);
    }
  }

  let list = uniqueList;
  if (typeFilter === 'police') {
    list = list.filter((p) => p.type === 'psp' || p.type === 'gnr' || p.type === 'pj');
  } else if (typeFilter !== 'all') {
    list = list.filter((p) => p.type === typeFilter);
  }

  const result: SafePlaceWithDistance[] = list.map((place) => {
    const item: SafePlaceWithDistance = { ...place };
    if (userLat !== undefined && userLon !== undefined) {
      item.distanceMeters = calculateDistanceMeters(
        userLat,
        userLon,
        place.latitude,
        place.longitude
      );
    }
    if (place.type === 'pharmacy' || place.type === 'hospital') {
      item.pharmacyStatus = getPharmacyStatus(place);
    }
    return item;
  });

  if (userLat !== undefined && userLon !== undefined) {
    result.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
  }

  return result;
}

/**
 * Dynamically fetches all local pharmacies, hospitals, and police stations in the visible map region
 */
export async function loadLiveOsmPlacesForRegion(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): Promise<SafePlace[]> {
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLon = region.longitude - region.longitudeDelta / 2;
  const maxLon = region.longitude + region.longitudeDelta / 2;

  try {
    return await fetchOsmPlacesInBoundingBox({
      minLat,
      minLon,
      maxLat,
      maxLon,
    });
  } catch (e) {
    console.warn('Erro ao carregar locais OSM em direto:', e);
    return [];
  }
}
