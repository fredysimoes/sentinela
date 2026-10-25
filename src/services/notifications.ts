import { Alert, Platform } from 'react-native';
import Haptics, { NotificationFeedbackType } from '../utils/haptics';

type NotificationListener = (notification: {
  title: string;
  body: string;
  type: 'sos_alert' | 'proximity_alert';
  data?: any;
}) => void;

const listeners: Set<NotificationListener> = new Set();

export function subscribeToInAppNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function requestNotificationPermissions(): Promise<boolean> {
  // In development / Expo Go, permissions are granted for in-app alert broadcasting
  return true;
}

/**
 * Dispatches an emergency SOS alert notification to all active listeners and triggers haptic vibration
 */
export async function sendLocalSOSPushNotification(params: {
  userName: string;
  distanceMeters: number;
  latitude: number;
  longitude: number;
}): Promise<void> {
  const distanceStr =
    params.distanceMeters < 1000
      ? `${params.distanceMeters}m`
      : `${(params.distanceMeters / 1000).toFixed(1)}km`;

  const notification = {
    title: '🚨 ALERTA SOS PRÓXIMO DE SI!',
    body: `Um pedestre (${params.userName}) acionou o SOS a ${distanceStr} da sua posição. Verifique o mapa.`,
    type: 'sos_alert' as const,
    data: {
      latitude: params.latitude,
      longitude: params.longitude,
    },
  };

  // Trigger sound/vibration
  Haptics.notificationAsync(NotificationFeedbackType.Error);

  // Broadcast to all UI listeners (floating banner on screen)
  listeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (e) {
      console.warn('Erro ao notificar listener:', e);
    }
  });
}

/**
 * Dispatches a proximity warning when approaching a reported hazard
 */
export async function sendDangerProximityPushNotification(params: {
  title: string;
  distanceMeters: number;
}): Promise<void> {
  const notification = {
    title: '⚠️ Atenção: Perigo Próximo',
    body: `Entrou numa zona com reporte: "${params.title}" a cerca de ${params.distanceMeters}m.`,
    type: 'proximity_alert' as const,
  };

  Haptics.notificationAsync(NotificationFeedbackType.Warning);

  listeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (e) {
      console.warn('Erro ao notificar listener:', e);
    }
  });
}
