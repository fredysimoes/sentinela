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
import { Incident, IncidentCategory, SOSAlert, EmergencyContact, UserLocation, SafePlace } from './src/types';
import { CATEGORIES } from './src/constants/categories';
import { getSafePlaces, SafePlaceWithDistance, loadLiveOsmPlacesForRegion } from './src/services/safePlacesService';
import {
  loadIncidents,
  saveIncidents,
  loadEmergencyContacts,
  saveEmergencyContacts,
  loadActiveSOSAlerts,
  saveActiveSOSAlerts,
} from './src/services/storage';
import {
  requestNotificationPermissions,
  sendDangerProximityPushNotification,
  subscribeToInAppNotifications,
} from './src/services/notifications';
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
import { EmergencyContactsModal } from './src/components/EmergencyContactsModal';
import { calculateDistanceMeters } from './src/utils/geo';
import { getPharmacyStatus } from './src/utils/pharmacySchedule';
import {
  isSupabaseConfigured,
  fetchOnlineIncidents,
  createOnlineIncident,
  confirmIncidentOnline,
  dismissIncidentOnline,
  broadcastOnlineSOS,
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [targetCoordinate, setTargetCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeBanner, setActiveBanner] = useState<{
    title: string;
    body: string;
    type: 'sos_alert' | 'proximity_alert';
  } | null>(null);

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

      // 4. Load persisted data seeded around the user
      const storedIncidents = await loadIncidents(initialLat, initialLon);
      setIncidents(storedIncidents);

      // If Supabase is configured, fetch live community reports
      if (isSupabaseConfigured()) {
        try {
          const online = await fetchOnlineIncidents();
          if (online.length > 0) {
            setIncidents((prev) => {
              const merged = [...online];
              for (const p of prev) {
                if (!merged.some((m) => m.id === p.id)) {
                  merged.push(p);
                }
              }
              return merged;
            });
          }
        } catch (e) {
          console.warn('Erro ao carregar dados online do Supabase:', e);
        }
      }

      const storedContacts = await loadEmergencyContacts();
      setEmergencyContacts(storedContacts);

      const storedSOS = await loadActiveSOSAlerts();
      setActiveSOSAlerts(storedSOS);

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

            // Check if walking near any critical hazard (< 150m)
            storedIncidents.forEach((inc) => {
              if (inc.severity === 'critical' || inc.severity === 'high') {
                const dist = calculateDistanceMeters(
                  newLoc.latitude,
                  newLoc.longitude,
                  inc.latitude,
                  inc.longitude
                );
                if (dist < 150) {
                  sendDangerProximityPushNotification({
                    title: inc.title,
                    distanceMeters: dist,
                  });
                }
              }
            });
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
          if (fresh.length > 0) {
            setIncidents(fresh);
          }
        });

        subscribeToOnlineSOS((newSOS) => {
          setActiveSOSAlerts((prev) => [newSOS, ...prev.filter((s) => s.id !== newSOS.id)]);
          setActiveBanner({
            title: '🚨 ALERTA SOS EM DIRETO',
            body: 'Pedestre em perigo reportado nesta área!',
            type: 'sos_alert',
          });
        });
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

  // Handle downvoting an incident
  const handleDismissIncident = (id: string) => {
    const updated = incidents.map((item) =>
      item.id === id ? { ...item, dismissals: item.dismissals + 1 } : item
    );
    setIncidents(updated);
    saveIncidents(updated);
    dismissIncidentOnline(id);
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident({
        ...selectedIncident,
        dismissals: selectedIncident.dismissals + 1,
      });
    }
  };

  // Handle SOS Creation
  const handleSOSCreated = (sos: SOSAlert) => {
    const updated = [sos, ...activeSOSAlerts];
    setActiveSOSAlerts(updated);
    saveActiveSOSAlerts(updated);
    broadcastOnlineSOS(sos);
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

      {/* Floating Emergency / Proximity Notification Toast */}
      {activeBanner && (
        <View
          style={[
            styles.floatingBanner,
            activeBanner.type === 'sos_alert' ? styles.bannerSOS : styles.bannerWarn,
          ]}
        >
          <Ionicons
            name={activeBanner.type === 'sos_alert' ? 'megaphone' : 'warning'}
            size={22}
            color="#FFFFFF"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{activeBanner.title}</Text>
            <Text style={styles.bannerBody}>{activeBanner.body}</Text>
          </View>
          <TouchableOpacity onPress={() => setActiveBanner(null)} style={styles.bannerCloseBtn}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.brandIconWrap}>
            <Ionicons name="shield-half" size={20} color="#38BDF8" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>SENTINELA</Text>
              <View style={styles.liveIndicator} />
            </View>
            <Text style={styles.brandSubtitle}>Segurança Comunitária para Pedestres</Text>
          </View>
        </View>

        {/* Contacts button */}
        <TouchableOpacity
          style={styles.contactsBtn}
          onPress={() => setShowContactsModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={18} color="#38BDF8" />
          <Text style={styles.contactsBtnText}>SOS ({emergencyContacts.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Address Search Bar with Autocomplete & Quick Shortcuts */}
      {!navState && (
        <View style={{ zIndex: 99999, elevation: 30 }}>
          <SearchBar
            userLocation={userLocation}
            transportMode={transportMode}
            onTransportModeChange={setTransportMode}
            onSelectDestination={(name, coord, mode) => handleRequestNavigation(name, coord, mode)}
            onQuickRouteToPolice={handleQuickRouteToPolice}
            onQuickRouteToPharmacy={handleQuickRouteToPharmacy}
          />
        </View>
      )}

      {/* Categories Filter Strip */}
      <View style={styles.filterStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterStrip}
        >
          {/* ALL Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedFilter('all');
            }}
          >
            <Ionicons
              name="layers-outline"
              size={14}
              color={selectedFilter === 'all' ? '#0F172A' : '#94A3B8'}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              Todos ({incidents.length + safePlaces.length})
            </Text>
          </TouchableOpacity>

          {/* POLICE Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'police' && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedFilter('police');
            }}
          >
            <Ionicons
              name="shield-sharp"
              size={14}
              color={selectedFilter === 'police' ? '#FFFFFF' : '#3B82F6'}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'police' && { color: '#FFFFFF', fontWeight: '800' },
              ]}
            >
              Polícia (PSP/GNR/PJ)
            </Text>
          </TouchableOpacity>

          {/* PHARMACY Filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'pharmacy' && { backgroundColor: '#10B981', borderColor: '#10B981' },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedFilter('pharmacy');
            }}
          >
            <Ionicons
              name="medical"
              size={14}
              color={selectedFilter === 'pharmacy' ? '#FFFFFF' : '#10B981'}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'pharmacy' && { color: '#FFFFFF', fontWeight: '800' },
              ]}
            >
              Farmácias
            </Text>
          </TouchableOpacity>

          {/* Category Chips */}
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
                  setSelectedFilter(catKey);
                }}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : cat.color}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {cat.label} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Map */}
      <View style={styles.mapContainer}>
        <MapComponent
          userLocation={userLocation}
          userHeading={userHeading}
          incidents={incidents}
          activeSOSAlerts={activeSOSAlerts}
          safePlaces={safePlaces}
          selectedCategoryFilter={selectedFilter}
          activeRoute={navState ? navState.route : (showRoutePreview ? previewSafeRoute : null)}
          isNavigating={!!navState}
          onSelectIncident={(inc) => {
            Haptics.selectionAsync();
            setSelectedSafePlace(null);
            setSelectedIncident(inc);
          }}
          onSelectSafePlace={(place) => {
            Haptics.selectionAsync();
            setSelectedIncident(null);
            setSelectedSafePlace(place);
          }}
          onSelectSOS={(sos) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              '🚨 Alerta SOS Comunitário',
              `Utilizador a pedir ajuda neste ponto!\nEnviado às: ${new Date(sos.timestamp).toLocaleTimeString()}`
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

      {/* Bottom Action Floating Bar */}
      <View style={styles.bottomBar}>
        {/* Signal Hazard Button */}
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTargetCoordinate(null);
            setShowReportModal(true);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.reportIconCircle}>
            <Ionicons name="add" size={22} color="#0F172A" />
          </View>
          <View>
            <Text style={styles.reportBtnTitle}>Sinalizar Perigo</Text>
            <Text style={styles.reportBtnSub}>Partilhar no mapa</Text>
          </View>
        </TouchableOpacity>

        {/* SOS Emergency Button */}
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowSOSModal(true);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.sosPulse} />
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
        onClose={() => setShowReportModal(false)}
        onSubmit={handleAddIncident}
        currentLocation={userLocation}
        targetCoordinate={targetCoordinate}
      />

      {/* SOS Modal */}
      <SOSModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        currentLocation={userLocation}
        emergencyContacts={emergencyContacts}
        onSOSCreated={handleSOSCreated}
      />

      {/* Emergency Contacts Modal */}
      <EmergencyContactsModal
        visible={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={emergencyContacts}
        onSaveContacts={handleSaveContacts}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  contactsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  filterStripContainer: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  filterStrip: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
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
    gap: 10,
  },
  reportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  reportIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportBtnTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  reportBtnSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  sosPulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  sosBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  floatingBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  bannerSOS: {
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  bannerWarn: {
    backgroundColor: '#D97706',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bannerBody: {
    color: '#F8FAFC',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  bannerCloseBtn: {
    padding: 4,
  },
});
