import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { NavigationState } from '../types/navigation';
import { calculateDistanceMeters } from '../utils/geo';
import { loadActiveNavigation, saveActiveNavigation } from './storage';
import { updateNavigationNotification, dismissNavigationNotification, sendSystemNotification } from './notifications';

export const SENTINELA_NAVIGATION_TASK = 'SENTINELA_NAVIGATION_TASK';

// Define the background navigation task
TaskManager.defineTask(SENTINELA_NAVIGATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[NavBackground] Erro na tarefa de navegação em segundo plano:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latest = locations[locations.length - 1];
    const userLat = latest.coords.latitude;
    const userLon = latest.coords.longitude;

    try {
      const activeNav = await loadActiveNavigation();
      if (!activeNav || !activeNav.isActive) {
        await stopNavigationBackgroundTracking();
        return;
      }

      const dest = activeNav.destinationCoord;
      const distRemaining = calculateDistanceMeters(
        userLat,
        userLon,
        dest.latitude,
        dest.longitude
      );

      // Check for arrival (< 20 meters)
      if (distRemaining <= 20) {
        await sendSystemNotification({
          title: '🏁 Chegou ao Destino!',
          body: `Chegou com sucesso a ${activeNav.destinationName}.`,
        });
        await saveActiveNavigation(null);
        await stopNavigationBackgroundTracking();
        return;
      }

      const speedMetersPerMin = activeNav.mode === 'driving' ? 500 : 75;
      const remainingMins = Math.max(1, Math.round(distRemaining / speedMetersPerMin));

      // Determine current step instruction
      const steps = activeNav.route?.steps || [];
      const currentStep = steps[activeNav.currentStepIndex] || {
        instruction: `Siga em direção a ${activeNav.destinationName}`,
      };

      // Update the persistent ongoing notification in the status bar
      await updateNavigationNotification({
        instruction: currentStep.instruction,
        distanceRemainingMeters: distRemaining,
        timeRemainingMinutes: remainingMins,
        destinationName: activeNav.destinationName,
      });

      // Update stored state
      const updatedNav: NavigationState = {
        ...activeNav,
        distanceRemainingMeters: distRemaining,
        timeRemainingMinutes: remainingMins,
      };
      await saveActiveNavigation(updatedNav);
    } catch (err) {
      console.warn('[NavBackground] Erro ao processar atualização de localização:', err);
    }
  }
});

/**
 * Starts active turn-by-turn navigation background tracking with Foreground Service
 */
export async function startNavigationBackgroundTracking(navState: NavigationState): Promise<boolean> {
  try {
    await saveActiveNavigation(navState);

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('[NavBackground] Permissão de segundo plano não total');
      }
    }

    const firstStep = navState.route?.steps?.[0]?.instruction || `Siga em direção a ${navState.destinationName}`;
    const initialDist = navState.distanceRemainingMeters >= 1000
      ? `${(navState.distanceRemainingMeters / 1000).toFixed(1)} km`
      : `${Math.round(navState.distanceRemainingMeters)} m`;

    const isRunning = await Location.hasStartedLocationUpdatesAsync(SENTINELA_NAVIGATION_TASK);
    if (!isRunning) {
      await Location.startLocationUpdatesAsync(SENTINELA_NAVIGATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 4000,   // Updates every 4 seconds during active navigation
        distanceInterval: 5,  // Or every 5 meters moved
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: `⬆️ ${firstStep}`,
          notificationBody: `${navState.destinationName} • ${navState.timeRemainingMinutes} min (${initialDist})`,
          notificationColor: '#0284C7',
        },
      });
    }

    // Also dispatch ongoing system notification via expo-notifications
    await updateNavigationNotification({
      instruction: firstStep,
      distanceRemainingMeters: navState.distanceRemainingMeters,
      timeRemainingMinutes: navState.timeRemainingMinutes,
      destinationName: navState.destinationName,
    });

    console.log('[NavBackground] Serviço de navegação em primeiro plano iniciado com sucesso');
    return true;
  } catch (err) {
    console.warn('[NavBackground] Erro ao iniciar serviço de navegação:', err);
    return false;
  }
}

/**
 * Stops active turn-by-turn navigation background tracking and clears persistent notification
 */
export async function stopNavigationBackgroundTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(SENTINELA_NAVIGATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(SENTINELA_NAVIGATION_TASK);
    }
    await saveActiveNavigation(null);
    await dismissNavigationNotification();
    console.log('[NavBackground] Serviço de navegação parado e notificação removida');
  } catch (err) {
    console.warn('[NavBackground] Erro ao parar serviço de navegação:', err);
  }
}
