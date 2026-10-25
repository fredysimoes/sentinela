import AsyncStorage from '@react-native-async-storage/async-storage';
import { Incident, EmergencyContact, SOSAlert } from '../types';

const STORAGE_KEYS = {
  INCIDENTS: '@sentinela_incidents_v1',
  CONTACTS: '@sentinela_emergency_contacts_v1',
  SOS_ALERTS: '@sentinela_sos_alerts_v1',
  USER_SETTINGS: '@sentinela_user_settings_v1',
};

/**
 * Loads persisted community incidents.
 * Filters out all demo/prototype seeds and any incident where downvotes (dismissals) > confirmations.
 */
export async function loadIncidents(_userLat?: number, _userLon?: number): Promise<Incident[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.INCIDENTS);
    if (raw) {
      const parsed: Incident[] = JSON.parse(raw);
      // Clean out demo/seed data and any incident with more negative than positive votes
      const valid = parsed.filter(
        (item) => !item.id.startsWith('seed-') && item.dismissals <= item.confirmations
      );
      // Save cleaned array back to storage
      await saveIncidents(valid);
      return valid;
    }
    return [];
  } catch (error) {
    console.error('Erro ao ler incidentes do storage:', error);
    return [];
  }
}

export async function saveIncidents(incidents: Incident[]): Promise<void> {
  try {
    // Only persist valid real incidents where confirmations >= dismissals
    const validOnly = incidents.filter(
      (item) => !item.id.startsWith('seed-') && item.dismissals <= item.confirmations
    );
    await AsyncStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(validOnly));
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
        id: 'contact-112',
        name: 'Número Europeu de Emergência',
        phone: '112',
        relation: 'Serviço Oficial 24h',
      },
    ];
    await saveEmergencyContacts(defaultContacts);
    return defaultContacts;
  } catch (error) {
    console.error('Erro ao carregar contactos de emergência:', error);
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
    if (raw) {
      const alerts: SOSAlert[] = JSON.parse(raw);
      // Only keep alerts within the last 60 minutes
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      return alerts.filter((a) => a.timestamp > oneHourAgo);
    }
    return [];
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
