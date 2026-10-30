import { calculateDistanceMeters } from '../utils/geo';
import rawMetroData from '../data/metroPortoStations.json';

export type MetroPortoLine = 'A' | 'B' | 'Bx' | 'C' | 'D' | 'E' | 'F';

export interface MetroStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lines: MetroPortoLine[];
  gtfsIds: string[];
  distanceMeters?: number;
  zone?: string;
  isUnderground?: boolean;
}

/**
 * Cores oficiais de cada linha do Metro do Porto
 */
export const METRO_LINE_COLORS: Record<string, string> = {
  A: '#0284C7', // Linha Azul (Estádio do Dragão - Senhor de Matosinhos)
  B: '#DC2626', // Linha Vermelha (Estádio do Dragão - Póvoa de Varzim)
  Bx: '#DC2626', // Linha Vermelha Expresso
  C: '#16A34A', // Linha Verde (Campanhã - ISMAI)
  D: '#EAB308', // Linha Amarela (Hospital São João - Santo Ovídio / Vila d'Este)
  E: '#7C3AED', // Linha Violeta (Trindade - Aeroporto)
  F: '#EA580C', // Linha Laranja (Fânzeres - Senhora da Hora)
};

/**
 * Nomes e destinos terminais das linhas
 */
export const METRO_LINE_NAMES: Record<string, string> = {
  A: 'Linha Azul (Dragão ➔ Matosinhos)',
  B: 'Linha Vermelha (Dragão ➔ Póvoa)',
  Bx: 'Linha Vermelha Expresso',
  C: 'Linha Verde (Campanhã ➔ ISMAI)',
  D: 'Linha Amarela (Hosp. S. João ➔ Sto. Ovídio)',
  E: 'Linha Violeta (Trindade ➔ Aeroporto)',
  F: 'Linha Laranja (Fânzeres ➔ Sr.ª da Hora)',
};

// Estações centrais subterrâneas no tronco comum e linha D
const UNDERGROUND_STATIONS = new Set([
  'Trindade',
  'Aliados',
  'São Bento',
  'Jardim do Morro',
  'Bolhão',
  '24 de Agosto',
  'Campo 24 de Agosto',
  'Heroísmo',
  'Campanhã',
  'Lapa',
  'Marquês',
  'Combatentes',
  'Salgueiros',
  'Pólo Universitário',
  'IPO',
  'Hospital São João',
]);

function parseMetroStations(rawList: any[]): MetroStation[] {
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((item) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      if (isNaN(lat) || isNaN(lon)) return null;

      const name = String(item.name || '').trim();
      const lines = Array.isArray(item.lines) ? (item.lines as MetroPortoLine[]) : [];
      const gtfsIds = Array.isArray(item.gtfsIds) ? item.gtfsIds.map(String) : [];
      const cleanId = `metro-porto-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      return {
        id: cleanId,
        name,
        latitude: lat,
        longitude: lon,
        lines,
        gtfsIds,
        isUnderground: UNDERGROUND_STATIONS.has(name),
      } as MetroStation;
    })
    .filter((s): s is MetroStation => s !== null);
}

const cachedMetroStations: MetroStation[] = parseMetroStations(rawMetroData);

/**
 * Obtém todas as estações do Metro do Porto próximas de uma coordenada GPS
 * @param lat Latitude central
 * @param lon Longitude central
 * @param radiusKm Raio máximo de procura em quilómetros (padrão: 35km para cobrir toda a rede metropolitana)
 */
export async function fetchNearbyMetroStations(
  lat: number,
  lon: number,
  radiusKm: number = 35
): Promise<MetroStation[]> {
  const maxDistance = radiusKm * 1000;

  const nearby = cachedMetroStations
    .map((st) => {
      const distanceMeters = Math.round(
        calculateDistanceMeters(lat, lon, st.latitude, st.longitude)
      );
      return {
        ...st,
        distanceMeters,
      };
    })
    .filter((st) => st.distanceMeters <= maxDistance);

  nearby.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
  return nearby;
}

/**
 * Pesquisa estações de Metro por nome
 */
export function searchMetroStations(query: string, maxResults: number = 10): MetroStation[] {
  const q = query.trim().toLowerCase();
  if (!q) return cachedMetroStations.slice(0, maxResults);

  return cachedMetroStations
    .filter((st) => st.name.toLowerCase().includes(q))
    .slice(0, maxResults);
}

/**
 * Obtém todas as 85 estações do Metro do Porto
 */
export function getAllMetroStations(): MetroStation[] {
  return cachedMetroStations;
}
