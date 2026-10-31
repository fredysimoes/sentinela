import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Haptics, { NotificationFeedbackType } from '../utils/haptics';
import { getManeuverArrow, formatArrivalTime, formatNavigationDistance } from '../utils/navigationHelper';

// Configure how notifications appear when the app is in the foreground
// Strictly suppress all native push banners/sounds when the user is actively using the app.
// Alerts must be shown in-app via banners/UI, and system push only when minimized or locked.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
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

      await Notifications.setNotificationChannelAsync('sentinela_navigation', {
        name: 'Navegação em Direto',
        importance: Notifications.AndroidImportance.HIGH,
        sound: undefined,
        enableVibrate: false,
        showBadge: false,
      });

      // Keep location foreground service channel silent and non-intrusive
      await Notifications.setNotificationChannelAsync('expo_location_task_service_channel', {
        name: 'Serviço de Segundo Plano',
        importance: Notifications.AndroidImportance.MIN,
        sound: undefined,
        enableVibrate: false,
        showBadge: false,
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
    // 1. Dispatch native OS system notification ONLY when app is minimized or screen locked
    if (AppState.currentState !== 'active') {
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
    }

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

export interface NavigationNotificationParams {
  instruction: string;
  distanceRemainingMeters: number;
  timeRemainingMinutes: number;
  destinationName: string;
  isSafeRoute?: boolean;
  maneuverType?: string;
  maneuverModifier?: string;
}

/**
 * Updates persistent ongoing turn-by-turn notification shown during active navigation.
 * Guarantees a single notification card with large next step, right-hand direction arrow,
 * arrival ETA and safe route indicator.
 * ONLY shown when the app is in the background or the screen is locked!
 */
export async function updateNavigationNotification(params: NavigationNotificationParams): Promise<void> {
  // If app is currently open and active in the foreground, do NOT display notification!
  if (AppState.currentState === 'active') {
    return;
  }

  const distText = formatNavigationDistance(params.distanceRemainingMeters);
  const etaTime = formatArrivalTime(params.timeRemainingMinutes);
  const arrow = getManeuverArrow(params.maneuverType, params.maneuverModifier);
  const cleanInstruction = params.instruction.replace(/^[⬆️➡️⬅️↖️↗️↘️↙️🔄🏁\s]+/, '').trim();
  const title = `${cleanInstruction}   ${arrow}`;
  const routeStatus = params.isSafeRoute !== false ? '🛡️ Rota Segura Ativa' : '⚠️ Rota Direta';
  const body = `${params.destinationName} • Chegada às ${etaTime}\n${distText} (${params.timeRemainingMinutes} min) • ${routeStatus}`;

  try {
    // Dismiss prior notification to ensure Android notification tray keeps only 1 clean card
    await Notifications.dismissNotificationAsync('sentinela_active_nav').catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: 'sentinela_active_nav',
      content: {
        title,
        body,
        sticky: true,
        autoDismiss: false,
        color: '#0284C7',
        data: { type: 'navigation_active' },
      },
      trigger: { channelId: 'sentinela_navigation' },
    });
  } catch (err) {
    console.warn('[NavigationNotification] Erro ao atualizar notificação:', err);
  }
}

/**
 * Dismisses the persistent ongoing navigation notification
 */
export async function dismissNavigationNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync('sentinela_active_nav').catch(() => {});
    await Notifications.cancelScheduledNotificationAsync('sentinela_active_nav').catch(() => {});
  } catch (err) {
    console.warn('[NavigationNotification] Erro ao fechar notificação:', err);
  }
}
