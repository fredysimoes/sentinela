import { calculateDistanceMeters } from '../utils/geo';
import rawStationsData from '../data/cpStations.json';

export interface CpStation {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  isApeadeiro: boolean;
  railways: string[];
  distanceMeters?: number;
}

// Lista de apeadeiros conhecidos ou padrões de classificação ferroviária da Infraestruturas de Portugal
const KNOWN_APEADEIROS = new Set([
  'Ademia', 'Afife', 'Aguieira', 'Aguim', 'Alcaide', 'Alcaria', 'Aldeia', 'Alegria', 'Alferrarede',
  'Almourol', 'Alpedrinha', 'Alvaraes', 'Alvega - Ortiga', 'Ameal', 'Ancoreta', 'Aparicao', 'Apeadeiro',
  'Areia - Darque', 'Arentim', 'Arroteia', 'Arvalhas', 'Barqueiros', 'Barragem de Belver', 'Barroselas',
  'Bicanho', 'Bolfiar', 'Bom Sucesso', 'Breia', 'Carvalheira - Maceda', 'Carvalhosas', 'Castelo Branco',
  'Cavadas', 'Chorente', 'Coes', 'Coleja', 'Conde', 'Couto de Cambeses', 'Curvaceiras', 'Donas',
  'Fatela - Penamacor', 'Fontela', 'Fontela - A', 'Fornos', 'Francos', 'Gandra', 'Gatões', 'Gondifelos',
  'Granja', 'Lapa do Lobo', 'Lalim', 'Louro', 'Madalena', 'Marachao', 'Meinedo', 'Mirao', 'Moimenta - Alvendre',
  'Monte dos Burgos', 'Monte Redondo', 'Mouriscas', 'Oliveirinha - Cabanas', 'Palmilheira', 'Paramos',
  'Pedras Salgadas', 'Pego', 'Perafita', 'Pereirinhas', 'Pinheiro da Bemposta', 'Pousada', 'Praia de Ancora',
  'Recarei - Sobreira', 'Rego da Murta', 'Ribeira de Frades', 'Rio Frio - Abreiro', 'Ruivaes', 'Salreu',
  'Santa Eulalia - A', 'Santao', 'Sao Frutuoso', 'Sao Romao', 'Senhora das Dores', 'Silvalde', 'Soenga',
  'Sousela', 'Suzao', 'Tadim', 'Terronhas', 'Trancoso', 'Travaes', 'Valadares', 'Vilar Formoso',
]);

/**
 * Normaliza e classifica as estações da base de dados ferroviária
 */
function parseRawStations(data: any): CpStation[] {
  const rawList: any[] = data?.stations || (Array.isArray(data) ? data : []);
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((st) => {
      const lat = parseFloat(st.latitude);
      const lng = parseFloat(st.longitude);
      if (isNaN(lat) || isNaN(lng)) return null;

      const name = String(st.designation || '').trim();
      const code = String(st.code || '').trim();
      const railways = Array.isArray(st.railways) ? st.railways.map(String) : [];

      const isApeadeiro =
        KNOWN_APEADEIROS.has(name) ||
        /\bApeadeiro\b/i.test(name) ||
        /\bParagem\b/i.test(name) ||
        railways.length <= 1;

      return {
        id: `cp-station-${code}`,
        code,
        name,
        latitude: lat,
        longitude: lng,
        isApeadeiro,
        railways,
      } as CpStation;
    })
    .filter((st): st is CpStation => st !== null);
}

let cachedStations: CpStation[] = parseRawStations(rawStationsData);

/**
 * Obtém as estações e apeadeiros de comboio da CP próximas da localização do utilizador
 * @param lat Latitude central
 * @param lon Longitude central
 * @param radiusKm Raio máximo em km (padrão 35km para cobrir linhas metropolitanas e regionais)
 */
export async function fetchNearbyCpStations(
  lat: number,
  lon: number,
  radiusKm: number = 35
): Promise<CpStation[]> {
  try {
    // Tentativa assíncrona de atualização online da API oficial comboios.live
    fetch('https://comboios.live/api/stations', {
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((freshJson) => {
        if (freshJson?.stations && Array.isArray(freshJson.stations)) {
          const parsed = parseRawStations(freshJson);
          if (parsed.length > 0) {
            cachedStations = parsed;
          }
        }
      })
      .catch(() => {});
  } catch {}

  const maxDistM = radiusKm * 1000;

  const nearby = cachedStations
    .map((station) => {
      const distanceMeters = Math.round(
        calculateDistanceMeters(lat, lon, station.latitude, station.longitude)
      );
      return {
        ...station,
        distanceMeters,
      };
    })
    .filter((st) => st.distanceMeters <= maxDistM);

  nearby.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

  return nearby;
}

/**
 * Procura estações por nome (autocomplete e pesquisa)
 */
export function searchCpStations(query: string, maxResults: number = 10): CpStation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return cachedStations
    .filter((st) => st.name.toLowerCase().includes(q))
    .slice(0, maxResults);
}

/**
 * Encontra a estação de comboio CP mais próxima de uma dada coordenada
 */
export function findClosestCpStation(coord: { latitude: number; longitude: number }): CpStation | null {
  if (cachedStations.length === 0) return null;

  let closest: CpStation | null = null;
  let minDist = Infinity;

  for (const st of cachedStations) {
    const d = calculateDistanceMeters(coord.latitude, coord.longitude, st.latitude, st.longitude);
    if (d < minDist) {
      minDist = d;
      closest = { ...st, distanceMeters: Math.round(d) };
    }
  }

  return closest;
}
