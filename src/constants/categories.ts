import { IncidentCategory } from '../types';

export interface CategoryMeta {
  id: IncidentCategory;
  label: string;
  description: string;
  icon: string; // Ionicons fallback name
  mciIcon: string; // MaterialCommunityIcons modern stealth icon name
  color: string;
  badgeBg: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'safe';
}

export const CATEGORIES: Record<IncidentCategory, CategoryMeta> = {
  dark_area: {
    id: 'dark_area',
    label: 'Sem Iluminação',
    description: 'Postes apagados, rua ou beco completamente às escuras',
    icon: 'moon',
    mciIcon: 'weather-night',
    color: '#F59E0B', // Amber
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    severity: 'medium',
  },
  suspicious: {
    id: 'suspicious',
    label: 'Atividade Suspeita',
    description: 'Pessoas a rondar, atitude intimidadora ou vigilância estranha',
    icon: 'eye',
    mciIcon: 'incognito',
    color: '#F97316', // Orange
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    severity: 'medium',
  },
  harassment: {
    id: 'harassment',
    label: 'Assédio / Agressão',
    description: 'Assédio verbal/físico, perseguição a pé ou altercação',
    icon: 'alert-circle',
    mciIcon: 'hand-back-left-off',
    color: '#EF4444', // Red
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    severity: 'critical',
  },
  theft_risk: {
    id: 'theft_risk',
    label: 'Risco de Assalto',
    description: 'Ponto frequente de roubo de telemóveis/carteiras ou tentativa recente',
    icon: 'warning',
    mciIcon: 'shield-alert',
    color: '#DC2626', // Dark Red
    badgeBg: 'rgba(220, 38, 38, 0.15)',
    severity: 'high',
  },
  hazard: {
    id: 'hazard',
    label: 'Passeio Bloqueado',
    description: 'Obras na calçada, cão perigoso solto ou obstáculo na passagem',
    icon: 'construct',
    mciIcon: 'traffic-cone',
    color: '#EAB308', // Yellow
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    severity: 'low',
  },
  police_presence: {
    id: 'police_presence',
    label: 'Presença Policial',
    description: 'Agentes policiais, patrulha no local ou operação de fiscalização',
    icon: 'shield-account',
    mciIcon: 'police-badge',
    color: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    severity: 'medium',
  },
  protest_infiltrator: {
    id: 'protest_infiltrator',
    label: 'Possíveis Infiltrados',
    description: 'Sinalizar suspeita de infiltrados ou elementos provocadores na manifestação',
    icon: 'eye-off',
    mciIcon: 'account-alert',
    color: '#DC2626',
    badgeBg: 'rgba(220, 38, 38, 0.15)',
    severity: 'critical',
  },
  safe_haven: {
    id: 'safe_haven',
    label: 'Ponto Seguro',
    description: 'Esquadra PSP/GNR, farmácia 24h, estabelecimento aberto e vigiado',
    icon: 'shield-checkmark',
    mciIcon: 'shield-check',
    color: '#10B981', // Green
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    severity: 'safe',
  },
  // Categorias de Acessibilidade & Mobilidade Reduzida
  no_ramp_barrier: {
    id: 'no_ramp_barrier',
    label: 'Degraus sem Rampa',
    description: 'Escadaria ou desnível acentuado sem rampa acessível para cadeira de rodas ou carrinhos',
    icon: 'trending-up',
    mciIcon: 'stairs',
    color: '#06B6D4', // Cyan
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    severity: 'medium',
  },
  blocked_sidewalk: {
    id: 'blocked_sidewalk',
    label: 'Passeio Obstruído / Obras',
    description: 'Passeio cortado por obras, andaimes, tapumes ou viaturas impedindo passagem de cadeiras',
    icon: 'construct',
    mciIcon: 'fence',
    color: '#F97316', // Orange
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    severity: 'medium',
  },
  broken_elevator: {
    id: 'broken_elevator',
    label: 'Elevador Avariado',
    description: 'Elevador de metro, estação de comboios, viaduto ou túnel fora de serviço',
    icon: 'alert-circle',
    mciIcon: 'elevator-down',
    color: '#EF4444', // Red
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    severity: 'high',
  },
  rough_surface: {
    id: 'rough_surface',
    label: 'Calçada Danificada / Buraco',
    description: 'Calçada levantada, pedras soltas, buraco profundo ou piso perigoso para mobilidade',
    icon: 'warning',
    mciIcon: 'texture-box',
    color: '#EAB308', // Yellow
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    severity: 'low',
  },
};

export const ACCESSIBILITY_CATEGORIES: IncidentCategory[] = [
  'no_ramp_barrier',
  'blocked_sidewalk',
  'broken_elevator',
  'rough_surface',
];

export const GENERAL_REPORT_CATEGORIES: IncidentCategory[] = [
  'dark_area',
  'suspicious',
  'harassment',
  'theft_risk',
  'hazard',
  'police_presence',
  'safe_haven',
];

export function isAccessibilityCategory(category: IncidentCategory | string): boolean {
  return (
    category === 'no_ramp_barrier' ||
    category === 'blocked_sidewalk' ||
    category === 'broken_elevator' ||
    category === 'rough_surface'
  );
}
