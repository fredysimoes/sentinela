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
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import Haptics from './src/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
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
import { PedestrianRoute, NavigationState, RouteCoordinate, TransportMode } from './src/types/navigation';
import { calculateSafeNavigationRoutes } from './src/services/routingService';
import { NavigationBanner } from './src/components/NavigationBanner';
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
import { ProtestHUD } from './src/components/ProtestHUD';
import { ProtestLightModal } from './src/components/ProtestLightModal';
import { ProtestRightsModal } from './src/components/ProtestRightsModal';
import { MaterialAlertBanner } from './src/components/MaterialAlertBanner';
import { FeedbackModal } from './src/components/FeedbackModal';
import { syncPendingFeedback } from './src/services/feedbackService';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from './src/theme/m3';
import { calculateDistanceMeters } from './src/utils/geo';
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
  const [selectedFilter, setSelectedFilter] = useState<IncidentCategory | 'all' | 'police' | 'pharmacy'>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedMapPoint, setSelectedMapPoint] = useState<SelectedMapPoint | null>(null);
  const [homeAddress, setHomeAddress] = useState<HomeAddress | null>(null);
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [protestLightMode, setProtestLightMode] = useState<'torch' | 'strobe' | null>(null);
  const [showProtestRightsModal, setShowProtestRightsModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<IncidentCategory>('dark_area');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [targetCoordinate, setTargetCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeBanner, setActiveBanner] = useState<{
    title: string;
    body: string;
    type: 'sos_alert' | 'proximity_alert';
  } | null>(null);

  const handleOpenTorch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProtestLightMode('torch');
  };

  const handleOpenStrobe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setProtestLightMode('strobe');
  };

  const handleOpenReportPolice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReportCategory('police_presence');
    setTargetCoordinate(null);
    setShowReportModal(true);
  };

  const handleExitProtestMode = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated: NotificationSettings = {
      ...notificationSettings,
      protestMode: false,
    };
    setNotificationSettings(updated);
    await saveNotificationSettings(updated);
  };

  const handleSaveNotificationSettings = async (newSettings: NotificationSettings) => {
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
    if (newSettings.enabled && newSettings.backgroundTracking) {
      await startBackgroundLocationTracking();
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

  // Navigation States
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [showRoutePreview, setShowRoutePreview] = useState(false);
  const [previewSafeRoute, setPreviewSafeRoute] = useState<PedestrianRoute | null>(null);
  const [previewDirectRoute, setPreviewDirectRoute] = useState<PedestrianRoute | undefined>(undefined);
  const [previewDestName, setPreviewDestName] = useState('');
  const [previewDestCoord, setPreviewDestCoord] = useState<RouteCoordinate | null>(null);

  const handleRequestNavigation = async (
    destName: string,
    destCoord: RouteCoordinate,
    mode: TransportMode = transportMode
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const origin: RouteCoordinate = {
      latitude: userLocation?.latitude ?? 41.1501,
      longitude: userLocation?.longitude ?? -8.6112,
    };

    setPreviewDestName(destName);
    setPreviewDestCoord(destCoord);
    setTransportMode(mode);

    const routes = await calculateSafeNavigationRoutes({
      origin,
      destination: destCoord,
      incidents,
      mode,
    });

    setPreviewSafeRoute(routes.safeRoute);
    setPreviewDirectRoute(routes.directRoute);
    setShowRoutePreview(true);
  };

  const handleTogglePreviewMode = async (newMode: TransportMode) => {
    if (!previewDestCoord) return;
    Haptics.selectionAsync();
    setTransportMode(newMode);
    const origin: RouteCoordinate = {
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

  const handleStartNavigation = (chosenRoute: PedestrianRoute) => {
    if (!previewDestCoord) return;

    setNavState({
      isActive: true,
      destinationName: previewDestName,
      destinationCoord: previewDestCoord,
      route: chosenRoute,
      mode: chosenRoute.mode || transportMode,
      currentStepIndex: 0,
      distanceRemainingMeters: chosenRoute.distanceMeters,
      timeRemainingMinutes: chosenRoute.durationMinutes,
    });

    setShowRoutePreview(false);
    setSelectedSafePlace(null);
    setSelectedIncident(null);
  };

  const handleExitNavigation = () => {
    Haptics.selectionAsync();
    setNavState(null);
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
      return;
    }

    const speedMetersPerMin = navState.mode === 'driving' ? 500 : 75;
    const remainingMins = Math.max(1, Math.round(distToDest / speedMetersPerMin));

    setNavState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        distanceRemainingMeters: distToDest,
        timeRemainingMinutes: remainingMins,
      };
    });
  }, [userLocation?.latitude, userLocation?.longitude]);

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

      // 2. Request Location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
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

      // Load user proximity notification settings and start background tracking if enabled
      const savedSettings = await loadNotificationSettings();
      setNotificationSettings(savedSettings);
      if (savedSettings.enabled && savedSettings.backgroundTracking) {
        startBackgroundLocationTracking();
      }

      // Load safe places (Police & Pharmacies across Portugal)
      const places = getSafePlaces('all', initialLat, initialLon);
      setSafePlaces(places);

      // 5. Watch position for walking pedestrians
      try {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // update every 10 meters
            timeInterval: 4000,
          },
          (loc) => {
            const newLoc = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
            };
            setUserLocation(newLoc);

            // Check real-time proximity to hazards using configured radius (e.g. 300m) and enabled categories
            const currentIncidents = cleanOnline.length > 0 ? cleanOnline : cleanStored;
            checkProximityAndNotify(
              newLoc.latitude,
              newLoc.longitude,
              currentIncidents,
              savedSettings
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

  // Handle adding a new incident report
  const handleAddIncident = (
    data: Omit<Incident, 'id' | 'createdAt' | 'confirmations' | 'dismissals'>
  ) => {
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

      {/* Google M3 Floating Emergency / Proximity Alert Pill */}
      <MaterialAlertBanner
        alert={activeBanner}
        onDismiss={() => setActiveBanner(null)}
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
          activeRoute={navState ? navState.route : (showRoutePreview ? previewSafeRoute : null)}
          isNavigating={!!navState}
          selectedMapPoint={selectedMapPoint}
          homeAddress={homeAddress}
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
        />
      </View>

      {/* 2. Google M3 Floating Search Capsule & Floating Chips Overlay */}
      {!navState && (
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
              {/* Casa Quick Chip */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  homeAddress && styles.filterChipHomeActive,
                ]}
                onPress={handlePressHome}
                onLongPress={() => setShowHomeModal(true)}
                activeOpacity={0.8}
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
              </TouchableOpacity>

              {/* Police Quick Chip */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === 'police' && styles.filterChipActivePolice,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedFilter(selectedFilter === 'police' ? 'all' : 'police');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield-sharp"
                  size={14}
                  color={selectedFilter === 'police' ? '#FFFFFF' : '#3B82F6'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === 'police' && styles.filterChipTextActiveWhite,
                  ]}
                >
                  Polícia (PSP/GNR)
                </Text>
              </TouchableOpacity>

              {/* Pharmacy Quick Chip */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === 'pharmacy' && styles.filterChipActivePharmacy,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedFilter(selectedFilter === 'pharmacy' ? 'all' : 'pharmacy');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="medical"
                  size={14}
                  color={selectedFilter === 'pharmacy' ? '#FFFFFF' : M3Colors.success}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === 'pharmacy' && styles.filterChipTextActiveWhite,
                  ]}
                >
                  Farmácias
                </Text>
              </TouchableOpacity>

              {/* All Incidents Chip */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedFilter === 'all' && styles.filterChipActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedFilter('all');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="layers-outline"
                  size={14}
                  color={selectedFilter === 'all' ? M3Colors.onSecondaryContainer : M3Colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  Todos {incidents.length > 0 ? `(${incidents.length})` : ''}
                </Text>
              </TouchableOpacity>

              {/* Hazard Category Chips */}
              {(Object.keys(CATEGORIES) as IncidentCategory[]).map((catKey) => {
                const cat = CATEGORIES[catKey];
                const isSelected = selectedFilter === catKey;
                const count = incidents.filter((i) => i.category === catKey).length;
                return (
                  <TouchableOpacity
                    key={catKey}
                    style={[
                      styles.filterChip,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedFilter(isSelected ? 'all' : catKey);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon as any}
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
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Protest Mode Floating Quick Actions HUD */}
          {notificationSettings.protestMode && (
            <ProtestHUD
              onOpenTorch={handleOpenTorch}
              onOpenStrobe={handleOpenStrobe}
              onOpenReportPolice={handleOpenReportPolice}
              onOpenRights={() => setShowProtestRightsModal(true)}
              onExitProtestMode={handleExitProtestMode}
            />
          )}
        </View>
      )}

      {/* Bottom Action Floating Bar */}
      <View style={styles.bottomBar}>
        {/* Signal Hazard Button - High Contrast Light Pill FAB */}
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTargetCoordinate(null);
            setShowReportModal(true);
          }}
          activeOpacity={0.88}
        >
          <View style={styles.reportIconCircle}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.reportBtnTitle}>Sinalizar Perigo</Text>
            <Text style={styles.reportBtnSub}>Partilhar no mapa</Text>
          </View>
        </TouchableOpacity>

        {/* SOS Emergency Button - M3 Squircle FAB */}
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowSOSModal(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="megaphone" size={24} color="#FFFFFF" />
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      </View>

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
        />
      )}

      {/* Route Preview Modal */}
      <RoutePreviewModal
        visible={showRoutePreview}
        destinationName={previewDestName}
        safeRoute={previewSafeRoute}
        directRoute={previewDirectRoute}
        currentMode={transportMode}
        onToggleMode={handleTogglePreviewMode}
        onClose={() => setShowRoutePreview(false)}
        onStartNavigation={handleStartNavigation}
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
      />

      {/* Feedback & Bug Reporting Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        userLocation={userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null}
      />

      {/* Protest Screen Light / Strobe Beacon Modal */}
      <ProtestLightModal
        visible={protestLightMode !== null}
        mode={protestLightMode || 'torch'}
        onClose={() => setProtestLightMode(null)}
      />

      {/* Protest Portuguese Legal & Constitutional Rights Guide */}
      <ProtestRightsModal
        visible={showProtestRightsModal}
        onClose={() => setShowProtestRightsModal(false)}
      />
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: M3Shapes.full,
    backgroundColor: 'rgba(29, 32, 36, 0.94)',
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
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
  filterChipActivePolice: {
    backgroundColor: '#1D4ED8',
    borderColor: '#3B82F6',
  },
  filterChipActivePharmacy: {
    backgroundColor: '#0F5132',
    borderColor: M3Colors.success,
  },
  filterChipActive: {
    backgroundColor: M3Colors.secondaryContainer,
    borderColor: M3Colors.secondary,
  },
  filterChipText: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
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
  mapContainer: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 24 : 20,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: M3Shapes.large,
    gap: 12,
    height: 56,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  reportIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportBtnTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  reportBtnSub: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.sosBright,
    paddingHorizontal: 22,
    borderRadius: M3Shapes.large,
    gap: 8,
    height: 56,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...M3Elevation.level4,
  },
  sosPulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: M3Shapes.large,
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
  },
  sosBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
