export type IncidentCategory =
  | 'dark_area'        // Iluminação fraca / apagada
  | 'suspicious'       // Atividade suspeita
  | 'harassment'       // Assédio ou agressão verbal/física
  | 'theft_risk'       // Zona com furtos/assaltos recentes
  | 'hazard'           // Passeio cortado / cão solto / perigo na via
  | 'safe_haven';      // Ponto seguro (farmácia 24h, esquadra, posto aberto)

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

export type SafePlaceType = 'psp' | 'gnr' | 'pj' | 'pharmacy';

export interface PharmacyHours {
  is24h?: boolean;
  weekdayOpen?: string;
  weekdayClose?: string;
  saturdayOpen?: string;
  saturdayClose?: string;
  sundayOpen?: string;
  sundayClose?: string;
}

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
}

export interface HomeAddress {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}
