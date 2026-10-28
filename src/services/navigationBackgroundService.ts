import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { NavigationState } from '../types/navigation';
import { calculateDistanceMeters } from '../utils/geo';
import { calculateCurrentStepIndex } from '../utils/navigationHelper';
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
          title: 'Chegou ao Destino!',
          body: `Chegou com sucesso a ${activeNav.destinationName}.`,
        });
        await saveActiveNavigation(null);
        await stopNavigationBackgroundTracking();
        return;
      }

      const speedMetersPerMin = activeNav.mode === 'driving' ? 500 : 75;
      const remainingMins = Math.max(1, Math.round(distRemaining / speedMetersPerMin));

      // Determine current step dynamically based on distance traveled
      const steps = activeNav.route?.steps || [];
      const totalDist = activeNav.route?.distanceMeters || distRemaining;
      const stepIndex = calculateCurrentStepIndex(steps, distRemaining, totalDist, activeNav.currentStepIndex);
      const currentStep = steps[stepIndex] || {
        instruction: `Siga em direção a ${activeNav.destinationName}`,
      };

      // Update the single persistent ongoing notification in the status bar
      await updateNavigationNotification({
        instruction: currentStep.instruction,
        distanceRemainingMeters: distRemaining,
        timeRemainingMinutes: remainingMins,
        destinationName: activeNav.destinationName,
        isSafeRoute: activeNav.route?.isSafe,
        maneuverType: currentStep.maneuverType,
        maneuverModifier: currentStep.maneuverModifier,
      });

      // Update stored state
      const updatedNav: NavigationState = {
        ...activeNav,
        currentStepIndex: stepIndex,
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
 * Starts active turn-by-turn navigation tracking.
 * Respects "Permitir apenas enquanto uso a app" without forcing the user to the OS Settings page.
 * If the user already granted "Permitir sempre", it also registers the background location task.
 */
export async function startNavigationBackgroundTracking(navState: NavigationState): Promise<boolean> {
  try {
    await saveActiveNavigation(navState);

    const existingFg = await Location.getForegroundPermissionsAsync();
    if (existingFg.status !== 'granted') {
      const reqFg = await Location.requestForegroundPermissionsAsync();
      if (reqFg.status !== 'granted') return false;
    }

    // Check if background permission is ALREADY granted, WITHOUT calling requestBackgroundPermissionsAsync()!
    // Calling requestBackgroundPermissionsAsync() when user selected "While using the app" forces Android 11-16
    // to jump out of the app into the Android Settings "Autorização de Localização" screen every time a route starts.
    let hasBackgroundPermission = false;
    if (Platform.OS === 'android') {
      const existingBg = await Location.getBackgroundPermissionsAsync();
      hasBackgroundPermission = existingBg.status === 'granted';
    } else {
      hasBackgroundPermission = true;
    }

    if (hasBackgroundPermission) {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(SENTINELA_NAVIGATION_TASK);
      if (!isRunning) {
        const isDriving = navState.mode === 'driving';
        await Location.startLocationUpdatesAsync(SENTINELA_NAVIGATION_TASK, {
          accuracy: isDriving ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
          timeInterval: isDriving ? 1000 : 2500,
          distanceInterval: isDriving ? 1 : 3,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Sentinela Navegação',
            notificationBody: `A guiar em direção a ${navState.destinationName}`,
            notificationColor: '#0284C7',
          },
        });
      }
    }

    console.log('[NavBackground] Navegação ativa iniciada (Segundo plano total:', hasBackgroundPermission, ')');
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
