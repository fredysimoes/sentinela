import { IncidentCategory } from '../types';

export interface CategoryMeta {
  id: IncidentCategory;
  label: string;
  description: string;
  icon: string; // Ionicons name
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
    color: '#F59E0B', // Amber
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    severity: 'medium',
  },
  suspicious: {
    id: 'suspicious',
    label: 'Atividade Suspeita',
    description: 'Pessoas a rondar, atitude intimidadora ou vigilância estranha',
    icon: 'eye',
    color: '#F97316', // Orange
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    severity: 'medium',
  },
  harassment: {
    id: 'harassment',
    label: 'Assédio / Agressão',
    description: 'Assédio verbal/físico, perseguição a pé ou altercação',
    icon: 'alert-circle',
    color: '#EF4444', // Red
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    severity: 'critical',
  },
  theft_risk: {
    id: 'theft_risk',
    label: 'Risco de Assalto',
    description: 'Ponto frequente de roubo de telemóveis/carteiras ou tentativa recente',
    icon: 'warning',
    color: '#DC2626', // Dark Red
    badgeBg: 'rgba(220, 38, 38, 0.15)',
    severity: 'high',
  },
  hazard: {
    id: 'hazard',
    label: 'Passeio Bloqueado',
    description: 'Obras na calçada, cão perigoso solto ou obstáculo na passagem',
    icon: 'construct',
    color: '#EAB308', // Yellow
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    severity: 'low',
  },
  police_presence: {
    id: 'police_presence',
    label: 'Presença Policial',
    description: 'Polícia no local, cordão de segurança ou controlo de manifestação',
    icon: 'shield',
    color: '#3B82F6', // Blue
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    severity: 'medium',
  },
  safe_haven: {
    id: 'safe_haven',
    label: 'Ponto Seguro',
    description: 'Esquadra PSP/GNR, farmácia 24h, estabelecimento aberto e vigiado',
    icon: 'shield-checkmark',
    color: '#10B981', // Green
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    severity: 'safe',
  },
};
