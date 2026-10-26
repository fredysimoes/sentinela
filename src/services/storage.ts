import AsyncStorage from '@react-native-async-storage/async-storage';
import { Incident, EmergencyContact, SOSAlert, HomeAddress, NotificationSettings } from '../types';
import { NavigationState } from '../types/navigation';

const STORAGE_KEYS = {
  INCIDENTS: '@sentinela_incidents_v1',
  CONTACTS: '@sentinela_emergency_contacts_v1',
  SOS_ALERTS: '@sentinela_sos_alerts_v1',
  USER_SETTINGS: '@sentinela_user_settings_v1',
  HOME_ADDRESS: '@sentinela_home_address_v1',
  NOTIFICATION_SETTINGS: '@sentinela_notification_settings_v1',
  ACTIVE_NAVIGATION: '@sentinela_active_navigation_v1',
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
      // Clean out demo/seed data and any incident with dismissals >= confirmations or marked defunct
      const valid = parsed.filter(
        (item) =>
          !item.id.startsWith('seed-') &&
          (item.dismissals || 0) < (item.confirmations || 1) &&
          (item.dismissals || 0) < 5
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
    // Only persist valid real incidents where confirmations > dismissals
    const validOnly = incidents.filter(
      (item) =>
        !item.id.startsWith('seed-') &&
        (item.dismissals || 0) < (item.confirmations || 1) &&
        (item.dismissals || 0) < 5
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

export async function loadHomeAddress(): Promise<HomeAddress | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HOME_ADDRESS);
    if (raw) {
      return JSON.parse(raw);
    }
    return null;
  } catch (error) {
    console.error('Erro ao ler morada de casa:', error);
    return null;
  }
}

export async function saveHomeAddress(home: HomeAddress | null): Promise<void> {
  try {
    if (home) {
      await AsyncStorage.setItem(STORAGE_KEYS.HOME_ADDRESS, JSON.stringify(home));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.HOME_ADDRESS);
    }
  } catch (error) {
    console.error('Erro ao guardar morada de casa:', error);
  }
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  radiusMeters: 300,
  backgroundTracking: true,
  protestMode: false,
  categories: {
    theft_risk: true,
    harassment: true,
    suspicious: true,
    hazard: true,
    dark_area: true,
    police_presence: true,
    safe_haven: false,
  },
};

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...parsed,
        categories: {
          ...DEFAULT_NOTIFICATION_SETTINGS.categories,
          ...(parsed.categories || {}),
        },
      };
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('Erro ao ler definições de notificação:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Erro ao guardar definições de notificação:', error);
  }
}

export async function loadActiveNavigation(): Promise<NavigationState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_NAVIGATION);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Erro ao ler estado de navegação:', error);
    return null;
  }
}

export async function saveActiveNavigation(navState: NavigationState | null): Promise<void> {
  try {
    if (navState) {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_NAVIGATION, JSON.stringify(navState));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_NAVIGATION);
    }
  } catch (error) {
    console.error('Erro ao guardar estado de navegação:', error);
  }
}
