import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Haptics, { NotificationFeedbackType } from '../utils/haptics';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationListener = (notification: {
  title: string;
  body: string;
  type: 'sos_alert' | 'proximity_alert';
  data?: any;
}) => void;

const listeners: Set<NotificationListener> = new Set();
const notifiedIncidentTimestamps: Map<string, number> = new Map();
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes before notifying the same hazard again

export function subscribeToInAppNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('sentinela_hazards', {
        name: 'Alertas de Perigo & SOS',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Erro ao solicitar permissões de notificação:', error);
    return false;
  }
}

/**
 * Sends a real system notification (shown in the OS status bar, lock screen and heads-up banner)
 */
export async function sendSystemNotification(params: {
  title: string;
  body: string;
  data?: any;
  incidentId?: string;
}): Promise<boolean> {
  // If an incidentId is provided, check cooldown to avoid spamming the user
  if (params.incidentId) {
    const lastNotified = notifiedIncidentTimestamps.get(params.incidentId);
    const now = Date.now();
    if (lastNotified && now - lastNotified < COOLDOWN_MS) {
      return false; // Still in cooldown
    }
    notifiedIncidentTimestamps.set(params.incidentId, now);
  }

  try {
    // 1. Dispatch native OS system notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data || {},
        sound: 'default',
        color: '#EF4444',
      },
      trigger: null, // Send immediately
    });

    // 2. Trigger hardware haptic feedback
    Haptics.notificationAsync(NotificationFeedbackType.Warning);

    // 3. Notify in-app banner listeners if app is open
    listeners.forEach((listener) => {
      try {
        listener({
          title: params.title,
          body: params.body,
          type: 'proximity_alert',
          data: params.data,
        });
      } catch (e) {
        console.warn('Erro ao notificar listener in-app:', e);
      }
    });

    return true;
  } catch (error) {
    console.warn('Erro ao agendar notificação do sistema:', error);
    return false;
  }
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

  const title = '🚨 ALERTA SOS PRÓXIMO DE SI!';
  const body = `Um pedestre (${params.userName}) acionou o SOS a ${distanceStr} da sua posição. Verifique o mapa.`;

  await sendSystemNotification({
    title,
    body,
    data: {
      type: 'sos_alert',
      latitude: params.latitude,
      longitude: params.longitude,
    },
  });
}

/**
 * Dispatches a proximity warning when approaching a reported hazard (300m)
 */
export async function sendDangerProximityPushNotification(params: {
  title: string;
  distanceMeters: number;
  incidentId?: string;
  category?: string;
}): Promise<void> {
  const title = '⚠️ Perigo a Menos de 300 Metros!';
  const body = `Está a ${params.distanceMeters}m de uma ocorrência reportada: "${params.title}". Redobre a atenção.`;

  await sendSystemNotification({
    title,
    body,
    incidentId: params.incidentId,
    data: {
      type: 'proximity_alert',
      incidentId: params.incidentId,
      category: params.category,
    },
  });
}
