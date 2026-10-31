export type IncidentCategory =
  | 'dark_area'            // Iluminação fraca / apagada
  | 'suspicious'           // Atividade suspeita
  | 'harassment'           // Assédio ou agressão verbal/física
  | 'theft_risk'           // Zona com furtos/assaltos recentes
  | 'hazard'               // Passeio cortado / cão solto / perigo na via
  | 'safe_haven'           // Ponto seguro (farmácia 24h, esquadra, posto aberto)
  | 'police_presence'      // Presença policial / cordão / piquete de controlo
  | 'protest_infiltrator'  // Possíveis infiltrados na manifestação (modo protesto verificado)
  | 'no_ramp_barrier'      // Degraus sem Rampa (acessibilidade)
  | 'blocked_sidewalk'     // Passeio Obstruído / Obras (acessibilidade)
  | 'broken_elevator'      // Elevador Avariado (acessibilidade)
  | 'rough_surface';       // Calçada Danificada / Buraco (acessibilidade)

export interface Incident {
  id: string;
  category: IncidentCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: number; // timestamp
  confirmations: number; // upvotes (ainda está lá)
  dismissals: number;   // downvotes (já não existe)
  reportedBy?: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'safe';
}

export interface SOSAlert {
  id: string;
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  status: 'active' | 'resolved';
  address?: string;
  message?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export type SafePlaceType = 'psp' | 'gnr' | 'pj' | 'pharmacy' | 'hospital' | 'school' | 'heritage' | 'metro' | 'wheelmap';

export interface PharmacyHours {
  is24h?: boolean;
  weekdayOpen?: string;
  weekdayClose?: string;
  saturdayOpen?: string;
  saturdayClose?: string;
  sundayOpen?: string;
  sundayClose?: string;
}

export type WheelchairAccessibility = 'yes' | 'limited' | 'no' | 'unknown';

export interface SafePlace {
  id: string;
  type: SafePlaceType;
  name: string;
  address: string;
  city: string;
  district: string;
  phone?: string;
  latitude: number;
  longitude: number;
  hours?: PharmacyHours;
  hoursDescription?: string;
  wheelchair?: WheelchairAccessibility;
  wheelchairDescription?: string;
  wheelchairToilet?: 'yes' | 'limited' | 'no' | 'unknown';
  schoolType?: 'basic' | 'secondary' | 'university' | 'kindergarten' | 'integrated';
  operator?: string;
  heritageProtection?: 'national_monument' | 'public_interest' | 'municipal_interest' | 'unesco' | 'classified';
  protectionTitle?: string;
  wheelmapCategory?: string;
  roadRef?: string;
  roadType?: 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';
}

export interface HomeAddress {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type WorkAddress = HomeAddress;

export interface NotificationSettings {
  enabled: boolean;
  radiusMeters: number;
  backgroundTracking: boolean;
  protestMode?: boolean;
  categories: Record<IncidentCategory, boolean>;
}
