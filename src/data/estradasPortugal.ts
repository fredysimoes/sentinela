export interface PortugueseRoad {
  ref: string; // Ex: 'A 1', 'IC 19', 'N 125', 'IP 1', 'VCI'
  code: string; // Clean code without spaces: 'A1', 'IC19', 'N125', 'VCI'
  name: string; // Designation: 'Autoestrada do Norte', 'Radial de Sintra', etc.
  type: 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';
  categoryLabel: string; // 'Autoestrada', 'Via Rápida (IP/IC)', 'Estrada Nacional'
  regions: string[]; // ['Lisboa', 'Porto', 'Coimbra', ...]
  startLocation: string;
  endLocation: string;
  latitude: number; // Midpoint / representative landmark coordinate
  longitude: number;
}

/**
 * Rede Rodoviária de Portugal (PRN 2000 / OpenStreetMap Padronização de Estradas)
 * https://wiki.openstreetmap.org/wiki/Portugal/Padroniza%C3%A7%C3%A3o/Estradas
 */
export const ESTRADAS_PORTUGAL: PortugueseRoad[] = [
  // ==========================================
  // 1. AUTOESTRADAS (highway = motorway)
  // ==========================================
  {
    ref: 'A 1',
    code: 'A1',
    name: 'Autoestrada do Norte',
    type: 'motorway',
    categoryLabel: 'Autoestrada (PRN 2000)',
    regions: ['Lisboa', 'Santarém', 'Leiria', 'Coimbra', 'Aveiro', 'Porto'],
    startLocation: 'Lisboa (Sacavém)',
    endLocation: 'Porto (Ponte da Arrábida / Freixo)',
    latitude: 39.7436,
    longitude: -8.8071,
  },
  {
    ref: 'A 2',
    code: 'A2',
    name: 'Autoestrada do Sul',
    type: 'motorway',
    categoryLabel: 'Autoestrada (PRN 2000)',
    regions: ['Lisboa', 'Setúbal', 'Évora', 'Beja', 'Faro'],
    startLocation: 'Ponte 25 de Abril (Almada)',
    endLocation: 'Paderne (Algarve / A22)',
    latitude: 37.9542,
    longitude: -8.3214,
  },
  {
    ref: 'A 3',
    code: 'A3',
    name: 'Autoestrada Porto - Valença',
    type: 'motorway',
    categoryLabel: 'Autoestrada (PRN 2000)',
    regions: ['Porto', 'Braga', 'Viana do Castelo'],
    startLocation: 'Porto (VCI)',
    endLocation: 'Valença (Fronteira com Espanha)',
    latitude: 41.5512,
    longitude: -8.4231,
  },
  {
    ref: 'A 4',
    code: 'A4',
    name: 'Autoestrada Transmontana',
    type: 'motorway',
    categoryLabel: 'Autoestrada (PRN 2000)',
    regions: ['Porto', 'Vila Real', 'Bragança'],
    startLocation: 'Matosinhos',
    endLocation: 'Quintanilha (Fronteira com Espanha)',
    latitude: 41.2982,
    longitude: -7.7423,
  },
  {
    ref: 'A 5',
    code: 'A5',
    name: 'Autoestrada da Costa do Estoril',
    type: 'motorway',
    categoryLabel: 'Autoestrada (PRN 2000)',
    regions: ['Lisboa'],
    startLocation: 'Lisboa (Viaduto Duarte Pacheco)',
    endLocation: 'Cascais',
    latitude: 38.7165,
    longitude: -9.2842,
  },
  {
    ref: 'A 8',
    code: 'A8',
    name: 'Autoestrada do Oeste',
    type: 'motorway',
    categoryLabel: 'Autoestrada (PRN 2000)',
    regions: ['Lisboa', 'Leiria'],
    startLocation: 'Lisboa (Calçada de Carriche)',
    endLocation: 'Leiria (A1)',
    latitude: 39.2312,
    longitude: -9.1423,
  },
  {
    ref: 'A 20',
    code: 'A20',
    name: 'VCI - Via de Cintura Interna (Porto Sul)',
    type: 'motorway',
    categoryLabel: 'Autoestrada Urbana (VCI)',
    regions: ['Porto'],
    startLocation: 'Porto (Ponte do Freixo)',
    endLocation: 'Porto (Nó de Francos)',
    latitude: 41.1612,
    longitude: -8.5912,
  },
  {
    ref: 'A 28',
    code: 'A28',
    name: 'Autoestrada do Litoral Norte',
    type: 'motorway',
    categoryLabel: 'Autoestrada (PRN 2000)',
    regions: ['Porto', 'Braga', 'Viana do Castelo'],
    startLocation: 'Porto (Nó de Francos)',
    endLocation: 'Caminha (Vilar de Mouros)',
    latitude: 41.3521,
    longitude: -8.7412,
  },
  {
    ref: 'A 36',
    code: 'A36',
    name: 'CRIL - Circular Regional Interior de Lisboa',
    type: 'motorway',
    categoryLabel: 'Autoestrada Urbana (CRIL)',
    regions: ['Lisboa'],
    startLocation: 'Algés (A5)',
    endLocation: 'Ponte Vasco da Gama (Sacavém)',
    latitude: 38.7456,
    longitude: -9.1982,
  },
  {
    ref: 'A 37',
    code: 'A37',
    name: 'Radial de Sintra (IC 19 Autoestrada)',
    type: 'motorway',
    categoryLabel: 'Autoestrada Radial',
    regions: ['Lisboa'],
    startLocation: 'Buraca (CRIL / 2ª Circular)',
    endLocation: 'Ranholas (Sintra)',
    latitude: 38.7562,
    longitude: -9.2812,
  },
  {
    ref: 'A 41',
    code: 'A41',
    name: 'CREP - Circular Regional Exterior do Porto',
    type: 'motorway',
    categoryLabel: 'Autoestrada Exterior (CREP)',
    regions: ['Porto', 'Aveiro'],
    startLocation: 'Matosinhos (A28)',
    endLocation: 'Espinho (A29)',
    latitude: 41.2215,
    longitude: -8.5214,
  },

  // ==========================================
  // 2. VIAS RÁPIDAS / ITINERÁRIOS (highway = trunk)
  // ==========================================
  {
    ref: 'IC 19',
    code: 'IC19',
    name: 'Radial de Sintra',
    type: 'trunk',
    categoryLabel: 'Via Rápida (IC)',
    regions: ['Lisboa'],
    startLocation: 'Lisboa (2ª Circular)',
    endLocation: 'Sintra (Chão de Meninos)',
    latitude: 38.7582,
    longitude: -9.2741,
  },
  {
    ref: 'VCI',
    code: 'VCI',
    name: 'Via de Cintura Interna do Porto',
    type: 'trunk',
    categoryLabel: 'Via Rápida Urbana',
    regions: ['Porto'],
    startLocation: 'Ponte da Arrábida',
    endLocation: 'Ponte do Freixo',
    latitude: 41.1642,
    longitude: -8.6251,
  },
  {
    ref: 'IP 1',
    code: 'IP1',
    name: 'Itinerário Principal 1 (Litoral Valença - Castro Marim)',
    type: 'trunk',
    categoryLabel: 'Itinerário Principal (IP)',
    regions: ['Viana do Castelo', 'Porto', 'Aveiro', 'Coimbra', 'Lisboa', 'Faro'],
    startLocation: 'Valença',
    endLocation: 'Castro Marim',
    latitude: 39.5214,
    longitude: -8.6521,
  },
  {
    ref: 'IP 4',
    code: 'IP4',
    name: 'Itinerário Principal 4 (Porto - Bragança)',
    type: 'trunk',
    categoryLabel: 'Itinerário Principal (IP)',
    regions: ['Porto', 'Vila Real', 'Bragança'],
    startLocation: 'Amarante',
    endLocation: 'Bragança',
    latitude: 41.3125,
    longitude: -7.4215,
  },
  {
    ref: 'IC 2',
    code: 'IC2',
    name: 'Itinerário Complementar 2 (Lisboa - Porto)',
    type: 'trunk',
    categoryLabel: 'Itinerário Complementar (IC)',
    regions: ['Lisboa', 'Santarém', 'Leiria', 'Coimbra', 'Aveiro', 'Porto'],
    startLocation: 'Lisboa (Santa Iria de Azoia)',
    endLocation: 'Porto (Santo Ovídio / Gaia)',
    latitude: 40.1251,
    longitude: -8.5124,
  },
  {
    ref: 'VR 1',
    code: 'VR1',
    name: 'Via Rápida 1 (Madeira: Machico - Ribeira Brava)',
    type: 'trunk',
    categoryLabel: 'Via Rápida Regional',
    regions: ['Madeira'],
    startLocation: 'Ribeira Brava',
    endLocation: 'Caniçal (Machico)',
    latitude: 32.6582,
    longitude: -16.8921,
  },

  // ==========================================
  // 3. ESTRADAS NACIONAIS (highway = primary)
  // ==========================================
  {
    ref: 'N 2',
    code: 'N2',
    name: 'Estrada Nacional 2 (Rota dos Mitos / Chaves - Faro)',
    type: 'primary',
    categoryLabel: 'Estrada Nacional (EN)',
    regions: ['Vila Real', 'Viseu', 'Coimbra', 'Santarém', 'Évora', 'Faro'],
    startLocation: 'Chaves (Km 0)',
    endLocation: 'Faro (Km 738)',
    latitude: 39.7125,
    longitude: -8.0821,
  },
  {
    ref: 'N 125',
    code: 'N125',
    name: 'Estrada Nacional 125 (Barlavento ao Sotavento Algarvio)',
    type: 'primary',
    categoryLabel: 'Estrada Nacional (EN)',
    regions: ['Faro'],
    startLocation: 'Vila do Bispo',
    endLocation: 'Vila Real de Santo António',
    latitude: 37.1352,
    longitude: -8.3214,
  },
  {
    ref: 'N 10',
    code: 'N10',
    name: 'Estrada Nacional 10 (Lisboa - Setúbal)',
    type: 'primary',
    categoryLabel: 'Estrada Nacional (EN)',
    regions: ['Lisboa', 'Setúbal'],
    startLocation: 'Sacavém',
    endLocation: 'Setúbal',
    latitude: 38.6521,
    longitude: -8.9851,
  },
  {
    ref: 'N 13',
    code: 'N13',
    name: 'Estrada Nacional 13 (Porto - Viana do Castelo - Valença)',
    type: 'primary',
    categoryLabel: 'Estrada Nacional (EN)',
    regions: ['Porto', 'Braga', 'Viana do Castelo'],
    startLocation: 'Porto (Carvalhido)',
    endLocation: 'Valença',
    latitude: 41.4215,
    longitude: -8.7251,
  },
  {
    ref: 'N 14',
    code: 'N14',
    name: 'Estrada Nacional 14 (Porto - Maia - Famalicão - Braga)',
    type: 'primary',
    categoryLabel: 'Estrada Nacional (EN)',
    regions: ['Porto', 'Braga'],
    startLocation: 'Porto (Via Norte)',
    endLocation: 'Braga (Ferreiros)',
    latitude: 41.3125,
    longitude: -8.5521,
  },
  {
    ref: 'N 222',
    code: 'N222',
    name: 'Estrada Nacional 222 (Porto - Douro Vinhateiro - Almendra)',
    type: 'primary',
    categoryLabel: 'Estrada Nacional Panorâmica',
    regions: ['Porto', 'Viseu', 'Guarda'],
    startLocation: 'Vila Nova de Gaia',
    endLocation: 'Almendra (Vila Nova de Foz Côa)',
    latitude: 41.1625,
    longitude: -7.6521,
  },
];

/**
 * Normaliza um termo de busca para estradas (ex: 'A1' -> 'a1', 'n 125' -> 'n125')
 */
export function normalizeRoadQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Procura estradas portuguesas pelo código ou nome oficial
 */
export function findMatchingRoads(query: string): PortugueseRoad[] {
  const norm = normalizeRoadQuery(query);
  if (!norm || norm.length < 2) return [];

  return ESTRADAS_PORTUGAL.filter((road) => {
    const normCode = normalizeRoadQuery(road.code);
    const normRef = normalizeRoadQuery(road.ref);
    const normName = normalizeRoadQuery(road.name);

    return (
      normCode.includes(norm) ||
      normRef.includes(norm) ||
      normName.includes(norm) ||
      norm.startsWith(normCode)
    );
  });
}
