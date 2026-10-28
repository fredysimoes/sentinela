import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  AppState,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import Haptics from './src/utils/haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Incident, IncidentCategory, SOSAlert, EmergencyContact, UserLocation, SafePlace, HomeAddress, NotificationSettings } from './src/types';
import { CATEGORIES } from './src/constants/categories';
import { getSafePlaces, SafePlaceWithDistance, loadLiveOsmPlacesForRegion } from './src/services/safePlacesService';
import {
  loadIncidents,
  saveIncidents,
  loadEmergencyContacts,
  saveEmergencyContacts,
  loadActiveSOSAlerts,
  saveActiveSOSAlerts,
  loadHomeAddress,
  saveHomeAddress,
  loadNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from './src/services/storage';
import {
  requestNotificationPermissions,
  sendDangerProximityPushNotification,
  subscribeToInAppNotifications,
} from './src/services/notifications';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  checkProximityAndNotify,
} from './src/services/backgroundLocation';
import {
  startNavigationBackgroundTracking,
  stopNavigationBackgroundTracking,
} from './src/services/navigationBackgroundService';
import { updateNavigationNotification, dismissNavigationNotification } from './src/services/notifications';
import { calculateCurrentStepIndex } from './src/utils/navigationHelper';
import { PedestrianRoute, NavigationState, RouteCoordinate, TransportMode, RouteSimulationState } from './src/types/navigation';
import { calculateSafeNavigationRoutes } from './src/services/routingService';
import { NavigationBanner } from './src/components/NavigationBanner';
import { SimulationController } from './src/components/SimulationController';
import { RoutePreviewModal } from './src/components/RoutePreviewModal';
import { SearchBar } from './src/components/SearchBar';
import { MapComponent } from './src/components/MapComponent';
import { ReportModal } from './src/components/ReportModal';
import { SOSModal } from './src/components/SOSModal';
import { IncidentDetailSheet } from './src/components/IncidentDetailSheet';
import { SafePlaceDetailSheet } from './src/components/SafePlaceDetailSheet';
import { SelectedPlaceSheet, SelectedMapPoint } from './src/components/SelectedPlaceSheet';
import { EmergencyContactsModal } from './src/components/EmergencyContactsModal';
import { HomeModal } from './src/components/HomeModal';
import { SettingsModal } from './src/components/SettingsModal';
import { setTorch, setKeepScreenOn } from './src/services/torch';
import { ProtestLightModal } from './src/components/ProtestLightModal';
import { ProtestRightsModal } from './src/components/ProtestRightsModal';
import { M3Pressable } from './src/components/M3MotionWrapper';
import { MaterialAlertBanner } from './src/components/MaterialAlertBanner';
import { FeedbackModal } from './src/components/FeedbackModal';
import { AuthModal } from './src/components/AuthModal';
import { SentinelsModal } from './src/components/SentinelsModal';
import { StalkingActiveModal } from './src/components/StalkingActiveModal';
import { LiveSentinelTrackerModal } from './src/components/LiveSentinelTrackerModal';
import { TvdeTripModal } from './src/components/TvdeTripModal';
import {
  TvdeTripSession,
  ParsedTvdeDraft,
  loadActiveTvdeTrip,
  saveActiveTvdeTrip,
  checkPendingSharedTrip,
  checkPendingNotificationTrip,
  subscribeToTvdeNativeEvents,
  parseAndEnrichTvdeTrip,
} from './src/services/tvdeService';
import { onAuthStateChange, UserProfile, signOutUser, initAuthDeepLinkListener } from './src/services/authService';
import { fetchMySentinels, SentinelContact } from './src/services/sentinelsService';
import {
  startStalkingTrackingSession,
  stopStalkingTrackingSession,
  getActiveStalkingSession,
  subscribeToStalkingAlertsForSentinel,
  StalkingTrackingSession,
} from './src/services/stalkingService';
import { syncPendingFeedback } from './src/services/feedbackService';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from './src/theme/m3';
import { calculateDistanceMeters, formatDistance, isProtestInfiltratorVerified, calculateTriangulatedCluster } from './src/utils/geo';
import { getPharmacyStatus } from './src/utils/pharmacySchedule';
import { reverseGeocodeCoordinate } from './src/services/geocodingService';
import {
  isSupabaseConfigured,
  fetchOnlineIncidents,
  createOnlineIncident,
  confirmIncidentOnline,
  dismissIncidentOnline,
  deleteIncidentOnline,
  broadcastOnlineSOS,
  resolveOnlineSOS,
  subscribeToOnlineIncidents,
  subscribeToOnlineSOS,
} from './src/services/supabase';

export default function App() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeSOSAlerts, setActiveSOSAlerts] = useState<SOSAlert[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [safePlaces, setSafePlaces] = useState<SafePlaceWithDistance[]>([]);
  const [selectedSafePlace, setSelectedSafePlace] = useState<SafePlace | null>(null);
  const [additionalPlaces, setAdditionalPlaces] = useState<SafePlace[]>([]);
  const regionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRegionChangeComplete = (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    // Only search if zoomed in enough (delta < 0.15 ~= 15km) to prevent heavy queries
    if (region.latitudeDelta > 0.15) return;

    if (regionTimeoutRef.current) {
      clearTimeout(regionTimeoutRef.current);
    }

    regionTimeoutRef.current = setTimeout(async () => {
      const osmResults = await loadLiveOsmPlacesForRegion(region);
      if (osmResults.length > 0) {
        setAdditionalPlaces((prev) => {
          const merged = [...prev];
          for (const item of osmResults) {
            if (!merged.some((m) => m.id === item.id)) {
              merged.push(item);
            }
          }
          const lat = userLocation?.latitude ?? region.latitude;
          const lon = userLocation?.longitude ?? region.longitude;
          const updated = getSafePlaces('all', lat, lon, merged);
          setSafePlaces(updated);
          return merged;
        });
      }
    }, 700);
  };

  // Filtering & Modal States
  const [selectedFilter, setSelectedFilter] = useState<IncidentCategory | null>(null);
  const [showPoliceOnMap, setShowPoliceOnMap] = useState(true);
  const [showPharmaciesOnMap, setShowPharmaciesOnMap] = useState(true);
  const [showHospitalsOnMap, setShowHospitalsOnMap] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedMapPoint, setSelectedMapPoint] = useState<SelectedMapPoint | null>(null);
  const [homeAddress, setHomeAddress] = useState<HomeAddress | null>(null);
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isTorchActive, setIsTorchActive] = useState(false);
  const [showStrobeModal, setShowStrobeModal] = useState(false);
  const [showProtestRightsModal, setShowProtestRightsModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<IncidentCategory>('dark_area');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const incidentsRef = useRef<Incident[]>([]);
  const notificationSettingsRef = useRef<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  const [targetCoordinate, setTargetCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeBanner, setActiveBanner] = useState<{
    title: string;
    body: string;
    type: 'sos_alert' | 'proximity_alert';
  } | null>(null);

  // User Profile, Sentinelas, & "Estou a ser seguido" Stalking Session States
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [mySentinels, setMySentinels] = useState<SentinelContact[]>([]);
  const [activeStalkingSession, setActiveStalkingSession] = useState<StalkingTrackingSession | null>(null);
  const [incomingStalkingAlert, setIncomingStalkingAlert] = useState<StalkingTrackingSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSentinelsModal, setShowSentinelsModal] = useState(false);
  const [showIncomingTrackerModal, setShowIncomingTrackerModal] = useState(false);

  // TVDE Ride Protection States (Uber / Bolt / Táxi)
  const [showTvdeModal, setShowTvdeModal] = useState(false);
  const [activeTvdeTrip, setActiveTvdeTrip] = useState<TvdeTripSession | null>(null);
  const [incomingTvdeDraft, setIncomingTvdeDraft] = useState<ParsedTvdeDraft | null>(null);
  const [mapRecenterSignal, setMapRecenterSignal] = useState(0);

  useEffect(() => {
    // Load any persisted active TVDE trip
    loadActiveTvdeTrip().then((savedTrip) => {
      if (savedTrip) {
        setActiveTvdeTrip(savedTrip);
      }
    });

    // Check if Android launched the app via Share Sheet ("Partilhar Viagem" from Uber/Bolt)
    checkPendingSharedTrip().then(async (shared) => {
      if (shared && shared.text) {
        const parsed = await parseAndEnrichTvdeTrip(
          `${shared.subject ? shared.subject + ' ' : ''}${shared.text}`,
          'share_sheet'
        );
        setIncomingTvdeDraft(parsed);
        setShowTvdeModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });

    // Check if Android NotificationListener captured a pending Uber/Bolt trip notification
    checkPendingNotificationTrip().then(async (notif) => {
      if (notif) {
        const combined = [notif.title, notif.text, notif.bigText].filter(Boolean).join(' • ');
        const parsed = await parseAndEnrichTvdeTrip(combined, 'notification', notif.packageName);
        setIncomingTvdeDraft(parsed);
        setShowTvdeModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    });

    // Subscribe to real-time Share Sheet and NotificationListener events while app is open/backgrounded
    const unsubscribeTvde = subscribeToTvdeNativeEvents({
      onSharedTrip: async (shared) => {
        if (!shared?.text) return;
        const parsed = await parseAndEnrichTvdeTrip(
          `${shared.subject ? shared.subject + ' ' : ''}${shared.text}`,
          'share_sheet'
        );
        setIncomingTvdeDraft(parsed);
        setShowTvdeModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onNotificationTrip: async (notif) => {
        const combined = [notif.title, notif.text, notif.bigText].filter(Boolean).join(' • ');
        if (!combined) return;
        const parsed = await parseAndEnrichTvdeTrip(combined, 'notification', notif.packageName);
        setIncomingTvdeDraft(parsed);
        setActiveBanner({
          title: `Viagem ${parsed.platform} Detetada`,
          body: [
            parsed.licensePlate ? `Matrícula: ${parsed.licensePlate}` : '',
            parsed.vehicleModel || '',
            parsed.driverName ? `Motorista: ${parsed.driverName}` : '',
          ]
            .filter(Boolean)
            .join(' • ') || 'Toque em Viagem TVDE para ativar o acompanhamento.',
          type: 'proximity_alert',
        });
        setShowTvdeModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      },
    });

    return () => {
      unsubscribeTvde();
    };
  }, []);

  const handleStartTvdeTrip = async (trip: TvdeTripSession) => {
    setActiveTvdeTrip(trip);
    setIncomingTvdeDraft(null);
    await saveActiveTvdeTrip(trip);
  };

  const handleEndTvdeTrip = async () => {
    setActiveTvdeTrip(null);
    setIncomingTvdeDraft(null);
    await saveActiveTvdeTrip(null);
  };

  const handleToggleTorch = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextState = !isTorchActive;
    setIsTorchActive(nextState);
    await setTorch(nextState);
  };

  const handleOpenStrobe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowStrobeModal(true);
  };

  const handleSaveNotificationSettings = async (newSettings: NotificationSettings) => {
    const userJustEnabledBackground = !notificationSettings.backgroundTracking && newSettings.backgroundTracking;
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
    if (!newSettings.protestMode && isTorchActive) {
      setIsTorchActive(false);
      await setTorch(false);
    }
    if (newSettings.enabled && newSettings.backgroundTracking) {
      const started = await startBackgroundLocationTracking(userJustEnabledBackground);
      if (!started && userJustEnabledBackground) {
        const reverted = { ...newSettings, backgroundTracking: false };
        setNotificationSettings(reverted);
        await saveNotificationSettings(reverted);
      }
    } else {
      await stopBackgroundLocationTracking();
    }
  };

  const handleSaveHomeAddress = (home: HomeAddress | null) => {
    setHomeAddress(home);
    saveHomeAddress(home);
  };

  const handlePressHome = () => {
    if (!homeAddress) {
      Haptics.selectionAsync();
      setShowHomeModal(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleRequestNavigation('Casa', {
      latitude: homeAddress.latitude,
      longitude: homeAddress.longitude,
    });
  };

  const handleSelectMapPoint = (point: SelectedMapPoint) => {
    Haptics.selectionAsync();
    setSelectedIncident(null);
    setSelectedSafePlace(null);
    setSelectedMapPoint(point);
  };

  const handleMapClickCoordinate = async (coord: { latitude: number; longitude: number }) => {
    // If a sheet was already open, tap on empty map dismisses it
    if (selectedMapPoint || selectedIncident || selectedSafePlace) {
      setSelectedMapPoint(null);
      setSelectedIncident(null);
      setSelectedSafePlace(null);
      return;
    }

    // Tapped on the map: drop pin and reverse geocode location name
    Haptics.selectionAsync();
    setSelectedMapPoint({
      name: 'A carregar local...',
      latitude: coord.latitude,
      longitude: coord.longitude,
    });

    const geo = await reverseGeocodeCoordinate(coord.latitude, coord.longitude);
    setSelectedMapPoint({
      name: geo.title,
      subtitle: geo.subtitle,
      latitude: coord.latitude,
      longitude: coord.longitude,
    });
  };

  // Navigation & Simulation States
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [simulationState, setSimulationState] = useState<RouteSimulationState | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [isAnimatingRouteDraw, setIsAnimatingRouteDraw] = useState(false);
  const [previewSafeRoute, setPreviewSafeRoute] = useState<PedestrianRoute | null>(null);
  const [previewDirectRoute, setPreviewDirectRoute] = useState<PedestrianRoute | undefined>(undefined);
  const [previewOriginName, setPreviewOriginName] = useState('A minha localização');
  const [previewOriginCoord, setPreviewOriginCoord] = useState<RouteCoordinate | null>(null);
  const [previewDestName, setPreviewDestName] = useState('');
  const [previewDestCoord, setPreviewDestCoord] = useState<RouteCoordinate | null>(null);
  const routeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure screen stays awake during navigation, driving, simulation, or TVDE protection
  useEffect(() => {
    setKeepScreenOn(true);
  }, [navState, transportMode, activeTvdeTrip]);

  const handleRequestNavigation = async (
    destName: string,
    destCoord: RouteCoordinate,
    mode: TransportMode = transportMode,
    customOrigin?: { name: string; coord: RouteCoordinate }
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. Immediately collapse any open detail sheet or route preview so the user can watch the map
    setSelectedSafePlace(null);
    setSelectedIncident(null);
    setSelectedMapPoint(null);
    setShowRoutePreview(false);

    if (routeAnimTimerRef.current) {
      clearTimeout(routeAnimTimerRef.current);
      routeAnimTimerRef.current = null;
    }

    const originCoord: RouteCoordinate =
      customOrigin?.coord ||
      previewOriginCoord || {
        latitude: userLocation?.latitude ?? 41.1501,
        longitude: userLocation?.longitude ?? -8.6112,
      };

    const originName = customOrigin?.name || (previewOriginCoord ? previewOriginName : 'A minha localização');

    setPreviewOriginName(originName);
    setPreviewOriginCoord(originCoord);
    setPreviewDestName(destName);
    setPreviewDestCoord(destCoord);
    setTransportMode(mode);

    const routes = await calculateSafeNavigationRoutes({
      origin: originCoord,
      destination: destCoord,
      incidents,
      mode,
    });

    // 2. Render route on the map and let the progressive neon route animation play out in full view (2.4s)
    setPreviewSafeRoute(routes.safeRoute);
    setPreviewDirectRoute(routes.directRoute);
    setIsAnimatingRouteDraw(true);

    // 3. Only slide the RoutePreviewModal back up once the route drawing animation completes!
    routeAnimTimerRef.current = setTimeout(() => {
      setIsAnimatingRouteDraw(false);
      setShowRoutePreview(true);
    }, 2450);
  };

  const handleUpdateRouteEndpoints = async (
    newOrigin: { name: string; coord: RouteCoordinate },
    newDest: { name: string; coord: RouteCoordinate }
  ) => {
    await handleRequestNavigation(newDest.name, newDest.coord, transportMode, newOrigin);
  };

  const handleTogglePreviewMode = async (newMode: TransportMode) => {
    if (!previewDestCoord) return;
    Haptics.selectionAsync();
    setTransportMode(newMode);
    const origin: RouteCoordinate = previewOriginCoord || {
      latitude: userLocation?.latitude ?? 41.1501,
      longitude: userLocation?.longitude ?? -8.6112,
    };
    const routes = await calculateSafeNavigationRoutes({
      origin,
      destination: previewDestCoord,
      incidents,
      mode: newMode,
    });
    setPreviewSafeRoute(routes.safeRoute);
    setPreviewDirectRoute(routes.directRoute);
  };

  const startRealNavigation = async (chosenRoute: PedestrianRoute) => {
    if (!previewDestCoord) return;

    // Suspend idle background proximity alerts to ensure only one navigation notification is shown
    await stopBackgroundLocationTracking();

    const newNavState: NavigationState = {
      isActive: true,
      destinationName: previewDestName,
      destinationCoord: previewDestCoord,
      route: chosenRoute,
      mode: chosenRoute.mode || transportMode,
      currentStepIndex: 0,
      distanceRemainingMeters: chosenRoute.distanceMeters,
      timeRemainingMinutes: chosenRoute.durationMinutes,
    };

    setNavState(newNavState);
    setSimulationState(null);
    setShowRoutePreview(false);
    setSelectedSafePlace(null);
    setSelectedIncident(null);
    setSelectedMapPoint(null);
    setPreviewOriginCoord(null);
    setPreviewOriginName('A minha localização');

    // Start background navigation tracking with ongoing foreground notification
    await startNavigationBackgroundTracking(newNavState);
  };

  const handleStartSimulation = (chosenRoute: PedestrianRoute) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const origName = previewOriginName || 'A minha localização';
    const destName = previewDestName;

    setShowRoutePreview(false);
    setSelectedSafePlace(null);
    setSelectedIncident(null);
    setSelectedMapPoint(null);

    setSimulationState({
      isActive: true,
      route: chosenRoute,
      currentStepIndex: 0,
      isPlaying: false,
      originName: origName,
      destinationName: destName,
    });
  };

  const handleStepSimulation = (nextIndex: number) => {
    setSimulationState((prev) => {
      if (!prev) return null;
      const steps = prev.route.steps || [];
      const clampedIndex = Math.max(0, Math.min(steps.length - 1, nextIndex));
      return { ...prev, currentStepIndex: clampedIndex };
    });
  };

  const handleToggleSimulationPlay = () => {
    setSimulationState((prev) => (prev ? { ...prev, isPlaying: !prev.isPlaying } : null));
  };

  const handleExitSimulation = () => {
    Haptics.selectionAsync();
    setSimulationState(null);
  };

  // Auto-play interval for simulation
  useEffect(() => {
    if (!simulationState || !simulationState.isPlaying) return;

    const timer = setInterval(() => {
      setSimulationState((prev) => {
        if (!prev || !prev.isPlaying) return prev;
        const steps = prev.route.steps || [];
        const nextIdx = prev.currentStepIndex + 1;
        if (nextIdx >= steps.length) {
          return { ...prev, isPlaying: false, currentStepIndex: steps.length - 1 };
        }
        return { ...prev, currentStepIndex: nextIdx };
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [simulationState?.isPlaying, simulationState?.route?.steps?.length]);

  const handleStartNavigation = async (chosenRoute: PedestrianRoute) => {
    if (!previewDestCoord) return;

    // Check if user is planning from a distant origin (> 250m from their physical GPS location)
    if (previewOriginCoord && userLocation) {
      const distToOrigin = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        previewOriginCoord.latitude,
        previewOriginCoord.longitude
      );

      if (distToOrigin > 250) {
        Alert.alert(
          'Ponto de Partida Distante',
          `Encontra-se a ${formatDistance(distToOrigin)} do ponto de partida (${previewOriginName || 'Partida'}).\n\nDeseja simular o percurso para planear com antecedência ou iniciar a navegação ativa no local?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: '🎮 Simular Percurso',
              onPress: () => handleStartSimulation(chosenRoute),
            },
            {
              text: 'Iniciar Navegação',
              style: 'default',
              onPress: () => startRealNavigation(chosenRoute),
            },
          ]
        );
        return;
      }
    }

    await startRealNavigation(chosenRoute);
  };

  const handleExitNavigation = async () => {
    Haptics.selectionAsync();
    setNavState(null);
    await stopNavigationBackgroundTracking();

    // Resume idle background proximity alerts if enabled in settings
    if (notificationSettings.enabled && notificationSettings.backgroundTracking) {
      startBackgroundLocationTracking();
    }
  };

  // Update active turn-by-turn navigation state dynamically as user moves
  useEffect(() => {
    if (!navState || !userLocation) return;

    const destCoord = navState.destinationCoord;
    const distToDest = calculateDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      destCoord.latitude,
      destCoord.longitude
    );

    // If within 15 meters of destination, user has arrived safely!
    if (distToDest <= 15) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Chegou ao Destino', `Chegou com sucesso a ${navState.destinationName}!`);
      setNavState(null);
      stopNavigationBackgroundTracking();
      if (notificationSettings.enabled && notificationSettings.backgroundTracking) {
        startBackgroundLocationTracking();
      }
      return;
    }

    const speedMetersPerMin = navState.mode === 'driving' ? 500 : 75;
    const remainingMins = Math.max(1, Math.round(distToDest / speedMetersPerMin));

    // Dynamically calculate current step along route
    const steps = navState.route?.steps || [];
    const totalDist = navState.route?.distanceMeters || distToDest;
    const stepIndex = calculateCurrentStepIndex(steps, distToDest, totalDist, navState.currentStepIndex);
    const currentStep = steps[stepIndex] || {
      instruction: `Siga em direção a ${navState.destinationName}`,
    };

    setNavState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentStepIndex: stepIndex,
        distanceRemainingMeters: distToDest,
        timeRemainingMinutes: remainingMins,
      };
    });

    // Update persistent notification ONLY when app is minimized or screen locked
    if (AppState.currentState !== 'active') {
      updateNavigationNotification({
        instruction: currentStep.instruction,
        distanceRemainingMeters: distToDest,
        timeRemainingMinutes: remainingMins,
        destinationName: navState.destinationName,
        isSafeRoute: navState.route?.isSafe,
        maneuverType: currentStep.maneuverType,
        maneuverModifier: currentStep.maneuverModifier,
      });
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Manage persistent navigation notification: ONLY show when minimized / screen locked, dismiss when app is open
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App opened / brought to foreground: hide OS notification immediately
        dismissNavigationNotification();
      } else if (navState && (nextAppState === 'background' || nextAppState === 'inactive')) {
        // App minimized or phone locked: display persistent turn-by-turn notification immediately
        const steps = navState.route?.steps || [];
        const currentStep = steps[navState.currentStepIndex || 0] || {
          instruction: `Siga em direção a ${navState.destinationName}`,
        };
        updateNavigationNotification({
          instruction: currentStep.instruction,
          distanceRemainingMeters: navState.distanceRemainingMeters,
          timeRemainingMinutes: navState.timeRemainingMinutes,
          destinationName: navState.destinationName,
          isSafeRoute: navState.route?.isSafe,
          maneuverType: currentStep.maneuverType,
          maneuverModifier: currentStep.maneuverModifier,
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navState]);

  // Initialize App, Location, Heading/Compass, and Notifications
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    // Listen for in-app alert notifications
    const unsubscribeNotifications = subscribeToInAppNotifications((banner) => {
      setActiveBanner(banner);
      setTimeout(() => {
        setActiveBanner(null);
      }, 7000);
    });

    async function initApp() {
      // 1. Request Push Notification permissions
      await requestNotificationPermissions();

      // Sync any stored offline feedbacks
      syncPendingFeedback().catch(() => {});

      // 2. Check existing Foreground Location permission first before requesting
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        Alert.alert(
          'Permissão de Localização',
          'O Sentinela necessita da sua localização para mostrar alertas de segurança no seu percurso e enviar socorro no modo SOS.'
        );
      }

      // 3. Get initial position quickly (try last known first, then current with timeout)
      let initialLat = 38.7223; // default Lisbon center
      let initialLon = -9.1393;

      try {
        const lastPos = await Location.getLastKnownPositionAsync({});
        if (lastPos) {
          initialLat = lastPos.coords.latitude;
          initialLon = lastPos.coords.longitude;
          setUserLocation({
            latitude: initialLat,
            longitude: initialLon,
            accuracy: lastPos.coords.accuracy,
          });
        }

        // Get fresh accurate location without hanging
        const currentPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
        const pos = await Promise.race([currentPromise, timeoutPromise]);

        if (pos) {
          initialLat = pos.coords.latitude;
          initialLon = pos.coords.longitude;
          setUserLocation({
            latitude: initialLat,
            longitude: initialLon,
            accuracy: pos.coords.accuracy,
          });
        }
      } catch (e) {
        console.warn('Erro ao obter localização inicial:', e);
      }

      // 4. Load persisted real community incidents (clean of all demo seeds and resolved/dismissed items)
      const storedIncidents = await loadIncidents(initialLat, initialLon);
      const cleanStored = storedIncidents.filter(
        (i) =>
          !i.id.startsWith('seed-') &&
          (i.dismissals || 0) < (i.confirmations || 1) &&
          (i.dismissals || 0) < 5
      );
      setIncidents(cleanStored);

      // If Supabase is configured, fetch live community reports
      let cleanOnline: Incident[] = [];
      if (isSupabaseConfigured()) {
        try {
          const online = await fetchOnlineIncidents();
          cleanOnline = online.filter(
            (i) =>
              !i.id.startsWith('seed-') &&
              (i.dismissals || 0) < (i.confirmations || 1) &&
              (i.dismissals || 0) < 5
          );
          setIncidents(cleanOnline);
          await saveIncidents(cleanOnline);
        } catch (e) {
          console.warn('Erro ao carregar dados online do Supabase:', e);
        }
      }

      const storedContacts = await loadEmergencyContacts();
      setEmergencyContacts(storedContacts);

      const storedSOS = await loadActiveSOSAlerts();
      setActiveSOSAlerts(storedSOS);

      const savedHome = await loadHomeAddress();
      setHomeAddress(savedHome);

      // Load user proximity notification settings and start background tracking ONLY if background permission is already granted
      const savedSettings = await loadNotificationSettings();
      setNotificationSettings(savedSettings);
      if (savedSettings.enabled && savedSettings.backgroundTracking) {
        startBackgroundLocationTracking(false);
      }

      // Load safe places (Police, Pharmacies & Hospitals across Portugal)
      const places = getSafePlaces('all', initialLat, initialLon);
      setSafePlaces(places);

      // 5. High-frequency GPS watch for zero-lag driving and walking navigation
      try {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 1, // update every 1 meter for smooth real-time vehicle & pedestrian movement
            timeInterval: 1000,  // 1 Hz GPS polling (zero delay while driving on the road)
          },
          (loc) => {
            const newLoc = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
            };
            setUserLocation(newLoc);

            // If vehicle/pedestrian is moving (> 1.2 m/s ~ 4.3 km/h) and GPS provides course heading, use it for road alignment
            if (
              typeof loc.coords.speed === 'number' &&
              loc.coords.speed > 1.2 &&
              typeof loc.coords.heading === 'number' &&
              loc.coords.heading >= 0
            ) {
              setUserHeading(Math.round(loc.coords.heading));
            }

            // Check real-time proximity to hazards using latest incidents and settings
            checkProximityAndNotify(
              newLoc.latitude,
              newLoc.longitude,
              incidentsRef.current,
              notificationSettingsRef.current
            );
          }
        );
      } catch (err) {
        console.warn('Erro ao subscrever watchPosition:', err);
      }

      // 6. Watch compass / gyroscope orientation heading (throttled to keep 60 FPS)
      try {
        let lastHeadingTime = 0;
        let lastHeadingVal = 0;

        headingSubscription = await Location.watchHeadingAsync((headingData) => {
          const heading =
            headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
          if (typeof heading === 'number' && !isNaN(heading)) {
            const rounded = Math.round(heading);
            const now = Date.now();
            const diff = Math.abs(rounded - lastHeadingVal);
            const wrappedDiff = Math.min(diff, 360 - diff);

            // Throttle: only update state if 150ms has elapsed AND heading changed by at least 2.5 degrees
            if (now - lastHeadingTime >= 150 && wrappedDiff >= 2.5) {
              lastHeadingTime = now;
              lastHeadingVal = rounded;
              setUserHeading(rounded);
            }
          }
        });
      } catch (err) {
        console.warn('Erro ao subscrever orientação bússola/giroscópio:', err);
      }

      // 7. Subscribe to Supabase Realtime community broadcasts
      if (isSupabaseConfigured()) {
        subscribeToOnlineIncidents(async () => {
          const fresh = await fetchOnlineIncidents();
          const cleanFresh = fresh.filter(
            (i) =>
              !i.id.startsWith('seed-') &&
              (i.dismissals || 0) < (i.confirmations || 1) &&
              (i.dismissals || 0) < 5
          );
          setIncidents(cleanFresh);
          await saveIncidents(cleanFresh);
        });

        subscribeToOnlineSOS(
          (newSOS) => {
            setActiveSOSAlerts((prev) => [newSOS, ...prev.filter((s) => s.id !== newSOS.id)]);
            setActiveBanner({
              title: '🚨 ALERTA SOS EM DIRETO',
              body: 'Pedestre em perigo reportado nesta área!',
              type: 'sos_alert',
            });
          },
          (removedId) => {
            setActiveSOSAlerts((prev) => prev.filter((s) => s.id !== removedId));
          }
        );
      }
    }

    initApp();

    return () => {
      unsubscribeNotifications();
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, []);

  // Listen for Supabase Auth state, Sentinels, and Stalking alerts
  useEffect(() => {
    // 1. Check local session in progress
    getActiveStalkingSession().then((session) => {
      if (session && session.status === 'active') {
        setActiveStalkingSession(session);
      }
    });

    // 2. Subscribe to Auth State
    const unsubscribeAuth = onAuthStateChange((profile) => {
      setCurrentUserProfile(profile);
      if (profile) {
        setShowAuthModal(false);
        fetchMySentinels(profile.id).then(setMySentinels);
      } else {
        setMySentinels([]);
      }
    });

    // 3. Deep link listener for OAuth redirect (sentinela://)
    const unsubscribeDeepLink = initAuthDeepLinkListener((profile) => {
      setCurrentUserProfile(profile);
      setShowAuthModal(false);
      fetchMySentinels(profile.id).then(setMySentinels);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDeepLink();
    };
  }, []);

  // Subscribe to incoming stalking alerts when user profile is active
  useEffect(() => {
    if (!currentUserProfile?.id) return;

    const unsubscribeStalking = subscribeToStalkingAlertsForSentinel(
      currentUserProfile.id,
      (alertSession) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setIncomingStalkingAlert(alertSession);
        setShowIncomingTrackerModal(true);
        setActiveBanner({
          title: '🚨 ALERTA DE SENTINELA EM DIRETO',
          body: `${alertSession.userName} indicou que está a ser seguido(a)! Toque para ver o trajeto.`,
          type: 'sos_alert',
        });
      },
      (resolvedId) => {
        setIncomingStalkingAlert((prev) => (prev?.id === resolvedId ? null : prev));
      }
    );

    return () => {
      unsubscribeStalking();
    };
  }, [currentUserProfile?.id]);

  // "Estou a ser seguido(a)" handlers
  const handleStartStalkingTracking = async () => {
    if (!userLocation) {
      Alert.alert('Localização GPS', 'A aguardar sinal de GPS para iniciar o rastro ao vivo.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const userName = currentUserProfile?.name || 'Utilizador Sentinela';
    const userId = currentUserProfile?.id || 'local-guest';

    const session = await startStalkingTrackingSession({
      userId,
      userName,
      userAvatar: currentUserProfile?.avatarUrl,
      initialCoords: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
    });

    setActiveStalkingSession(session);
  };

  const handleStopStalkingTracking = async () => {
    if (!activeStalkingSession) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await stopStalkingTrackingSession(activeStalkingSession.id);
    setActiveStalkingSession(null);
    Alert.alert('Alerta Concluído', 'A gravação do seu percurso terminou e os seus Sentinelas foram notificados de que está em segurança.');
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOutUser();
    setCurrentUserProfile(null);
    setMySentinels([]);
  };

  // Quick navigation helpers for police stations and open pharmacies
  const handleQuickRouteToPolice = () => {
    if (!userLocation) {
      Alert.alert('Localização', 'A aguardar sinal GPS...');
      return;
    }
    const policeStations = safePlaces.filter(
      (p) => p.type === 'psp' || p.type === 'gnr' || p.type === 'pj'
    );
    if (policeStations.length === 0) {
      Alert.alert('Esquadras', 'Nenhuma esquadra encontrada nas proximidades.');
      return;
    }
    const sorted = [...policeStations].sort((a, b) => {
      const distA = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );
      const distB = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );
      return distA - distB;
    });
    const nearest = sorted[0];
    handleRequestNavigation(nearest.name, {
      latitude: nearest.latitude,
      longitude: nearest.longitude,
    });
  };

  const handleQuickRouteToPharmacy = () => {
    if (!userLocation) {
      Alert.alert('Localização', 'A aguardar sinal GPS...');
      return;
    }
    const pharmacies = safePlaces.filter((p) => p.type === 'pharmacy');
    const openPharmacies = pharmacies.filter((p) => {
      const status = p.pharmacyStatus || getPharmacyStatus(p);
      return status.isOpen;
    });
    const pool = openPharmacies.length > 0 ? openPharmacies : pharmacies;
    if (pool.length === 0) {
      Alert.alert('Farmácias', 'Nenhuma farmácia encontrada nas proximidades.');
      return;
    }
    const sorted = [...pool].sort((a, b) => {
      const distA = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );
      const distB = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );
      return distA - distB;
    });
    const nearest = sorted[0];
    handleRequestNavigation(nearest.name, {
      latitude: nearest.latitude,
      longitude: nearest.longitude,
    });
  };

  // Handle adding a new incident report with Triangulation for Infiltrators
  const handleAddIncident = (
    data: Omit<Incident, 'id' | 'createdAt' | 'confirmations' | 'dismissals'>
  ) => {
    // If reporting protest infiltrators, triangulate with any existing sightings within 300m
    if (data.category === 'protest_infiltrator') {
      const triangulation = calculateTriangulatedCluster(
        { latitude: data.latitude, longitude: data.longitude },
        incidents,
        'protest_infiltrator',
        300
      );

      if (triangulation.clusterIds.length > 0) {
        // Consolidate cluster: update the existing incidents in this cluster with the new triangulated centroid and increment confirmations
        const updated = incidents.map((item) => {
          if (triangulation.clusterIds.includes(item.id)) {
            return {
              ...item,
              latitude: triangulation.triangulatedCoord.latitude,
              longitude: triangulation.triangulatedCoord.longitude,
              confirmations: (item.confirmations || 1) + 1,
              title: 'Possíveis Infiltrados (Triangulado)',
              description: `${item.description}\n• Nova sinalização triangulada próxima.`,
            };
          }
          return item;
        });

        setIncidents(updated);
        saveIncidents(updated);
        triangulation.clusterIds.forEach((id) => confirmIncidentOnline(id));
        setTargetCoordinate(null);
        return;
      }
    }

    const newIncident: Incident = {
      ...data,
      id: `inc-${Date.now()}`,
      createdAt: Date.now(),
      confirmations: 1,
      dismissals: 0,
    };

    const updated = [newIncident, ...incidents];
    setIncidents(updated);
    saveIncidents(updated);
    createOnlineIncident(newIncident);
    setTargetCoordinate(null);
  };

  // Handle upvoting/confirming an incident
  const handleConfirmIncident = (id: string) => {
    const updated = incidents.map((item) =>
      item.id === id ? { ...item, confirmations: item.confirmations + 1 } : item
    );
    setIncidents(updated);
    saveIncidents(updated);
    confirmIncidentOnline(id);
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident({
        ...selectedIncident,
        confirmations: selectedIncident.confirmations + 1,
      });
    }
  };

  // Handle downvoting an incident (removes immediately if dismissals >= confirmations)
  const handleDismissIncident = (id: string) => {
    const target = incidents.find((item) => item.id === id);
    if (!target) return;

    const nextDismissals = (target.dismissals || 0) + 1;
    const confirmations = target.confirmations || 1;

    // Rule: if dismissals >= confirmations, the incident disappears immediately from the map!
    if (nextDismissals >= confirmations) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const remaining = incidents.filter((item) => item.id !== id);
      setIncidents(remaining);
      saveIncidents(remaining);
      setSelectedIncident(null);
      deleteIncidentOnline(id);
      Alert.alert(
        'Aviso Removido',
        'Este aviso foi removido do mapa porque a comunidade indicou que já foi resolvido ou é falso.'
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = incidents.map((item) =>
        item.id === id ? { ...item, dismissals: nextDismissals } : item
      );
      setIncidents(updated);
      saveIncidents(updated);
      dismissIncidentOnline(id);
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident({
          ...selectedIncident,
          dismissals: nextDismissals,
        });
      }
    }
  };

  // Direct manual deletion of an incident from map & Supabase
  const handleDeleteIncident = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const remaining = incidents.filter((item) => item.id !== id);
    setIncidents(remaining);
    saveIncidents(remaining);
    setSelectedIncident(null);
    deleteIncidentOnline(id);
  };

  // Handle SOS Creation
  const handleSOSCreated = (sos: SOSAlert) => {
    const updated = [sos, ...activeSOSAlerts];
    setActiveSOSAlerts(updated);
    saveActiveSOSAlerts(updated);
    broadcastOnlineSOS(sos);
  };

  // Handle SOS Resolution / Mark as Safe -> Removes SOS alert from map & Supabase
  const handleResolveSOS = (id?: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const targetId = id || (activeSOSAlerts.length > 0 ? activeSOSAlerts[0].id : null);
    if (!targetId) {
      setActiveSOSAlerts([]);
      saveActiveSOSAlerts([]);
      return;
    }

    const remaining = activeSOSAlerts.filter((item) => item.id !== targetId);
    setActiveSOSAlerts(remaining);
    saveActiveSOSAlerts(remaining);
    resolveOnlineSOS(targetId);

    Alert.alert(
      '✅ Situação Segura',
      'O alerta de SOS foi concluído com sucesso e removido do mapa.'
    );
  };

  // Save emergency contacts
  const handleSaveContacts = (contacts: EmergencyContact[]) => {
    setEmergencyContacts(contacts);
    saveEmergencyContacts(contacts);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Active Turn-by-Turn Safe Navigation HUD */}
      {navState && (
        <NavigationBanner navState={navState} onExit={handleExitNavigation} />
      )}

      {/* Simulation Controller HUD & Controls */}
      {simulationState && (
        <SimulationController
          simulationState={simulationState}
          onNextStep={() => handleStepSimulation(simulationState.currentStepIndex + 1)}
          onPrevStep={() => handleStepSimulation(simulationState.currentStepIndex - 1)}
          onTogglePlay={handleToggleSimulationPlay}
          onSelectStep={handleStepSimulation}
          onExit={handleExitSimulation}
        />
      )}

      {/* Google M3 Floating Emergency / Proximity Alert Pill */}
      <MaterialAlertBanner
        alert={activeBanner}
        onDismiss={() => setActiveBanner(null)}
        onPress={() => {
          if (incomingStalkingAlert) {
            setShowIncomingTrackerModal(true);
            setActiveBanner(null);
          }
        }}
      />

      {/* 1. Full-Screen Edge-to-Edge Map (Google Maps standard) */}
      <View style={StyleSheet.absoluteFill}>
        <MapComponent
          userLocation={userLocation}
          userHeading={userHeading}
          incidents={incidents}
          activeSOSAlerts={activeSOSAlerts}
          safePlaces={safePlaces}
          selectedCategoryFilter={selectedFilter}
          showPoliceOnMap={showPoliceOnMap}
          showPharmaciesOnMap={showPharmaciesOnMap}
          showHospitalsOnMap={showHospitalsOnMap}
          activeRoute={
            navState
              ? navState.route
              : simulationState
              ? simulationState.route
              : (showRoutePreview || isAnimatingRouteDraw ? previewSafeRoute : null)
          }
          isNavigating={!!navState}
          isSimulating={!!simulationState}
          simulatedLocation={
            simulationState
              ? simulationState.route.steps[simulationState.currentStepIndex]?.location ||
                simulationState.route.coordinates[0] ||
                null
              : null
          }
          selectedMapPoint={selectedMapPoint}
          homeAddress={homeAddress}
          routeOrigin={
            simulationState
              ? {
                  name: simulationState.originName,
                  coord: simulationState.route.coordinates[0] || previewOriginCoord || { latitude: 38.7223, longitude: -9.1393 },
                }
              : (!navState && previewOriginCoord)
              ? { name: previewOriginName, coord: previewOriginCoord }
              : null
          }
          routeDestination={
            simulationState
              ? {
                  name: simulationState.destinationName,
                  coord:
                    simulationState.route.coordinates[simulationState.route.coordinates.length - 1] ||
                    previewDestCoord ||
                    { latitude: 38.7223, longitude: -9.1393 },
                }
              : previewDestCoord
              ? { name: previewDestName, coord: previewDestCoord }
              : null
          }
          onSelectIncident={(inc) => {
            Haptics.selectionAsync();
            setSelectedSafePlace(null);
            setSelectedMapPoint(null);
            setSelectedIncident(inc);
          }}
          onSelectSafePlace={(place) => {
            Haptics.selectionAsync();
            setSelectedIncident(null);
            setSelectedMapPoint(null);
            setSelectedSafePlace(place);
          }}
          onSelectMapPoint={handleSelectMapPoint}
          onMapClickCoordinate={handleMapClickCoordinate}
          onSelectSOS={(sos) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              '🚨 Alerta SOS Comunitário',
              `Utilizador a pedir ajuda neste ponto!\nEnviado às: ${new Date(sos.timestamp).toLocaleTimeString()}`,
              [
                { text: 'Fechar', style: 'cancel' },
                {
                  text: '✅ Marcar Seguro (Remover)',
                  style: 'default',
                  onPress: () => handleResolveSOS(sos.id),
                },
              ]
            );
          }}
          onMapLongPress={(coord) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTargetCoordinate(coord);
            setShowReportModal(true);
          }}
          onRegionChangeComplete={handleRegionChangeComplete}
          protestMode={!!notificationSettings.protestMode}
          isTorchActive={isTorchActive}
          onToggleTorch={handleToggleTorch}
          onOpenStrobe={handleOpenStrobe}
          onExitProtestMode={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleSaveNotificationSettings({
              ...notificationSettings,
              protestMode: false,
            });
            Alert.alert('Modo Protesto Desativado', 'A aplicação regressou ao modo pedestre normal.');
          }}
          stalkingSession={activeStalkingSession || incomingStalkingAlert}
          recenterSignal={mapRecenterSignal}
        />
      </View>

      {/* 2. Google M3 Floating Search Capsule & Floating Chips Overlay */}
      {!navState && !simulationState && (
        <View style={styles.topFloatingOverlay} pointerEvents="box-none">
          <SearchBar
            userLocation={userLocation}
            transportMode={transportMode}
            onTransportModeChange={setTransportMode}
            onSelectDestination={(name, coord, mode) => handleRequestNavigation(name, coord, mode)}
            onOpenSOSContacts={() => setShowContactsModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            emergencyContactsCount={emergencyContacts.filter((c) => c.phone !== '112').length}
          />

          {/* Floating Categories Filter Chips Strip (Over the Map) */}
          <View style={styles.floatingChipsWrapper} pointerEvents="box-none">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.floatingChipsScroll}
            >
              {/* 1. Casa Quick Chip (First position) */}
              <M3Pressable
                scaleOnPress={0.94}
                style={[
                  styles.filterChip,
                  homeAddress && styles.filterChipHomeActive,
                ]}
                onPress={handlePressHome}
                onLongPress={() => setShowHomeModal(true)}
              >
                <Ionicons
                  name={homeAddress ? 'home' : 'home-outline'}
                  size={14}
                  color={homeAddress ? M3Colors.onPrimaryContainer : M3Colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    homeAddress && styles.filterChipTextHomeActive,
                  ]}
                >
                  {homeAddress ? 'Casa' : '+ Casa'}
                </Text>
              </M3Pressable>

              {/* 2. Todos Quick Chip (Immediately after Casa) */}
              <M3Pressable
                scaleOnPress={0.94}
                style={[
                  styles.filterChip,
                  selectedFilter !== null && styles.filterChipActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedFilter(null);
                  setShowPoliceOnMap(true);
                  setShowPharmaciesOnMap(true);
                  setShowHospitalsOnMap(true);
                }}
              >
                <Ionicons
                  name="layers-outline"
                  size={14}
                  color={selectedFilter !== null ? M3Colors.onSecondaryContainer : M3Colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter !== null && styles.filterChipTextActive,
                  ]}
                >
                  Todos {incidents.length > 0 ? `(${incidents.length})` : ''}
                </Text>
              </M3Pressable>

              {/* 3. Police Quick Chip (Selected by default, toggles Police markers on/off) */}
              <M3Pressable
                scaleOnPress={0.94}
                style={[
                  styles.filterChip,
                  showPoliceOnMap && styles.filterChipActivePolice,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPoliceOnMap((prev) => !prev);
                }}
              >
                <MaterialCommunityIcons
                  name="police-badge"
                  size={14}
                  color={showPoliceOnMap ? '#080A0C' : '#F8FAFC'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    showPoliceOnMap && styles.filterChipTextActiveDark,
                  ]}
                >
                  Polícia (PSP/GNR)
                </Text>
              </M3Pressable>

              {/* 4. Pharmacy Quick Chip (Selected by default, toggles Pharmacy markers on/off) */}
              <M3Pressable
                scaleOnPress={0.94}
                style={[
                  styles.filterChip,
                  showPharmaciesOnMap && styles.filterChipActivePharmacy,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowPharmaciesOnMap((prev) => !prev);
                }}
              >
                <MaterialCommunityIcons
                  name="plus-thick"
                  size={14}
                  color={showPharmaciesOnMap ? '#06140E' : '#10B981'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    showPharmaciesOnMap && styles.filterChipTextActiveDark,
                  ]}
                >
                  Farmácias
                </Text>
              </M3Pressable>

              {/* 5. Hospitals Quick Chip (Selected by default, toggles Hospital markers on/off) */}
              <M3Pressable
                scaleOnPress={0.94}
                style={[
                  styles.filterChip,
                  showHospitalsOnMap && styles.filterChipActiveHospital,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowHospitalsOnMap((prev) => !prev);
                }}
              >
                <MaterialCommunityIcons
                  name="hospital-building"
                  size={14}
                  color={showHospitalsOnMap ? '#04131D' : '#0EA5E9'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    showHospitalsOnMap && styles.filterChipTextActiveDark,
                  ]}
                >
                  Hospitais
                </Text>
              </M3Pressable>

              {/* 6. Hazard Category Chips (Unselected by default) */}
              {(Object.keys(CATEGORIES) as IncidentCategory[])
                .filter(
                  (catKey) =>
                    catKey !== 'protest_infiltrator' ||
                    !!notificationSettings.protestMode ||
                    incidents.some((i) => i.category === 'protest_infiltrator' && isProtestInfiltratorVerified(i, incidents, 300, 3))
                )
                .map((catKey) => {
                const cat = CATEGORIES[catKey];
                const isSelected = selectedFilter === catKey;
                const count = incidents.filter((i) => i.category === catKey && (i.category !== 'protest_infiltrator' || isProtestInfiltratorVerified(i, incidents, 300, 3))).length;
                return (
                  <M3Pressable
                    key={catKey}
                    scaleOnPress={0.94}
                    style={[
                      styles.filterChip,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedFilter(isSelected ? null : catKey);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={(cat.mciIcon || 'alert-circle') as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : cat.color}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActiveWhite,
                      ]}
                    >
                      {cat.label} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </M3Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Active TVDE Trip Protection Floating Banner */}
          {activeTvdeTrip && (
            <M3Pressable
              scaleOnPress={0.98}
              style={styles.tvdeActiveBanner}
              onPress={() => {
                Haptics.selectionAsync();
                setShowTvdeModal(true);
              }}
            >
              <View style={styles.tvdeBannerIconCircle}>
                <Ionicons name="car-sport" size={19} color="#06140E" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.tvdeBannerTopRow}>
                  <Text style={styles.tvdeBannerTitle}>
                    Viagem {activeTvdeTrip.platform} Protegida
                  </Text>
                  {activeTvdeTrip.licensePlate ? (
                    <View style={styles.tvdeMiniPlate}>
                      <Text style={styles.tvdeMiniPlateText}>{activeTvdeTrip.licensePlate}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.tvdeBannerSub} numberOfLines={1}>
                  {[
                    activeTvdeTrip.vehicleModel,
                    activeTvdeTrip.driverName ? `Condutor: ${activeTvdeTrip.driverName}` : '',
                    activeTvdeTrip.destination ? `Destino: ${activeTvdeTrip.destination}` : '',
                  ]
                    .filter(Boolean)
                    .join(' • ') || 'Toque para gerir ou partilhar dados da viagem'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#10B981" />
            </M3Pressable>
          )}
        </View>
      )}

      {/* Incident Details Sheet */}
      {selectedIncident && (
        <IncidentDetailSheet
          incident={selectedIncident}
          userLocation={userLocation}
          onClose={() => setSelectedIncident(null)}
          onConfirm={handleConfirmIncident}
          onDismiss={handleDismissIncident}
          onDelete={handleDeleteIncident}
          onNavigate={(inc) =>
            handleRequestNavigation(inc.title, {
              latitude: inc.latitude,
              longitude: inc.longitude,
            })
          }
        />
      )}

      {/* Safe Place Details Sheet (Police / Pharmacy) */}
      {selectedSafePlace && (
        <SafePlaceDetailSheet
          place={selectedSafePlace}
          userLocation={userLocation}
          onClose={() => setSelectedSafePlace(null)}
          onNavigate={(place) =>
            handleRequestNavigation(place.name, {
              latitude: place.latitude,
              longitude: place.longitude,
            })
          }
        />
      )}

      {/* Selected Map Point Destination Sheet (POI / Supermarket / Dropped Pin) */}
      {selectedMapPoint && (
        <SelectedPlaceSheet
          place={selectedMapPoint}
          userLocation={userLocation}
          transportMode={transportMode}
          onClose={() => setSelectedMapPoint(null)}
          onNavigate={(name, coord, mode) => {
            setSelectedMapPoint(null);
            handleRequestNavigation(name, coord, mode);
          }}
          onReportHere={(coord) => {
            setSelectedMapPoint(null);
            setTargetCoordinate(coord);
            setShowReportModal(true);
          }}
          onSetAsOrigin={(name, coord) => {
            setSelectedMapPoint(null);
            setPreviewOriginName(name);
            setPreviewOriginCoord(coord);
            Alert.alert(
              'Ponto de Partida Definido (A)',
              `"${name}" foi definido como origem. Escolha agora o destino de chegada (B) no mapa ou pela barra de pesquisa.`
            );
          }}
        />
      )}

      {/* Route Preview Modal with Two-Point Itinerary Controller (Point A ➔ Point B) */}
      <RoutePreviewModal
        visible={showRoutePreview}
        destinationName={previewDestName}
        destinationCoord={previewDestCoord}
        originName={previewOriginName}
        originCoord={previewOriginCoord}
        safeRoute={previewSafeRoute}
        directRoute={previewDirectRoute}
        currentMode={transportMode}
        userLocation={userLocation}
        homeAddress={homeAddress ? { latitude: homeAddress.latitude, longitude: homeAddress.longitude, label: 'Casa' } : null}
        onToggleMode={handleTogglePreviewMode}
        onClose={() => {
          setShowRoutePreview(false);
          setPreviewOriginCoord(null);
          setPreviewOriginName('A minha localização');
        }}
        onStartNavigation={handleStartNavigation}
        onSimulateRoute={handleStartSimulation}
        onUpdateEndpoints={handleUpdateRouteEndpoints}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportCategory('dark_area');
        }}
        onSubmit={handleAddIncident}
        currentLocation={userLocation}
        targetCoordinate={targetCoordinate}
        initialCategory={notificationSettings.protestMode && reportCategory === 'dark_area' ? 'police_presence' : reportCategory}
        onStartStalking={handleStartStalkingTracking}
        protestMode={!!notificationSettings.protestMode}
        incidents={incidents}
      />

      {/* SOS Modal */}
      <SOSModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        currentLocation={userLocation}
        emergencyContacts={emergencyContacts}
        onSOSCreated={handleSOSCreated}
        onUpdateContacts={handleSaveContacts}
        onSOSResolved={handleResolveSOS}
        activeTvdeTrip={activeTvdeTrip}
      />

      {/* TVDE Ride Protection Modal (Uber / Bolt / Táxi) */}
      <TvdeTripModal
        visible={showTvdeModal}
        onClose={() => setShowTvdeModal(false)}
        activeTrip={activeTvdeTrip}
        incomingDraft={incomingTvdeDraft}
        onStartTrip={handleStartTvdeTrip}
        onEndTrip={handleEndTvdeTrip}
        onTriggerSOSWithTrip={(trip) => {
          setActiveTvdeTrip(trip);
          setShowSOSModal(true);
        }}
        userLocation={userLocation}
        homeAddress={homeAddress}
        emergencyContacts={emergencyContacts}
      />

      {/* Emergency Contacts Modal */}
      <EmergencyContactsModal
        visible={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={emergencyContacts}
        onSaveContacts={handleSaveContacts}
      />

      {/* Home Safe Route Modal */}
      <HomeModal
        visible={showHomeModal}
        onClose={() => setShowHomeModal(false)}
        currentHome={homeAddress}
        userLocation={userLocation}
        onSaveHome={handleSaveHomeAddress}
        onNavigateHome={(home) => {
          handleRequestNavigation('Casa', {
            latitude: home.latitude,
            longitude: home.longitude,
          });
        }}
      />

      {/* Proximity & Background Notification Settings Modal */}
      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={notificationSettings}
        onSaveSettings={handleSaveNotificationSettings}
        onOpenFeedback={() => setShowFeedbackModal(true)}
        onOpenProtestRights={() => setShowProtestRightsModal(true)}
        currentUser={currentUserProfile}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenSentinels={() => setShowSentinelsModal(true)}
        onSignOut={handleSignOut}
      />

      {/* Auth Modal (Login / Sign Up with Google & Email) */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(profile) => {
          setCurrentUserProfile(profile);
          fetchMySentinels(profile.id).then(setMySentinels);
        }}
      />

      {/* Sentinelas Management Modal */}
      <SentinelsModal
        visible={showSentinelsModal}
        onClose={() => setShowSentinelsModal(false)}
        currentUser={currentUserProfile}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Floating HUD for Active "Estou a ser seguido(a)" Session */}
      {activeStalkingSession && (
        <StalkingActiveModal
          session={activeStalkingSession}
          sentinelsCount={mySentinels.length}
          onStopTracking={handleStopStalkingTracking}
        />
      )}

      {/* Live Sentinel Tracker Modal for Protected Friend in Danger */}
      {incomingStalkingAlert && (
        <LiveSentinelTrackerModal
          session={incomingStalkingAlert}
          userLocation={userLocation}
          onClose={() => setIncomingStalkingAlert(null)}
          onNavigateToUser={(name, coord) => {
            handleRequestNavigation(name, coord, 'walking');
          }}
        />
      )}

      {/* Feedback & Bug Reporting Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        userLocation={userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null}
      />

      {/* Protest Screen Strobe Beacon Modal */}
      <ProtestLightModal
        visible={showStrobeModal}
        onClose={() => setShowStrobeModal(false)}
      />

      {/* Protest Portuguese Legal & Constitutional Rights Guide */}
      <ProtestRightsModal
        visible={showProtestRightsModal}
        onClose={() => setShowProtestRightsModal(false)}
      />

      {/* 3. Stealth Floating Pill Bottom Dock Bar (Always Visible & Active Tab Highlighted in White Pill) */}
      {!navState && !simulationState && (
        <View style={styles.bottomDockContainer} pointerEvents="box-none">
          <View style={styles.bottomPillDock}>
            {/* 1. Mapa */}
            {(() => {
              const isMapActive = !showReportModal && !showTvdeModal && !showSentinelsModal;
              return (
                <M3Pressable
                  scaleOnPress={0.94}
                  style={[
                    styles.dockPillItem,
                    isMapActive && styles.dockPillItemSelectedWhite,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowReportModal(false);
                    setShowTvdeModal(false);
                    setShowSentinelsModal(false);
                    setShowSettingsModal(false);
                    setShowContactsModal(false);
                    setShowHomeModal(false);
                    setSelectedIncident(null);
                    setSelectedSafePlace(null);
                    setSelectedMapPoint(null);
                    setMapRecenterSignal((prev) => prev + 1);
                  }}
                >
                  <Ionicons
                    name={isMapActive ? 'home' : 'home-outline'}
                    size={17}
                    color={isMapActive ? '#080A0C' : '#CBD5E1'}
                  />
                  <Text
                    style={[
                      styles.dockPillItemText,
                      isMapActive && styles.dockPillItemTextSelectedDark,
                    ]}
                  >
                    Mapa
                  </Text>
                </M3Pressable>
              );
            })()}

            {/* 2. Sinalizar (Community Report & "Estou a ser seguido") */}
            <M3Pressable
              scaleOnPress={0.93}
              style={[
                styles.dockPillItem,
                showReportModal && styles.dockPillItemSelectedWhite,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTvdeModal(false);
                setShowSentinelsModal(false);
                setShowSettingsModal(false);
                setShowContactsModal(false);
                setShowHomeModal(false);
                setTargetCoordinate(null);
                setShowReportModal((prev) => !prev);
              }}
            >
              <View style={styles.dockIconWrap}>
                <Ionicons
                  name={showReportModal ? 'warning' : 'warning-outline'}
                  size={16}
                  color={showReportModal ? '#080A0C' : '#CBD5E1'}
                />
                {activeStalkingSession && <View style={styles.dockLiveBadgeDotRed} />}
              </View>
              <Text
                style={[
                  styles.dockPillItemText,
                  showReportModal && styles.dockPillItemTextSelectedDark,
                ]}
              >
                Sinalizar
              </Text>
            </M3Pressable>

            {/* 3. TVDE (Uber / Bolt / Táxi Ride Protection) */}
            <M3Pressable
              scaleOnPress={0.93}
              style={[
                styles.dockPillItem,
                showTvdeModal && styles.dockPillItemSelectedWhite,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowReportModal(false);
                setShowSentinelsModal(false);
                setShowSettingsModal(false);
                setShowContactsModal(false);
                setShowHomeModal(false);
                setShowTvdeModal((prev) => !prev);
              }}
            >
              <View style={styles.dockIconWrap}>
                <Ionicons
                  name={showTvdeModal ? 'car-sport' : 'car-sport-outline'}
                  size={17}
                  color={showTvdeModal ? '#080A0C' : activeTvdeTrip ? '#10B981' : '#CBD5E1'}
                />
                {activeTvdeTrip && <View style={styles.dockLiveBadgeDotNeon} />}
              </View>
              <Text
                style={[
                  styles.dockPillItemText,
                  !showTvdeModal && activeTvdeTrip && { color: '#10B981', fontWeight: '800' },
                  showTvdeModal && styles.dockPillItemTextSelectedDark,
                ]}
              >
                TVDE
              </Text>
            </M3Pressable>

            {/* 4. Sentinelas (Trusted Circle & Live Tracking) */}
            <M3Pressable
              scaleOnPress={0.93}
              style={[
                styles.dockPillItem,
                showSentinelsModal && styles.dockPillItemSelectedWhite,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowReportModal(false);
                setShowTvdeModal(false);
                setShowSettingsModal(false);
                setShowContactsModal(false);
                setShowHomeModal(false);
                if (currentUserProfile) {
                  setShowSentinelsModal((prev) => !prev);
                } else {
                  setShowAuthModal(true);
                }
              }}
            >
              <View style={styles.dockIconWrap}>
                <Ionicons
                  name={showSentinelsModal ? 'shield-checkmark' : 'shield-checkmark-outline'}
                  size={16}
                  color={showSentinelsModal ? '#080A0C' : '#CBD5E1'}
                />
                {mySentinels.length > 0 && (
                  <View style={styles.dockCountBadge}>
                    <Text style={styles.dockCountBadgeText}>{mySentinels.length}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.dockPillItemText,
                  showSentinelsModal && styles.dockPillItemTextSelectedDark,
                ]}
              >
                Sentinelas
              </Text>
            </M3Pressable>

            {/* 5. SOS (Emergency Pill Button on the Right Edge) */}
            <M3Pressable
              scaleOnPress={0.91}
              style={styles.dockSosPill}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setShowSOSModal(true);
              }}
            >
              <Ionicons name="megaphone" size={14} color="#FFFFFF" />
              <Text style={styles.dockSosPillText}>SOS</Text>
            </M3Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: M3Colors.surface,
  },
  topFloatingOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 6 : 10,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  floatingChipsWrapper: {
    marginTop: 6,
  },
  floatingChipsScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: M3Shapes.full,
    backgroundColor: 'rgba(14, 18, 23, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...M3Elevation.level2,
  },
  filterChipHomeActive: {
    backgroundColor: M3Colors.primaryContainer,
    borderColor: M3Colors.primary,
  },
  filterChipTextHomeActive: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  tvdeActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 18, 23, 0.96)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    ...M3Elevation.level3,
  },
  tvdeBannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tvdeBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tvdeBannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  tvdeMiniPlate: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#1D4ED8',
  },
  tvdeMiniPlateText: {
    color: '#080A0C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tvdeBannerSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  filterChipActivePolice: {
    backgroundColor: '#F8FAFC',
    borderColor: '#FFFFFF',
  },
  filterChipActivePharmacy: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
  },
  filterChipActiveHospital: {
    backgroundColor: '#0EA5E9',
    borderColor: '#38BDF8',
  },
  filterChipActive: {
    backgroundColor: M3Colors.secondaryContainer,
    borderColor: M3Colors.secondary,
  },
  filterChipText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: M3Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  filterChipTextActiveWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterChipTextActiveDark: {
    color: '#080A0C',
    fontWeight: '800',
  },
  mapContainer: {
    flex: 1,
  },
  bottomDockContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 20 : 18,
    left: 10,
    right: 10,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 28,
  },
  bottomPillDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(14, 18, 25, 0.98)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 28,
  },
  dockPillItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 2,
  },
  dockPillItemSelectedWhite: {
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  dockPillItemText: {
    color: '#CBD5E1',
    fontSize: 9.5,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  dockPillItemTextSelectedDark: {
    color: '#080A0C',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  dockIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  dockLiveBadgeDotRed: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#10141B',
  },
  dockLiveBadgeDotNeon: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#10141B',
  },
  dockCountBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#38BDF8',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10141B',
  },
  dockCountBadgeText: {
    color: '#080A0C',
    fontSize: 8.5,
    fontWeight: '900',
  },
  dockSosPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
    gap: 1,
  },
  dockSosPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
