import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { Incident, NotificationSettings } from '../types';
import { calculateDistanceMeters, isProtestInfiltratorVerified } from '../utils/geo';
import { loadIncidents, loadNotificationSettings } from './storage';
import { sendDangerProximityPushNotification } from './notifications';

export const BACKGROUND_LOCATION_TASK = 'SENTINELA_BACKGROUND_LOCATION_TASK';

// Define the background task outside React components so Expo TaskManager can wake it up
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[BackgroundLocation] Erro na tarefa de segundo plano:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latestLocation = locations[locations.length - 1];
    const userLat = latestLocation.coords.latitude;
    const userLon = latestLocation.coords.longitude;

    try {
      const settings = await loadNotificationSettings();
      if (!settings.enabled || !settings.backgroundTracking) {
        return;
      }

      const incidents = await loadIncidents();
      await checkProximityAndNotify(userLat, userLon, incidents, settings);
    } catch (err) {
      console.warn('[BackgroundLocation] Falha ao verificar proximidade:', err);
    }
  }
});

/**
 * Checks if the user is within the configured radius (default 300m) of any hazard
 * and dispatches a notification if the category is enabled in user settings.
 */
export async function checkProximityAndNotify(
  userLat: number,
  userLon: number,
  incidents: Incident[],
  settings: NotificationSettings
): Promise<void> {
  if (!settings.enabled) return;

  const radius = settings.radiusMeters || 300;

  for (const incident of incidents) {
    // Check if the user enabled notifications for this category
    const isCategoryEnabled = settings.categories[incident.category] !== false;
    if (!isCategoryEnabled) continue;

    // Protest infiltrator caution rule: only trigger proximity push if verified by community (>= 2 signals within 300m)
    if (incident.category === 'protest_infiltrator' && !isProtestInfiltratorVerified(incident, incidents, 300, 2)) {
      continue;
    }

    const distance = calculateDistanceMeters(
      userLat,
      userLon,
      incident.latitude,
      incident.longitude
    );

    if (distance <= radius) {
      await sendDangerProximityPushNotification({
        title: incident.title || 'Ocorrência de Perigo',
        distanceMeters: Math.round(distance),
        incidentId: incident.id,
        category: incident.category,
      });
    }
  }
}

/**
 * Requests background location permissions and registers the background task
 */
export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('[BackgroundLocation] Permissão de primeiro plano recusada');
      return false;
    }

    if (Platform.OS === 'android') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('[BackgroundLocation] Permissão de segundo plano não concedida');
      }
    }

    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!isRunning) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,     // Check every 8 seconds
        distanceInterval: 10,   // Or when moving 10 meters
        deferredUpdatesInterval: 10000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Sentinela Ativo em Segundo Plano',
          notificationBody: 'A monitorizar a sua segurança num raio de 300m.',
          notificationColor: '#0284C7',
        },
      });
      console.log('[BackgroundLocation] Monitorização em segundo plano iniciada com sucesso');
    }
    return true;
  } catch (err) {
    console.warn('[BackgroundLocation] Erro ao iniciar tarefa de segundo plano:', err);
    return false;
  }
}

/**
 * Stops background location tracking
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[BackgroundLocation] Monitorização em segundo plano parada');
    }
  } catch (err) {
    console.warn('[BackgroundLocation] Erro ao parar monitorização:', err);
  }
}

/**
 * Checks if background tracking is currently active
 */
export async function isBackgroundTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
