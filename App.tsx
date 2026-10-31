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
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Haptics from './src/utils/haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Incident, IncidentCategory, SOSAlert, EmergencyContact, UserLocation, SafePlace, HomeAddress, WorkAddress, NotificationSettings } from './src/types';
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
  loadWorkAddress,
  saveWorkAddress,
  loadLastTransportMode,
  saveLastTransportMode,
  loadNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadAccessibilityRoutePreference,
  saveAccessibilityRoutePreference,
} from './src/services/storage';
import {
  requestNotificationPermissions,
  sendDangerProximityPushNotification,
  subscribeToInAppNotifications,
  sendSystemNotification,
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
import { PedestrianRoute, NavigationState, RouteCoordinate, TransportMode, RouteSimulationState, TransitStop } from './src/types/navigation';
import {
  calculateSafeNavigationRoutes,
  getRouteMinDistanceToHazard,
  findHazardsNearRoute,
} from './src/services/routingService';
import { NavigationBanner } from './src/components/NavigationBanner';
import { SimulationController } from './src/components/SimulationController';
import { RoutePreviewModal } from './src/components/RoutePreviewModal';
import { SearchBar } from './src/components/SearchBar';
import { MapComponent } from './src/components/MapComponent';
import { BusStopDetailSheet } from './src/components/BusStopDetailSheet';
import { ReportModal } from './src/components/ReportModal';
import { SOSModal } from './src/components/SOSModal';
import { IncidentDetailSheet } from './src/components/IncidentDetailSheet';
import { SafePlaceDetailSheet } from './src/components/SafePlaceDetailSheet';
import { SelectedPlaceSheet, SelectedMapPoint } from './src/components/SelectedPlaceSheet';
import { EmergencyContactsModal } from './src/components/EmergencyContactsModal';
import { HomeModal } from './src/components/HomeModal';
import { WorkModal } from './src/components/WorkModal';
import { QuickTransportModeModal } from './src/components/QuickTransportModeModal';
import { SettingsModal } from './src/components/SettingsModal';
import { setTorch, setKeepScreenOn } from './src/services/torch';
import { ProtestLightModal } from './src/components/ProtestLightModal';
import { ProtestRightsModal } from './src/components/ProtestRightsModal';
import { ArrivalDestinationModal, ArrivalModalData } from './src/components/ArrivalDestinationModal';
import { M3Pressable } from './src/components/M3MotionWrapper';
import { MaterialAlertBanner } from './src/components/MaterialAlertBanner';
import { FeedbackModal } from './src/components/FeedbackModal';
import { AuthModal } from './src/components/AuthModal';
import { SentinelsModal } from './src/components/SentinelsModal';
import { RadarModal } from './src/components/RadarModal';
import { subscribeToRadarInvitesForSentinel } from './src/services/radarService';
import { StalkingActiveModal } from './src/components/StalkingActiveModal';
import { LiveSentinelTrackerModal } from './src/components/LiveSentinelTrackerModal';
import { TvdeTripModal } from './src/components/TvdeTripModal';
import { MapLayersModal } from './src/components/MapLayersModal';
import { CpStationDetailSheet } from './src/components/CpStationDetailSheet';
import { MetroStationDetailSheet } from './src/components/MetroStationDetailSheet';
import { HalloweenAmbientOverlay } from './src/components/HalloweenAmbientOverlay';
import { StcpVehicle, fetchUnifiedTransitBuses, fetchNearbyBusStops } from './src/services/stcpRealtimeService';
import { CpStation, fetchNearbyCpStations } from './src/services/cpStationsService';
import { MetroStation, fetchNearbyMetroStations } from './src/services/metroStationsService';
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
import {
  calculateDistanceMeters,
  formatDistance,
  isProtestInfiltratorVerified,
  calculateTriangulatedCluster,
  filterExpiredIncidents,
  REPORT_RENEWAL_RADIUS_METERS,
  isDaylight,
} from './src/utils/geo';
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
  const [safePlaces, setSafePlaces] = useState<SafePlaceWithDistance[]>(() => getSafePlaces('all'));
  const [selectedSafePlace, setSelectedSafePlace] = useState<SafePlace | null>(null);
  const [additionalPlaces, setAdditionalPlaces] = useState<SafePlace[]>([]);
  const regionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic Day/Night Cycle based on local solar twilight
  const [isDayTime, setIsDayTime] = useState<boolean>(() => {
    const lat = userLocation?.latitude ?? 39.5;
    const lng = userLocation?.longitude ?? -8.0;
    return isDaylight(lat, lng);
  });

  useEffect(() => {
    const updateDaylight = () => {
      const lat = userLocation?.latitude ?? 39.5;
      const lng = userLocation?.longitude ?? -8.0;
      setIsDayTime(isDaylight(lat, lng));
    };
    updateDaylight();
    const interval = setInterval(updateDaylight, 60000);
    return () => clearInterval(interval);
  }, [userLocation?.latitude, userLocation?.longitude]);

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
  const [showPoliceOnMap, setShowPoliceOnMap] = useState(false);
  const [showPharmaciesOnMap, setShowPharmaciesOnMap] = useState(false);
  const [showHospitalsOnMap, setShowHospitalsOnMap] = useState(false);
  const [showWheelmapOnMap, setShowWheelmapOnMap] = useState(false);
  const [showStcpBusesOnMap, setShowStcpBusesOnMap] = useState(false);
  const [showUnirBusesOnMap, setShowUnirBusesOnMap] = useState(false);
  const [showCarrisBusesOnMap, setShowCarrisBusesOnMap] = useState(false);
  const [showCarrisMetroBusesOnMap, setShowCarrisMetroBusesOnMap] = useState(false);
  const [showCpTrainsOnMap, setShowCpTrainsOnMap] = useState(false);
  const [showMetroStationsOnMap, setShowMetroStationsOnMap] = useState(false);
  const [nearbyBusStops, setNearbyBusStops] = useState<TransitStop[]>([]);
  const [selectedBusStop, setSelectedBusStop] = useState<TransitStop | null>(null);
  const [nearbyCpStations, setNearbyCpStations] = useState<CpStation[]>([]);
  const [selectedCpStation, setSelectedCpStation] = useState<CpStation | null>(null);
  const [nearbyMetroStations, setNearbyMetroStations] = useState<MetroStation[]>([]);
  const [selectedMetroStation, setSelectedMetroStation] = useState<MetroStation | null>(null);
  const [transitVehicles, setTransitVehicles] = useState<StcpVehicle[]>([]);
  const [showLayersModal, setShowLayersModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedMapPoint, setSelectedMapPoint] = useState<SelectedMapPoint | null>(null);
  const [homeAddress, setHomeAddress] = useState<HomeAddress | null>(null);
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [workAddress, setWorkAddress] = useState<WorkAddress | null>(null);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showQuickModeModal, setShowQuickModeModal] = useState(false);
  const [quickModeDestination, setQuickModeDestination] = useState<{
    title: string;
    coord: RouteCoordinate;
    address: string;
  } | null>(null);
  const [lastTransportMode, setLastTransportMode] = useState<TransportMode>('walking');
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

  // Navigation & Simulation States
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [simulationState, setSimulationState] = useState<RouteSimulationState | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [isAnimatingRouteDraw, setIsAnimatingRouteDraw] = useState(false);
  const [previewSafeRoute, setPreviewSafeRoute] = useState<PedestrianRoute | null>(null);
  const [previewDirectRoute, setPreviewDirectRoute] = useState<PedestrianRoute | undefined>(undefined);
  const [previewAlternativeRoutes, setPreviewAlternativeRoutes] = useState<PedestrianRoute[] | undefined>(undefined);
  const alertedTransferStopsRef = useRef<Set<string>>(new Set());
  const [previewOriginName, setPreviewOriginName] = useState('A minha localização');
  const [previewOriginCoord, setPreviewOriginCoord] = useState<RouteCoordinate | null>(null);
  const [previewDestName, setPreviewDestName] = useState('');
  const [previewDestCoord, setPreviewDestCoord] = useState<RouteCoordinate | null>(null);
  const [accessibilityRouteOnly, setAccessibilityRouteOnly] = useState<boolean>(false);
  const routeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavRecalcTimeRef = useRef<number>(0);
  const isNavRecalculatingRef = useRef<boolean>(false);
  const navStartTimeRef = useRef<number>(Date.now());
  const [arrivalModalData, setArrivalModalData] = useState<ArrivalModalData | null>(null);

  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  const [targetCoordinate, setTargetCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);

  // Polling em Tempo Real de Transportes Públicos (Porto: STCP + UNIR | Lisboa: Carris + Carris Metropolitana | Nacional: CP)
  // Otimizado para poupança de bateria e dados: pausa em segundo plano e intervalo suave de 12s
  const isTransitNavigationActive =
    transportMode === 'transit' && (showRoutePreview || !!navState || !!simulationState);

  useEffect(() => {
    const isAnyTransitActive =
      showStcpBusesOnMap ||
      showUnirBusesOnMap ||
      showCarrisBusesOnMap ||
      showCarrisMetroBusesOnMap ||
      showCpTrainsOnMap ||
      isTransitNavigationActive;
    if (!isAnyTransitActive) {
      setTransitVehicles([]);
      return;
    }

    let isMounted = true;
    const loadBuses = async () => {
      // Poupança de bateria: não consulta rede se a app estiver em segundo plano
      if (AppState.currentState !== 'active') {
        return;
      }

      try {
        const userCoord = userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : targetCoordinate;
        const vehicles = await fetchUnifiedTransitBuses({
          includeStcp: showStcpBusesOnMap || isTransitNavigationActive,
          includeUnir: showUnirBusesOnMap || isTransitNavigationActive,
          includeCarris: showCarrisBusesOnMap || isTransitNavigationActive,
          includeCarrisMetropolitana: showCarrisMetroBusesOnMap || isTransitNavigationActive,
          includeCpTrains: showCpTrainsOnMap || isTransitNavigationActive,
          userCoordinate: userCoord,
          maxDistanceKm: 35, // Restringe a 35km para autocarros locais; comboios de longo curso (AP/IC) são mantidos
        });
        if (isMounted) {
          setTransitVehicles(vehicles);
        }
      } catch (err) {
        console.warn('Falha ao atualizar transportes em tempo real:', err);
      }
    };

    loadBuses();
    const interval = setInterval(loadBuses, 12000);

    // Retoma imediatamente a consulta quando o utilizador volta à app
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadBuses();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [
    showStcpBusesOnMap,
    showUnirBusesOnMap,
    showCarrisBusesOnMap,
    showCarrisMetroBusesOnMap,
    showCpTrainsOnMap,
    isTransitNavigationActive,
    userLocation,
    targetCoordinate,
  ]);

  const activeLayersCount = [
    showPoliceOnMap,
    showPharmaciesOnMap,
    showHospitalsOnMap,
    showWheelmapOnMap,
    showStcpBusesOnMap,
    showUnirBusesOnMap,
    showCarrisBusesOnMap,
    showCarrisMetroBusesOnMap,
    showCpTrainsOnMap,
  ].filter(Boolean).length;

  const isAnyTransitFilterActive =
    showStcpBusesOnMap ||
    showUnirBusesOnMap ||
    showCarrisBusesOnMap ||
    showCarrisMetroBusesOnMap ||
    showCpTrainsOnMap;

  // As paragens de autocarro tornam-se visíveis automaticamente quando filtros de transportes estão ativos ou em planeamento de rota
  const areBusStopsEffective =
    isAnyTransitFilterActive || (transportMode === 'transit' && showRoutePreview);

  const isAnyTransitActive =
    isAnyTransitFilterActive ||
    isTransitNavigationActive;

  // Carregamento de Paragens de Autocarro próximas (com desduplicação espacial e previsões de tempo real ao tocar)
  useEffect(() => {
    const shouldLoadStops = areBusStopsEffective;
    if (!shouldLoadStops) {
      setNearbyBusStops([]);
      return;
    }

    const coord = userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : targetCoordinate;
    if (!coord) return;

    let isMounted = true;
    fetchNearbyBusStops(coord.latitude, coord.longitude, 1200).then((stops) => {
      if (isMounted) {
        setNearbyBusStops(stops);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    areBusStopsEffective,
    userLocation?.latitude,
    userLocation?.longitude,
    targetCoordinate?.latitude,
    targetCoordinate?.longitude,
  ]);

  // Carregamento de Estações e Apeadeiros CP (visíveis única e exclusivamente quando o filtro Comboios CP está ativo)
  useEffect(() => {
    if (!showCpTrainsOnMap) {
      setNearbyCpStations([]);
      return;
    }

    const coord = userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : targetCoordinate;
    if (!coord) return;

    let isMounted = true;
    fetchNearbyCpStations(coord.latitude, coord.longitude, 40).then((stations) => {
      if (isMounted) {
        setNearbyCpStations(stations);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    showCpTrainsOnMap,
    userLocation?.latitude,
    userLocation?.longitude,
    targetCoordinate?.latitude,
    targetCoordinate?.longitude,
  ]);

  // Carregamento de Estações do Metro do Porto (apenas quando o filtro do Metro está ativado)
  const isMetroEffective = showMetroStationsOnMap;
  useEffect(() => {
    if (!isMetroEffective) {
      setNearbyMetroStations([]);
      return;
    }

    const coord = userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : targetCoordinate;
    if (!coord) return;

    let isMounted = true;
    fetchNearbyMetroStations(coord.latitude, coord.longitude, 40).then((stations) => {
      if (isMounted) {
        setNearbyMetroStations(stations);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    isMetroEffective,
    userLocation?.latitude,
    userLocation?.longitude,
    targetCoordinate?.latitude,
    targetCoordinate?.longitude,
  ]);
  const [activeBanner, setActiveBanner] = useState<{
    title: string;
    body: string;
    type: 'sos_alert' | 'proximity_alert';
    data?: any;
  } | null>(null);

  // User Profile, Sentinelas, & "Estou a ser seguido" Stalking Session States
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [mySentinels, setMySentinels] = useState<SentinelContact[]>([]);
  const [activeStalkingSession, setActiveStalkingSession] = useState<StalkingTrackingSession | null>(null);
  const [incomingStalkingAlert, setIncomingStalkingAlert] = useState<StalkingTrackingSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSentinelsModal, setShowSentinelsModal] = useState(false);
  const [showIncomingTrackerModal, setShowIncomingTrackerModal] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [radarAutoJoinPin, setRadarAutoJoinPin] = useState<string | null>(null);
  const myCreatedSOSIdsRef = useRef<Set<string>>(new Set());

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

  const handleSaveWorkAddress = (work: WorkAddress | null) => {
    setWorkAddress(work);
    saveWorkAddress(work);
  };

  const handlePressHome = () => {
    if (!homeAddress) {
      Haptics.selectionAsync();
      setShowHomeModal(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickModeDestination({
      title: 'Casa',
      coord: {
        latitude: homeAddress.latitude,
        longitude: homeAddress.longitude,
      },
      address: homeAddress.address,
    });
    setShowQuickModeModal(true);
  };

  const handlePressWork = () => {
    if (!workAddress) {
      Haptics.selectionAsync();
      setShowWorkModal(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickModeDestination({
      title: 'Trabalho',
      coord: {
        latitude: workAddress.latitude,
        longitude: workAddress.longitude,
      },
      address: workAddress.address,
    });
    setShowQuickModeModal(true);
  };

  const handleConfirmQuickMode = async (chosenMode: TransportMode) => {
    setShowQuickModeModal(false);
    setLastTransportMode(chosenMode);
    await saveLastTransportMode(chosenMode);

    if (quickModeDestination) {
      handleRequestNavigation(
        quickModeDestination.title,
        quickModeDestination.coord,
        chosenMode
      );
    }
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
      houseNumber: geo.houseNumber,
      postcode: geo.postcode,
    });
  };

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
      avoidAccessibilityBarriers: accessibilityRouteOnly,
    });

    // 2. Render route on the map and let the progressive neon route animation play out in full view (2.4s)
    setPreviewSafeRoute(routes.safeRoute);
    setPreviewDirectRoute(routes.directRoute);
    setPreviewAlternativeRoutes(routes.alternativeRoutes);
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
      avoidAccessibilityBarriers: accessibilityRouteOnly,
    });
    setPreviewSafeRoute(routes.safeRoute);
    setPreviewDirectRoute(routes.directRoute);
    setPreviewAlternativeRoutes(routes.alternativeRoutes);
  };

  const handleToggleAccessibilityRoute = async (enabled: boolean) => {
    Haptics.selectionAsync();
    setAccessibilityRouteOnly(enabled);
    await saveAccessibilityRoutePreference(enabled);

    if (previewDestCoord) {
      const origin: RouteCoordinate = previewOriginCoord || {
        latitude: userLocation?.latitude ?? 41.1501,
        longitude: userLocation?.longitude ?? -8.6112,
      };
      const routes = await calculateSafeNavigationRoutes({
        origin,
        destination: previewDestCoord,
        incidents,
        mode: transportMode,
        avoidAccessibilityBarriers: enabled,
      });
      setPreviewSafeRoute(routes.safeRoute);
      setPreviewDirectRoute(routes.directRoute);
      setPreviewAlternativeRoutes(routes.alternativeRoutes);
    }
  };

  // Recálculo dinâmico da rota de pré-visualização quando a lista de ocorrências é atualizada
  useEffect(() => {
    if (!showRoutePreview || !previewDestCoord) return;

    const origin: RouteCoordinate = previewOriginCoord || {
      latitude: userLocation?.latitude ?? 41.1501,
      longitude: userLocation?.longitude ?? -8.6112,
    };

    let isMounted = true;
    calculateSafeNavigationRoutes({
      origin,
      destination: previewDestCoord,
      incidents,
      mode: transportMode,
      avoidAccessibilityBarriers: accessibilityRouteOnly,
    }).then((routes) => {
      if (isMounted) {
        setPreviewSafeRoute(routes.safeRoute);
        setPreviewDirectRoute(routes.directRoute);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [incidents]);

  const startRealNavigation = async (chosenRoute: PedestrianRoute) => {
    if (!previewDestCoord) return;

    // Suspend idle background proximity alerts to ensure only one navigation notification is shown
    await stopBackgroundLocationTracking();
    alertedTransferStopsRef.current.clear();

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

    navStartTimeRef.current = Date.now();
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
    alertedTransferStopsRef.current.clear();
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
      const targetStep = steps[clampedIndex];
      if (targetStep?.isTransfer && clampedIndex !== prev.currentStepIndex) {
        sendSystemNotification({
          title: '🔄 Simulação: Ponto de Transbordo',
          body: `${targetStep.transferInstruction || 'Troca de veículo necessária neste ponto'}`,
          data: { type: 'transit_transfer' },
        });
      }
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
        const nextStep = steps[nextIdx];
        if (nextStep?.isTransfer) {
          sendSystemNotification({
            title: '🔄 Simulação: Ponto de Transbordo',
            body: `${nextStep.transferInstruction || 'Troca de veículo necessária neste ponto'}`,
            data: { type: 'transit_transfer' },
          });
        }
        return { ...prev, currentStepIndex: nextIdx };
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [simulationState?.isPlaying, simulationState?.route?.steps?.length]);

  // Periodic cleanup of 12h expired reports (except accessibility reports)
  useEffect(() => {
    const cleanupTimer = setInterval(() => {
      setIncidents((prev) => {
        const filtered = filterExpiredIncidents(prev);
        if (filtered.length !== prev.length) {
          saveIncidents(filtered);
        }
        return filtered;
      });
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(cleanupTimer);
  }, []);

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

    // Standard industry arrival thresholds:
    // Driving: 40 meters (curbside/street parking margin)
    // Walking / Transit / Accessibility: 25 meters (pedestrian GPS multipath and building entrance setback)
    const arrivalThresholdMeters = navState.mode === 'driving' ? 40 : 25;

    // If within arrival threshold of destination, user has arrived safely!
    if (distToDest <= arrivalThresholdMeters) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const elapsedMins = Math.max(
        1,
        Math.round((Date.now() - navStartTimeRef.current) / 60000)
      );
      setArrivalModalData({
        destinationName: navState.destinationName,
        durationMinutes: elapsedMins > 0 ? elapsedMins : (navState.route?.durationMinutes || 1),
        distanceMeters: navState.route?.distanceMeters || Math.round(distToDest),
        mode: navState.mode,
        isSafe: navState.route?.isSafe ?? true,
        hazardsAvoidedCount: navState.route?.hazardsAvoided?.length || 0,
      });
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

    // Notificação ao aproximar-se da paragem onde deve fazer o transbordo (<= 140m)
    if (navState.mode === 'transit') {
      const activeStep = steps[stepIndex];
      if (activeStep?.isTransfer && (activeStep.toLocation || activeStep.location)) {
        const targetStopCoord = activeStep.toLocation || activeStep.location!;
        const stopId = `${activeStep.transferStopName || ''}_${targetStopCoord.latitude.toFixed(4)}_${targetStopCoord.longitude.toFixed(4)}`;
        if (!alertedTransferStopsRef.current.has(stopId)) {
          const distToStop = calculateDistanceMeters(
            userLocation.latitude,
            userLocation.longitude,
            targetStopCoord.latitude,
            targetStopCoord.longitude
          );
          if (distToStop <= 140) {
            alertedTransferStopsRef.current.add(stopId);
            sendSystemNotification({
              title: '🔄 Transbordo Próximo!',
              body: `Está a chegar a ${activeStep.transferStopName || 'paragem'}. Prepare-se para sair e apanhar ${activeStep.transferToLine || 'o próximo veículo'}.`,
              data: { type: 'transit_transfer' },
            });
          }
        }
      }
    }

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

    // Recálculo dinâmico inteligente durante navegação:
    // 1. Desvio fora de rota (utilizador afastou-se mais de 45 metros do trajeto planeado)
    // 2. Deteção de ocorrências no percurso restante à frente do utilizador
    const now = Date.now();
    if (now - lastNavRecalcTimeRef.current > 4000 && !isNavRecalculatingRef.current && distToDest > 30) {
      const routeCoords = navState.route?.coordinates || [];
      const distToRoute = routeCoords.length > 0
        ? getRouteMinDistanceToHazard(routeCoords, { latitude: userLocation.latitude, longitude: userLocation.longitude })
        : 0;

      const isOffRoute = distToRoute > 45;

      const totalSteps = steps.length || 1;
      const progressFraction = Math.max(0, Math.min(1, stepIndex / totalSteps));
      const remainingCoords = routeCoords.slice(Math.floor(progressFraction * routeCoords.length));
      const hazardThreshold = navState.mode === 'driving' ? 40 : 45;
      const hazardsAhead = findHazardsNearRoute(
        remainingCoords,
        incidents,
        hazardThreshold,
        navState.mode,
        accessibilityRouteOnly
      );

      const hasNewHazardsOnRoute = hazardsAhead.length > 0 && !navState.route?.isSafe;

      if (isOffRoute || hasNewHazardsOnRoute) {
        lastNavRecalcTimeRef.current = now;
        isNavRecalculatingRef.current = true;

        calculateSafeNavigationRoutes({
          origin: { latitude: userLocation.latitude, longitude: userLocation.longitude },
          destination: destCoord,
          incidents,
          mode: navState.mode,
          avoidAccessibilityBarriers: accessibilityRouteOnly,
        })
          .then((newRoutes) => {
            isNavRecalculatingRef.current = false;
            if (newRoutes?.safeRoute) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setNavState((prev) => {
                if (!prev || !prev.isActive) return null;
                return {
                  ...prev,
                  route: newRoutes.safeRoute,
                  currentStepIndex: 0,
                  distanceRemainingMeters: newRoutes.safeRoute.distanceMeters,
                  timeRemainingMinutes: newRoutes.safeRoute.durationMinutes,
                };
              });
            }
          })
          .catch(() => {
            isNavRecalculatingRef.current = false;
          });
      }
    }
  }, [userLocation?.latitude, userLocation?.longitude, incidents]);

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
      // 0. Load Google Fonts Material Symbols Outlined
      Font.loadAsync({
        MaterialSymbolsOutlined: require('./assets/fonts/MaterialSymbolsOutlined.ttf'),
      }).catch(() => {});

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

      // 4. Load persisted real community incidents (clean of all demo seeds, resolved items, and 12h expired reports)
      const storedIncidents = await loadIncidents(initialLat, initialLon);
      const cleanStored = filterExpiredIncidents(
        storedIncidents.filter(
          (i) =>
            !i.id.startsWith('seed-') &&
            (i.dismissals || 0) < (i.confirmations || 1) &&
            (i.dismissals || 0) < 5
        )
      );
      setIncidents(cleanStored);

      // If Supabase is configured, fetch live community reports
      let cleanOnline: Incident[] = [];
      if (isSupabaseConfigured()) {
        try {
          const online = await fetchOnlineIncidents();
          cleanOnline = filterExpiredIncidents(
            online.filter(
              (i) =>
                !i.id.startsWith('seed-') &&
                (i.dismissals || 0) < (i.confirmations || 1) &&
                (i.dismissals || 0) < 5
            )
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

      const savedWork = await loadWorkAddress();
      setWorkAddress(savedWork);

      const savedLastMode = await loadLastTransportMode();
      setLastTransportMode(savedLastMode);

      const savedAccessibilityRoute = await loadAccessibilityRoutePreference();
      setAccessibilityRouteOnly(savedAccessibilityRoute);

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
      let lastCompassHeadingVal = 0;
      let smoothedCompassVal = 0;
      let lastHeadingTime = 0;

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

            // If vehicle/pedestrian is moving (> 0.8 m/s ~ 2.9 km/h) and GPS provides course heading, use it for road alignment
            if (
              typeof loc.coords.speed === 'number' &&
              loc.coords.speed > 0.8 &&
              typeof loc.coords.heading === 'number' &&
              loc.coords.heading >= 0
            ) {
              const gpsBearing = Math.round(loc.coords.heading);
              lastCompassHeadingVal = gpsBearing;
              smoothedCompassVal = gpsBearing;
              setUserHeading(gpsBearing);
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

      // 6. Watch compass / gyroscope orientation heading with EMA smoothing and deadband hysteresis
      try {
        headingSubscription = await Location.watchHeadingAsync((headingData) => {
          const rawHeading =
            headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
          if (typeof rawHeading === 'number' && !isNaN(rawHeading)) {
            const now = Date.now();

            // Low-pass exponential moving average filter (alpha = 0.28)
            const angleDiff = ((((rawHeading - smoothedCompassVal) % 360) + 540) % 360) - 180;
            smoothedCompassVal = (smoothedCompassVal + angleDiff * 0.28 + 360) % 360;

            const changeFromLastEmitted = Math.abs(
              ((((smoothedCompassVal - lastCompassHeadingVal) % 360) + 540) % 360) - 180
            );

            // Throttle & Deadband:
            // 1. Deliberate user turn (>= 5.5 deg change) after at least 220ms: emit immediately.
            // 2. Slow subtle reorientation (>= 2.5 deg) after at least 600ms: emit to stay calibrated.
            // Micro-oscillations from walking sway (~ 2-4 deg) are filtered out completely.
            if (
              (changeFromLastEmitted >= 5.5 && now - lastHeadingTime >= 220) ||
              (changeFromLastEmitted >= 2.5 && now - lastHeadingTime >= 600)
            ) {
              lastHeadingTime = now;
              const rounded = Math.round(smoothedCompassVal);
              lastCompassHeadingVal = rounded;
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
          const cleanFresh = filterExpiredIncidents(
            fresh.filter(
              (i) =>
                !i.id.startsWith('seed-') &&
                (i.dismissals || 0) < (i.confirmations || 1) &&
                (i.dismissals || 0) < 5
            )
          );
          setIncidents(cleanFresh);
          await saveIncidents(cleanFresh);
        });

        subscribeToOnlineSOS(
          (newSOS) => {
            // Never alert self for own SOS
            if (newSOS.userId && currentUserProfile?.id && newSOS.userId === currentUserProfile.id) {
              return;
            }
            if (myCreatedSOSIdsRef.current.has(newSOS.id)) {
              return;
            }

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

    // 3. Deep link listener for OAuth redirect (sentinela://) & Radar invites
    const unsubscribeDeepLink = initAuthDeepLinkListener((profile) => {
      setCurrentUserProfile(profile);
      setShowAuthModal(false);
      fetchMySentinels(profile.id).then(setMySentinels);
    });

    const handleRadarDeepLink = (url?: string | null) => {
      if (!url) return;
      if (url.includes('radar')) {
        const pinMatch = url.match(/[?&]pin=([0-9]{4})/) || url.match(/radar[/:]([0-9]{4})/);
        if (pinMatch && pinMatch[1]) {
          setRadarAutoJoinPin(pinMatch[1]);
        }
        setShowRadarModal(true);
      }
    };

    Linking.getInitialURL().then(handleRadarDeepLink);
    const linkingSub = Linking.addEventListener('url', ({ url }: { url: string }) => handleRadarDeepLink(url));

    // 4. Notification Response listener (when user taps on a system notification directly)
    const notifResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response?.notification?.request?.content?.data;
      if (data && data.type === 'radar_invite' && data.pin) {
        setRadarAutoJoinPin(String(data.pin));
        setShowRadarModal(true);
      }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data: any = response?.notification?.request?.content?.data;
      if (data && data.type === 'radar_invite' && data.pin) {
        setRadarAutoJoinPin(String(data.pin));
        setShowRadarModal(true);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDeepLink();
      linkingSub.remove();
      notifResponseSub.remove();
    };
  }, []);

  // Subscribe to incoming stalking alerts and radar invitations when user profile is active
  useEffect(() => {
    if (!currentUserProfile?.id) return;

    const unsubscribeRadar = subscribeToRadarInvitesForSentinel(
      currentUserProfile.id,
      (invite) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActiveBanner({
          title: 'Radar Sentinela: Pedido de Ligação',
          body: `${invite.senderName} está à sua espera na multidão. Toque para ligar diretamente.`,
          type: 'proximity_alert',
          data: {
            type: 'radar_invite',
            pin: invite.pin,
          },
        });
      }
    );

    const unsubscribeStalking = subscribeToStalkingAlertsForSentinel(
      currentUserProfile.id,
      (alertSession) => {
        // Crucial: Only alert if the session is from another user, never self!
        if (alertSession.userId === currentUserProfile.id) {
          return;
        }
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
      unsubscribeRadar();
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

  // Handle adding a new incident report with Triangulation for Infiltrators & 50m Renewal for Hazard Reports
  const handleAddIncident = (
    data: Omit<Incident, 'id' | 'createdAt' | 'confirmations' | 'dismissals'>
  ) => {
    const now = Date.now();

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
              createdAt: now, // Refreshes lifetime
              confirmations: (item.confirmations || 1) + 1,
              title: 'Possíveis Infiltrados (Triangulado)',
              description: `${item.description}\n• Nova sinalização triangulada próxima.`,
            };
          }
          return item;
        });

        const filtered = filterExpiredIncidents(updated);
        setIncidents(filtered);
        saveIncidents(filtered);
        triangulation.clusterIds.forEach((id) => confirmIncidentOnline(id));
        setTargetCoordinate(null);
        return;
      }
    }

    // 50-meter cluster renewal rule:
    // Any existing hazard reports in the same location within 50m get their timestamp refreshed to now!
    const renewedExisting = incidents.map((item) => {
      const dist = calculateDistanceMeters(
        data.latitude,
        data.longitude,
        item.latitude,
        item.longitude
      );
      if (dist <= REPORT_RENEWAL_RADIUS_METERS) {
        return {
          ...item,
          createdAt: now, // Renewed: 12-hour expiration window starts anew!
          confirmations: item.confirmations + (item.category === data.category ? 1 : 0),
        };
      }
      return item;
    });

    const newIncident: Incident = {
      ...data,
      id: `inc-${now}`,
      createdAt: now,
      confirmations: 1,
      dismissals: 0,
    };

    const updated = filterExpiredIncidents([newIncident, ...renewedExisting]);
    setIncidents(updated);
    saveIncidents(updated);
    createOnlineIncident(newIncident);
    setTargetCoordinate(null);
  };

  // Handle upvoting/confirming an incident (also renews its 12h lifetime)
  const handleConfirmIncident = (id: string) => {
    const now = Date.now();
    const updated = incidents.map((item) =>
      item.id === id
        ? { ...item, confirmations: item.confirmations + 1, createdAt: now }
        : item
    );
    setIncidents(updated);
    saveIncidents(updated);
    confirmIncidentOnline(id);
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident({
        ...selectedIncident,
        confirmations: selectedIncident.confirmations + 1,
        createdAt: now,
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
    myCreatedSOSIdsRef.current.add(sos.id);
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
          const bannerData = (activeBanner as any)?.data;
          if (bannerData?.type === 'radar_invite' && bannerData?.pin) {
            setRadarAutoJoinPin(bannerData.pin);
            setShowRadarModal(true);
            setActiveBanner(null);
            return;
          }
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
          showWheelmapOnMap={showWheelmapOnMap}
          showBusStopsOnMap={areBusStopsEffective}
          busStops={nearbyBusStops}
          onSelectBusStop={(stop) => setSelectedBusStop(stop)}
          showCpStationsOnMap={showCpTrainsOnMap}
          cpStations={nearbyCpStations}
          onSelectCpStation={(station) => setSelectedCpStation(station)}
          showMetroStationsOnMap={isMetroEffective}
          metroStations={nearbyMetroStations}
          onSelectMetroStation={(station) => setSelectedMetroStation(station)}
          showStcpBusesOnMap={isAnyTransitActive}
          stcpVehicles={transitVehicles}
          onSelectStcpVehicle={(bus) => {
            Haptics.selectionAsync();

            if (bus.operator === 'cp') {
              const serviceName = bus.serviceName || 'Comboio CP';
              const trainNum = bus.routeId || '';
              const routeInfo = bus.origin && bus.destination ? `${bus.origin} ➔ ${bus.destination}` : 'Rede Ferroviária Nacional';
              const delayInfo =
                bus.delayMinutes && bus.delayMinutes > 0
                  ? `Atraso: +${bus.delayMinutes} min`
                  : 'Em circulação a horas';
              const bearingInfo = bus.bearing ? `${Math.round(bus.bearing)}º` : 'Em marcha';

              Alert.alert(
                `CP ${serviceName} ${trainNum}`.trim(),
                `${routeInfo}\n${delayInfo}\nRumo: ${bearingInfo}`
              );
              return;
            }

            let operatorName = 'STCP';
            let network = 'Porto Urbano';
            let typeLabel = 'Autocarro';

            if (bus.operator === 'unir') {
              operatorName = 'UNIR Mobilidade';
              network = 'Área Metropolitana do Porto';
            } else if (bus.operator === 'carris') {
              operatorName = 'Carris';
              network = 'Lisboa Urbana';
              if (bus.vehicleType === 'tram' || /E$/i.test(bus.displayLine || bus.routeId)) {
                typeLabel = 'Elétrico de Lisboa';
              }
            } else if (bus.operator === 'carris_metropolitana') {
              operatorName = 'Carris Metropolitana';
              network = 'Área Metropolitana de Lisboa';
            }

            Alert.alert(
              `${operatorName} · Linha ${bus.displayLine || bus.routeId}`,
              `${typeLabel} em circulação (${network}).\nRumo: ${bus.bearing ? `${bus.bearing}º` : 'Em trânsito'}`
            );
          }}
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
          onOpenRadar={() => setShowRadarModal(true)}
          isDaytime={isDayTime}
        />

        {/* Camada Festiva de Halloween (Isolada e facilmente removível) */}
        {!navState && !simulationState && (
          <HalloweenAmbientOverlay isDaytime={isDayTime} />
        )}
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
            accessibleRouteOnly={accessibilityRouteOnly}
          />

          {/* Top Compact Control Strip (Casa on Left with Filtros right underneath, and Active Hazard Pill if active) */}
          <View style={styles.topControlRow} pointerEvents="box-none">
            <View style={styles.topControlColumn} pointerEvents="box-none">
              {/* Row with Casa and Trabalho side-by-side */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} pointerEvents="box-none">
                {/* Casa Quick Pill */}
                <M3Pressable
                  scaleOnPress={0.94}
                  style={[
                    styles.compactFilterPill,
                    homeAddress && styles.filterChipHomeActive,
                  ]}
                  onPress={handlePressHome}
                  onLongPress={() => setShowHomeModal(true)}
                >
                  <Ionicons
                    name={homeAddress ? 'home' : 'home-outline'}
                    size={14}
                    color={homeAddress ? '#10B981' : '#080A0C'}
                  />
                  <Text
                    style={[
                      styles.compactFilterPillText,
                      homeAddress && styles.filterChipTextHomeActive,
                    ]}
                  >
                    {homeAddress ? 'Casa' : '+ Casa'}
                  </Text>
                </M3Pressable>

                {/* Trabalho Quick Pill */}
                <M3Pressable
                  scaleOnPress={0.94}
                  style={[
                    styles.compactFilterPill,
                    workAddress && styles.filterChipWorkActive,
                  ]}
                  onPress={handlePressWork}
                  onLongPress={() => setShowWorkModal(true)}
                >
                  <Ionicons
                    name={workAddress ? 'briefcase' : 'briefcase-outline'}
                    size={14}
                    color={workAddress ? '#D97706' : '#080A0C'}
                  />
                  <Text
                    style={[
                      styles.compactFilterPillText,
                      workAddress && styles.filterChipTextWorkActive,
                    ]}
                  >
                    {workAddress ? 'Trabalho' : '+ Trabalho'}
                  </Text>
                </M3Pressable>
              </View>

              {/* Filtros Button (Colocado debaixo do botão Casa) */}
              <M3Pressable
                scaleOnPress={0.92}
                style={[
                  styles.filtersFab,
                  activeLayersCount > 0 && styles.filtersFabActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowLayersModal(true);
                }}
              >
                <Ionicons
                  name="options-outline"
                  size={15}
                  color={activeLayersCount > 0 ? '#10B981' : '#080A0C'}
                />
                <Text style={styles.filtersFabText}>Filtros</Text>
                {activeLayersCount > 0 && (
                  <View style={styles.filtersBadge}>
                    <Text style={styles.filtersBadgeText}>
                      {activeLayersCount}
                    </Text>
                  </View>
                )}
              </M3Pressable>
            </View>

            {/* Active Incident Category Pill (shown only when an alert filter is active) */}
            {selectedFilter !== null && (
              <M3Pressable
                scaleOnPress={0.94}
                style={[
                  styles.compactFilterPill,
                  styles.activeHazardFilterPill,
                  {
                    backgroundColor: CATEGORIES[selectedFilter]?.color || '#3B82F6',
                    borderColor: CATEGORIES[selectedFilter]?.color || '#3B82F6',
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedFilter(null);
                }}
              >
                <MaterialCommunityIcons
                  name={(CATEGORIES[selectedFilter]?.mciIcon as any) || 'alert-circle'}
                  size={13}
                  color="#FFFFFF"
                />
                <Text style={styles.activeHazardFilterPillText} numberOfLines={1}>
                  {CATEGORIES[selectedFilter]?.label}
                </Text>
                <Ionicons name="close-circle" size={14} color="#FFFFFF" />
              </M3Pressable>
            )}
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
          accessibleRouteOnly={accessibilityRouteOnly}
          onToggleAccessibilityRoute={handleToggleAccessibilityRoute}
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

      {/* Paragem de Autocarro e Próximas Chegadas em Tempo Real (STCP / tiagoanoliveira) */}
      {selectedBusStop && (
        <BusStopDetailSheet
          stop={selectedBusStop}
          userLocation={userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null}
          onClose={() => setSelectedBusStop(null)}
          onNavigateToStop={(stop) => {
            setSelectedBusStop(null);
            handleRequestNavigation(stop.name, { latitude: stop.latitude, longitude: stop.longitude }, 'walking');
          }}
          onPlanRouteFromStop={(stop) => {
            setSelectedBusStop(null);
            setPreviewOriginName(stop.name);
            setPreviewOriginCoord({ latitude: stop.latitude, longitude: stop.longitude });
            if (previewDestCoord) {
              handleRequestNavigation(previewDestName, previewDestCoord, 'transit', {
                name: stop.name,
                coord: { latitude: stop.latitude, longitude: stop.longitude },
              });
            } else {
              setShowRoutePreview(true);
            }
          }}
        />
      )}

      {/* Estação e Apeadeiro de Comboio CP (Detalhe e Navegação por Transporte) */}
      {selectedCpStation && (
        <CpStationDetailSheet
          station={selectedCpStation}
          onClose={() => setSelectedCpStation(null)}
          onNavigateToStation={(st) => {
            setSelectedCpStation(null);
            handleRequestNavigation(st.name, { latitude: st.latitude, longitude: st.longitude }, 'transit');
          }}
        />
      )}

      {/* Estação do Metro do Porto (Detalhe e Navegação por Transporte) */}
      {selectedMetroStation && (
        <MetroStationDetailSheet
          station={selectedMetroStation}
          onClose={() => setSelectedMetroStation(null)}
          onNavigateToStation={(st) => {
            setSelectedMetroStation(null);
            handleRequestNavigation(st.name, { latitude: st.latitude, longitude: st.longitude }, 'transit');
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
        alternativeRoutes={previewAlternativeRoutes}
        currentMode={transportMode}
        userLocation={userLocation}
        homeAddress={homeAddress ? { latitude: homeAddress.latitude, longitude: homeAddress.longitude, label: 'Casa' } : null}
        accessibleRouteOnly={accessibilityRouteOnly}
        onToggleAccessibilityRoute={handleToggleAccessibilityRoute}
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
        currentUserProfile={currentUserProfile}
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
          setQuickModeDestination({
            title: 'Casa',
            coord: {
              latitude: home.latitude,
              longitude: home.longitude,
            },
            address: home.address,
          });
          setShowQuickModeModal(true);
        }}
      />

      {/* Work Safe Route Modal */}
      <WorkModal
        visible={showWorkModal}
        onClose={() => setShowWorkModal(false)}
        currentWork={workAddress}
        userLocation={userLocation}
        onSaveWork={handleSaveWorkAddress}
        onNavigateWork={(work) => {
          setQuickModeDestination({
            title: 'Trabalho',
            coord: {
              latitude: work.latitude,
              longitude: work.longitude,
            },
            address: work.address,
          });
          setShowQuickModeModal(true);
        }}
      />

      {/* Quick Transport Mode Picker Modal (Casa & Trabalho) */}
      <QuickTransportModeModal
        visible={showQuickModeModal}
        destinationTitle={quickModeDestination?.title || 'Destino'}
        destinationAddress={quickModeDestination?.address || ''}
        initialMode={lastTransportMode}
        onClose={() => setShowQuickModeModal(false)}
        onSelectAndStart={handleConfirmQuickMode}
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

      {/* Map Layers & Hazards Control Sheet (Google/Apple Maps pattern) */}
      <MapLayersModal
        visible={showLayersModal}
        onClose={() => setShowLayersModal(false)}
        showPoliceOnMap={showPoliceOnMap}
        onTogglePolice={() => setShowPoliceOnMap((prev) => !prev)}
        showPharmaciesOnMap={showPharmaciesOnMap}
        onTogglePharmacies={() => setShowPharmaciesOnMap((prev) => !prev)}
        showHospitalsOnMap={showHospitalsOnMap}
        onToggleHospitals={() => setShowHospitalsOnMap((prev) => !prev)}
        showWheelmapOnMap={showWheelmapOnMap}
        onToggleWheelmap={() => setShowWheelmapOnMap((prev) => !prev)}
        showStcpBusesOnMap={showStcpBusesOnMap}
        onToggleStcpBuses={() => setShowStcpBusesOnMap((prev) => !prev)}
        showUnirBusesOnMap={showUnirBusesOnMap}
        onToggleUnirBuses={() => setShowUnirBusesOnMap((prev) => !prev)}
        showCarrisBusesOnMap={showCarrisBusesOnMap}
        onToggleCarrisBuses={() => setShowCarrisBusesOnMap((prev) => !prev)}
        showCarrisMetroBusesOnMap={showCarrisMetroBusesOnMap}
        onToggleCarrisMetroBuses={() => setShowCarrisMetroBusesOnMap((prev) => !prev)}
        showCpTrainsOnMap={showCpTrainsOnMap}
        onToggleCpTrains={() => setShowCpTrainsOnMap((prev) => !prev)}
        showMetroStationsOnMap={showMetroStationsOnMap}
        onToggleMetroStations={() => setShowMetroStationsOnMap((prev) => !prev)}
        onActivateAllLayers={() => {
          setShowPoliceOnMap(true);
          setShowPharmaciesOnMap(true);
          setShowHospitalsOnMap(true);
          setShowWheelmapOnMap(true);
          setShowStcpBusesOnMap(true);
          setShowUnirBusesOnMap(true);
          setShowCarrisBusesOnMap(true);
          setShowCarrisMetroBusesOnMap(true);
          setShowCpTrainsOnMap(true);
          setShowMetroStationsOnMap(true);
        }}
        onDeactivateAllLayers={() => {
          setShowPoliceOnMap(false);
          setShowPharmaciesOnMap(false);
          setShowHospitalsOnMap(false);
          setShowWheelmapOnMap(false);
          setShowStcpBusesOnMap(false);
          setShowUnirBusesOnMap(false);
          setShowCarrisBusesOnMap(false);
          setShowCarrisMetroBusesOnMap(false);
          setShowCpTrainsOnMap(false);
          setShowMetroStationsOnMap(false);
        }}
        selectedFilter={selectedFilter}
        onSelectFilter={setSelectedFilter}
        incidents={incidents}
        protestMode={Boolean(notificationSettings.protestMode)}
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
        onOpenRadar={() => {
          setShowSentinelsModal(false);
          setShowRadarModal(true);
        }}
      />

      {/* Crowd Radar "Estou Aqui" Finding Modal */}
      <RadarModal
        visible={showRadarModal}
        onClose={() => {
          setShowRadarModal(false);
          setRadarAutoJoinPin(null);
        }}
        initialPin={radarAutoJoinPin}
        userLocation={userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude, accuracy: userLocation.accuracy } : null}
        userHeading={userHeading}
        sentinels={mySentinels}
        currentUserProfile={currentUserProfile}
        onNavigateToFriend={(name, coord) => {
          setShowRadarModal(false);
          setRadarAutoJoinPin(null);
          handleRequestNavigation(name, coord, 'walking');
        }}
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

      {/* Destination Arrival & Trip Completion Modal */}
      <ArrivalDestinationModal
        visible={!!arrivalModalData}
        data={arrivalModalData}
        onDismiss={() => setArrivalModalData(null)}
      />

      {/* 3. Stealth Floating M3 Navigation Bar (Google Material Design 3 Spec) */}
      {!navState && !simulationState && (
        <View style={styles.bottomDockContainer} pointerEvents="box-none">
          <View style={styles.bottomPillDock}>
            {/* 1. Mapa */}
            {(() => {
              const isMapActive = !showReportModal && !showTvdeModal && !showSentinelsModal;
              return (
                <M3Pressable
                  scaleOnPress={0.94}
                  style={styles.dockPillItem}
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
                  <View
                    style={[
                      styles.dockActiveIndicator,
                      isMapActive && styles.dockActiveIndicatorSelected,
                    ]}
                  >
                    <Ionicons
                      name={isMapActive ? 'home' : 'home-outline'}
                      size={18}
                      color={isMapActive ? '#080A0C' : '#CBD5E1'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.dockPillItemText,
                      isMapActive && styles.dockPillItemTextSelected,
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
              style={styles.dockPillItem}
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
              <View
                style={[
                  styles.dockActiveIndicator,
                  showReportModal && styles.dockActiveIndicatorSelected,
                ]}
              >
                <View style={styles.dockIconWrap}>
                  <Ionicons
                    name={showReportModal ? 'warning' : 'warning-outline'}
                    size={18}
                    color={showReportModal ? '#080A0C' : '#CBD5E1'}
                  />
                  {activeStalkingSession && <View style={styles.dockLiveBadgeDotRed} />}
                </View>
              </View>
              <Text
                style={[
                  styles.dockPillItemText,
                  showReportModal && styles.dockPillItemTextSelected,
                ]}
              >
                Sinalizar
              </Text>
            </M3Pressable>

            {/* 3. TVDE (Uber / Bolt / Táxi Ride Protection) */}
            <M3Pressable
              scaleOnPress={0.93}
              style={styles.dockPillItem}
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
              <View
                style={[
                  styles.dockActiveIndicator,
                  showTvdeModal && styles.dockActiveIndicatorSelected,
                ]}
              >
                <View style={styles.dockIconWrap}>
                  <Ionicons
                    name={showTvdeModal ? 'car-sport' : 'car-sport-outline'}
                    size={18}
                    color={showTvdeModal ? '#080A0C' : activeTvdeTrip ? '#10B981' : '#CBD5E1'}
                  />
                  {activeTvdeTrip && <View style={styles.dockLiveBadgeDotNeon} />}
                </View>
              </View>
              <Text
                style={[
                  styles.dockPillItemText,
                  !showTvdeModal && activeTvdeTrip && { color: '#10B981', fontWeight: '800' },
                  showTvdeModal && styles.dockPillItemTextSelected,
                ]}
              >
                TVDE
              </Text>
            </M3Pressable>

            {/* 4. Sentinelas (Trusted Circle & Live Tracking) */}
            <M3Pressable
              scaleOnPress={0.93}
              style={styles.dockPillItem}
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
              <View
                style={[
                  styles.dockActiveIndicator,
                  showSentinelsModal && styles.dockActiveIndicatorSelected,
                ]}
              >
                <View style={styles.dockIconWrap}>
                  <Ionicons
                    name={showSentinelsModal ? 'shield-checkmark' : 'shield-checkmark-outline'}
                    size={18}
                    color={showSentinelsModal ? '#080A0C' : '#CBD5E1'}
                  />
                  {mySentinels.length > 0 && (
                    <View style={styles.dockCountBadge}>
                      <Text style={styles.dockCountBadgeText}>{mySentinels.length}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.dockPillItemText,
                  showSentinelsModal && styles.dockPillItemTextSelected,
                ]}
              >
                Sentinelas
              </Text>
            </M3Pressable>

            {/* 5. SOS (Google M3 High-Emphasis Action Button) */}
            <M3Pressable
              scaleOnPress={0.91}
              style={styles.dockSosPill}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setShowSOSModal(true);
              }}
            >
              <Ionicons name="megaphone" size={16} color="#FFFFFF" />
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
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginTop: 6,
  },
  topControlColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  compactFilterPill: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: M3Shapes.small,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...M3Elevation.level2,
  },
  compactFilterPillText: {
    fontSize: 12,
    color: '#080A0C',
    fontWeight: '700',
  },
  filtersFab: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: M3Shapes.small,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...M3Elevation.level2,
  },
  filtersFabActive: {
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  filtersFabText: {
    color: '#080A0C',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  filtersBadge: {
    backgroundColor: '#10B981',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filtersBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  activeHazardFilterPill: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: M3Shapes.small,
    gap: 5,
  },
  activeHazardFilterPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 130,
  },
  filterChipHomeActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  filterChipTextHomeActive: {
    color: '#059669',
    fontWeight: '800',
  },
  filterChipWorkActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  filterChipTextWorkActive: {
    color: '#D97706',
    fontWeight: '800',
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
  filterChipActiveSchool: {
    backgroundColor: '#8B5CF6',
    borderColor: '#C4B5FD',
  },
  filterChipActiveHeritage: {
    backgroundColor: '#D97706',
    borderColor: '#FDE68A',
  },
  filterChipActiveWheelmap: {
    backgroundColor: '#10B981',
    borderColor: '#6EE7B7',
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
    bottom: Platform.OS === 'android' ? 16 : 14,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 28,
  },
  bottomPillDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 76,
    backgroundColor: M3Colors.surfaceContainer,
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...M3Elevation.level4,
  },
  dockPillItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 16,
    gap: 3,
  },
  dockActiveIndicator: {
    width: 58,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  dockActiveIndicatorSelected: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...M3Elevation.level2,
  },
  dockPillItemText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  dockPillItemTextSelected: {
    color: '#F8FAFC',
    fontWeight: '800',
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
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...M3Elevation.level3,
    gap: 2,
  },
  dockSosPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
