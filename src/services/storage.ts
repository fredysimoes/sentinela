import AsyncStorage from '@react-native-async-storage/async-storage';
import { Incident, EmergencyContact, SOSAlert } from '../types';

const STORAGE_KEYS = {
  INCIDENTS: '@sentinela_incidents_v1',
  CONTACTS: '@sentinela_emergency_contacts_v1',
  SOS_ALERTS: '@sentinela_sos_alerts_v1',
  USER_SETTINGS: '@sentinela_user_settings_v1',
};

// Generates realistic initial community incidents relative to a center point
export function generateInitialIncidents(lat: number, lon: number): Incident[] {
  const now = Date.now();
  return [
    {
      id: 'seed-1',
      category: 'dark_area',
      title: 'Postes apagados nesta rua',
      description: 'Mais de 4 candeeiros fundidos seguidos. Visibilidade muito reduzida.',
      latitude: lat + 0.0018,
      longitude: lon - 0.0015,
      createdAt: now - 18 * 60 * 1000, // 18 min ago
      confirmations: 4,
      dismissals: 0,
      severity: 'medium',
    },
    {
      id: 'seed-2',
      category: 'suspicious',
      title: 'Grupo a abordar pessoas',
      description: '2 indivíduos a vigiar quem passa a pé pelo túnel pedonal.',
      latitude: lat - 0.0022,
      longitude: lon + 0.0012,
      createdAt: now - 35 * 60 * 1000, // 35 min ago
      confirmations: 6,
      dismissals: 1,
      severity: 'medium',
    },
    {
      id: 'seed-3',
      category: 'harassment',
      title: 'Tentativa de assédio / perseguição',
      description: 'Pessoa seguiu pedestre durante 200m com comentários agressivos.',
      latitude: lat + 0.0031,
      longitude: lon + 0.0025,
      createdAt: now - 52 * 60 * 1000, // 52 min ago
      confirmations: 8,
      dismissals: 0,
      severity: 'critical',
    },
    {
      id: 'seed-4',
      category: 'safe_haven',
      title: 'Farmácia Aberta 24h & Segura',
      description: 'Luz forte, segurança à porta e pessoas por perto.',
      latitude: lat - 0.0015,
      longitude: lon - 0.0022,
      createdAt: now - 2 * 60 * 60 * 1000,
      confirmations: 15,
      dismissals: 0,
      severity: 'safe',
    },
  ];
}

export async function loadIncidents(userLat?: number, userLon?: number): Promise<Incident[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.INCIDENTS);
    if (raw) {
      const parsed: Incident[] = JSON.parse(raw);
      if (parsed.length > 0) return parsed;
    }
    // If empty or first run, seed with location if provided
    const baseLat = userLat ?? 38.7223; // default Lisbon center
    const baseLon = userLon ?? -9.1393;
    const initial = generateInitialIncidents(baseLat, baseLon);
    await saveIncidents(initial);
    return initial;
  } catch (error) {
    console.error('Erro ao ler incidentes do storage:', error);
    return [];
  }
}

export async function saveIncidents(incidents: Incident[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
  } catch (error) {
    console.error('Erro ao guardar incidentes:', error);
  }
}

export async function loadEmergencyContacts(): Promise<EmergencyContact[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (raw) {
      return JSON.parse(raw);
    }
    const defaultContacts: EmergencyContact[] = [
      {
        id: 'c-1',
        name: 'Contacto de Confiança',
        phone: '+351912345678',
        relation: 'Familiar / Amigo',
      },
    ];
    await saveEmergencyContacts(defaultContacts);
    return defaultContacts;
  } catch (error) {
    console.error('Erro ao ler contactos:', error);
    return [];
  }
}

export async function saveEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  } catch (error) {
    console.error('Erro ao guardar contactos:', error);
  }
}

export async function loadActiveSOSAlerts(): Promise<SOSAlert[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SOS_ALERTS);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Erro ao ler alertas SOS:', error);
    return [];
  }
}

export async function saveActiveSOSAlerts(alerts: SOSAlert[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(alerts));
  } catch (error) {
    console.error('Erro ao guardar alertas SOS:', error);
  }
}
