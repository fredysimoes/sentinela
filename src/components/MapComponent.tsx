import React, { useRef, useEffect, useMemo, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StalkingTrackingSession } from '../services/stalkingService';

const GOOGLE_MAPS_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#17191d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111318' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c4c7c5' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e2e2e5' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a8c7fa' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#18281d' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2b2d33' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1d2024' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#383b42' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#202227' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#24282e' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1f2f' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#73839b' }],
  },
];
import { Incident, IncidentCategory, SOSAlert, UserLocation, SafePlace, HomeAddress } from '../types';
import { PedestrianRoute, RouteCoordinate } from '../types/navigation';
import { CATEGORIES } from '../constants/categories';
import { SafePlaceWithDistance } from '../services/safePlacesService';
import { getPharmacyStatus } from '../utils/pharmacySchedule';
import { SelectedMapPoint } from './SelectedPlaceSheet';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { M3Pressable } from './M3MotionWrapper';

// -------------------------------------------------------------
// High Performance Memoized Markers (prevents re-rendering 500 views)
// -------------------------------------------------------------
const PharmacyMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  const status = place.pharmacyStatus || getPharmacyStatus(place);
  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.pharmacyCleanWrap}>
        <Ionicons
          name="medical"
          size={24}
          color={status.ringColor}
          style={styles.cleanMarkerShadow}
        />
        {status.badgeText ? (
          <View style={[styles.cleanStatusDot, { backgroundColor: status.ringColor }]} />
        ) : null}
      </View>
    </Marker>
  );
});

const PoliceMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  const isPSP = place.type === 'psp';
  const isGNR = place.type === 'gnr';
  const policeColor = isPSP ? '#38BDF8' : isGNR ? '#10B981' : '#818CF8';
  const policeTag = isPSP ? 'PSP' : isGNR ? 'GNR' : 'PJ';

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.policeCleanWrap}>
        <Ionicons
          name="business"
          size={22}
          color={policeColor}
          style={styles.cleanMarkerShadow}
        />
        <View style={[styles.policeCleanTag, { backgroundColor: policeColor }]}>
          <Text style={styles.policeCleanTagText}>{policeTag}</Text>
        </View>
      </View>
    </Marker>
  );
});

const IncidentMarker = memo(({ incident, onSelect }: { incident: Incident; onSelect: () => void }) => {
  const meta = CATEGORIES[incident.category] || CATEGORIES.suspicious;
  const isPolicePresence = incident.category === 'police_presence';

  return (
    <Marker
      coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.markerPin, { borderColor: meta.color }]}>
        <View style={[styles.markerIconWrap, { backgroundColor: meta.color }]}>
          {isPolicePresence ? (
            <MaterialCommunityIcons name="shield-account" size={17} color="#FFFFFF" />
          ) : (
            <Ionicons name={meta.icon as any} size={15} color="#FFFFFF" />
          )}
        </View>
        {incident.confirmations > 0 && (
          <View style={styles.votesBadge}>
            <Text style={styles.votesBadgeText}>{incident.confirmations}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
});

interface MapComponentProps {
  userLocation: UserLocation | null;
  userHeading?: number;
  incidents: Incident[];
  activeSOSAlerts: SOSAlert[];
  safePlaces: SafePlaceWithDistance[];
  selectedCategoryFilter: IncidentCategory | 'all' | 'police' | 'pharmacy';
  activeRoute?: PedestrianRoute | null;
  isNavigating?: boolean;
  selectedMapPoint?: SelectedMapPoint | null;
  homeAddress?: HomeAddress | null;
  onSelectIncident: (incident: Incident) => void;
  onSelectSafePlace: (place: SafePlace) => void;
  onSelectSOS: (sos: SOSAlert) => void;
  onSelectMapPoint?: (point: SelectedMapPoint) => void;
  onMapClickCoordinate?: (coord: { latitude: number; longitude: number }) => void;
  onMapLongPress?: (coordinate: { latitude: number; longitude: number }) => void;
  onRegionChangeComplete?: (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => void;
  pickingLocation?: boolean;
  protestMode?: boolean;
  isTorchActive?: boolean;
  onToggleTorch?: () => void;
  onOpenStrobe?: () => void;
  routeOrigin?: { name: string; coord: RouteCoordinate } | null;
  routeDestination?: { name: string; coord: RouteCoordinate } | null;
  stalkingSession?: StalkingTrackingSession | null;
  isSimulating?: boolean;
  simulatedLocation?: RouteCoordinate | null;
}

export const MapComponent: React.FC<MapComponentProps> = memo(({
  userLocation,
  userHeading = 0,
  incidents,
  activeSOSAlerts,
  safePlaces,
  selectedCategoryFilter,
  activeRoute,
  isNavigating = false,
  selectedMapPoint = null,
  homeAddress = null,
  onSelectIncident,
  onSelectSafePlace,
  onSelectSOS,
  onSelectMapPoint,
  onMapClickCoordinate,
  onMapLongPress,
  onRegionChangeComplete,
  pickingLocation = false,
  protestMode = false,
  isTorchActive = false,
  onToggleTorch,
  onOpenStrobe,
  routeOrigin = null,
  routeDestination = null,
  stalkingSession = null,
  isSimulating = false,
  simulatedLocation = null,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [is3DMode, setIs3DMode] = React.useState(false);
  const [followHeading, setFollowHeading] = React.useState(false);
  const [isUserInteracting, setIsUserInteracting] = React.useState(false);
  const [mapCenter, setMapCenter] = React.useState<{ latitude: number; longitude: number } | null>(null);

  const handleRegionChange = (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    setMapCenter({ latitude: region.latitude, longitude: region.longitude });
    if (onRegionChangeComplete) {
      onRegionChangeComplete(region);
    }
  };

  const initialRegion = {
    latitude: userLocation?.latitude ?? 38.7223,
    longitude: userLocation?.longitude ?? -9.1393,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  const isDriving = activeRoute?.mode === 'driving';
  const navZoom = isDriving ? 17.5 : 18.5;

  // When navigation starts, automatically activate 3D perspective and follow heading
  useEffect(() => {
    if (isNavigating) {
      setIs3DMode(true);
      setFollowHeading(true);
      setIsUserInteracting(false);

      if (userLocation && mapRef.current) {
        mapRef.current.animateCamera(
          {
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            pitch: 55,
            heading: userHeading,
            zoom: navZoom,
          },
          { duration: 800 }
        );
      }
    } else {
      // Reset pitch to 0 when exiting navigation
      if (mapRef.current && userLocation) {
        mapRef.current.animateCamera(
          {
            pitch: 0,
            heading: 0,
            zoom: 16.5,
          },
          { duration: 600 }
        );
      }
      setIs3DMode(false);
      setFollowHeading(false);
      setIsUserInteracting(false);
    }
  }, [isNavigating, navZoom]);

  // Dynamic Camera tracking when moving / orienting in navigation mode
  useEffect(() => {
    if (isNavigating && !isUserInteracting && userLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          pitch: is3DMode ? 55 : 0,
          heading: followHeading ? userHeading : 0,
          zoom: navZoom,
        },
        { duration: 400 }
      );
    }
  }, [userLocation?.latitude, userLocation?.longitude, userHeading, is3DMode, followHeading, isUserInteracting, isNavigating, navZoom]);

  // Animate to user on initial load if not navigating or previewing route
  useEffect(() => {
    if (userLocation && mapRef.current && !activeRoute && !isNavigating) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        800
      );
    }
  }, [userLocation?.latitude, userLocation?.longitude, !!activeRoute, isNavigating]);

  // Fit route coordinates when previewing (only when not simulating or navigating)
  useEffect(() => {
    if (activeRoute && activeRoute.coordinates.length > 1 && mapRef.current && !isNavigating && !isSimulating) {
      mapRef.current.fitToCoordinates(activeRoute.coordinates, {
        edgePadding: { top: 140, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }
  }, [activeRoute?.id, isNavigating, isSimulating]);

  // Dynamic Camera centering on the active simulation step
  useEffect(() => {
    if (isSimulating && simulatedLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: simulatedLocation.latitude,
            longitude: simulatedLocation.longitude,
          },
          pitch: 35,
          heading: 0,
          zoom: navZoom,
        },
        { duration: 600 }
      );
    }
  }, [isSimulating, simulatedLocation?.latitude, simulatedLocation?.longitude, navZoom]);

  const handleRecenter = () => {
    setIsUserInteracting(false);
    if (userLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          pitch: is3DMode ? 55 : 0,
          heading: followHeading ? userHeading : 0,
          zoom: isNavigating ? navZoom : 17,
        },
        { duration: 500 }
      );
    }
  };

  const toggle3DMode = () => {
    const next3D = !is3DMode;
    setIs3DMode(next3D);
    if (userLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          pitch: next3D ? 55 : 0,
          heading: followHeading ? userHeading : 0,
        },
        { duration: 500 }
      );
    }
  };

  const toggleHeadingFollow = () => {
    const nextFollow = !followHeading;
    setFollowHeading(nextFollow);
    if (userLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          heading: nextFollow ? userHeading : 0,
        },
        { duration: 400 }
      );
    }
  };

  // Memoized filter of safe places (prioritizes places near current map center / view)
  const filteredSafePlaces = useMemo(() => {
    const center = mapCenter || (userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : { latitude: 38.7223, longitude: -9.1393 });

    const sortByDistanceToCenter = (list: SafePlaceWithDistance[]) => {
      return [...list].sort((a, b) => {
        const distA = Math.hypot(a.latitude - center.latitude, a.longitude - center.longitude);
        const distB = Math.hypot(b.latitude - center.latitude, b.longitude - center.longitude);
        return distA - distB;
      });
    };

    if (selectedCategoryFilter === 'police') {
      const police = safePlaces.filter((p) => p.type === 'psp' || p.type === 'gnr' || p.type === 'pj');
      return sortByDistanceToCenter(police).slice(0, 50);
    }

    if (selectedCategoryFilter === 'pharmacy') {
      const pharmacies = safePlaces.filter((p) => p.type === 'pharmacy');
      return sortByDistanceToCenter(pharmacies).slice(0, 60);
    }

    // 'all': Show nearest 30 police stations + nearest 40 pharmacies to visible map center
    const police = safePlaces.filter((p) => p.type === 'psp' || p.type === 'gnr' || p.type === 'pj');
    const pharmacies = safePlaces.filter((p) => p.type === 'pharmacy');
    const nearestPolice = sortByDistanceToCenter(police).slice(0, 30);
    const nearestPharmacies = sortByDistanceToCenter(pharmacies).slice(0, 40);

    return [...nearestPolice, ...nearestPharmacies];
  }, [safePlaces, selectedCategoryFilter, mapCenter, userLocation]);

  // Memoized filter of incidents
  const filteredIncidents = useMemo(() => {
    const showIncidents =
      selectedCategoryFilter === 'all' ||
      (selectedCategoryFilter !== 'police' && selectedCategoryFilter !== 'pharmacy');

    if (!showIncidents) return [];
    if (selectedCategoryFilter === 'all') return incidents;
    return incidents.filter((item) => item.category === selectedCategoryFilter);
  }, [incidents, selectedCategoryFilter]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        userInterfaceStyle="dark"
        customMapStyle={GOOGLE_MAPS_DARK_STYLE}
        onPanDrag={() => setIsUserInteracting(true)}
        onRegionChangeComplete={handleRegionChange}
        onPoiClick={(e) => {
          if (onSelectMapPoint) {
            onSelectMapPoint({
              name: e.nativeEvent.name || 'Ponto de Interesse',
              latitude: e.nativeEvent.coordinate.latitude,
              longitude: e.nativeEvent.coordinate.longitude,
            });
          }
        }}
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') {
            if (onMapClickCoordinate) {
              onMapClickCoordinate(e.nativeEvent.coordinate);
            }
          }
        }}
        onLongPress={(e) => {
          if (onMapLongPress) {
            onMapLongPress(e.nativeEvent.coordinate);
          }
        }}
      >
        {/* User safety radius halo */}
        {userLocation && (
          <Circle
            center={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            radius={80}
            strokeColor="rgba(56, 189, 248, 0.35)"
            fillColor="rgba(56, 189, 248, 0.08)"
          />
        )}

        {/* Directional Pedestrian Marker with Gyroscope/Compass Cone of Light */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={isNavigating ? 2000 : 999}
            flat={false}
          >
            <View style={styles.userMarkerContainer}>
              {/* Flashlight / Vision Cone */}
              <View
                style={[
                  styles.flashlightConeWrap,
                  {
                    transform: [{ rotate: `${userHeading}deg` }],
                  },
                ]}
              >
                <View style={styles.flashlightOuterBeam} />
                <View style={styles.flashlightInnerBeam} />
              </View>

              {/* Glowing Avatar Disc */}
              <View style={styles.userAvatarDisc}>
                <View
                  style={[
                    styles.userAvatarCore,
                    {
                      transform: [{ rotate: `${userHeading}deg` }],
                    },
                  ]}
                >
                  <View style={styles.userPointerTriangle} />
                </View>
              </View>
            </View>
          </Marker>
        )}

        {/* Active Pedestrian Route */}
        {activeRoute && (
          <>
            <Polyline
              coordinates={activeRoute.coordinates}
              strokeColor="#0F172A"
              strokeWidth={7}
            />
            <Polyline
              coordinates={activeRoute.coordinates}
              strokeColor={activeRoute.isSafe ? '#10B981' : '#F59E0B'}
              strokeWidth={4.5}
            />

            {/* Custom Origin Point A Marker (Preview or Simulation) */}
            {(!isNavigating || isSimulating) && routeOrigin && (
              <Marker
                coordinate={routeOrigin.coord}
                zIndex={1004}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.endpointMarkerA}>
                  <Text style={styles.endpointMarkerLetter}>A</Text>
                </View>
              </Marker>
            )}

            {/* Destination Point B Marker */}
            {routeDestination && (
              <Marker
                coordinate={routeDestination.coord}
                zIndex={1004}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.endpointMarkerB}>
                  <Text style={styles.endpointMarkerLetter}>B</Text>
                </View>
              </Marker>
            )}

            {/* Simulation Walker Avatar Marker */}
            {isSimulating && simulatedLocation && (
              <Marker
                coordinate={simulatedLocation}
                zIndex={2010}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.simAvatarContainer}>
                  <View style={styles.simAvatarPulse} />
                  <View style={styles.simAvatarCore}>
                    <Ionicons name="walk" size={18} color="#FFFFFF" />
                  </View>
                </View>
              </Marker>
            )}
          </>
        )}

        {/* Active SOS Danger Zones */}
        {activeSOSAlerts.map((sos) => (
          <React.Fragment key={sos.id}>
            <Circle
              center={{
                latitude: sos.latitude,
                longitude: sos.longitude,
              }}
              radius={200}
              strokeColor="rgba(239, 68, 68, 0.8)"
              fillColor="rgba(239, 68, 68, 0.22)"
            />
            <Marker
              coordinate={{
                latitude: sos.latitude,
                longitude: sos.longitude,
              }}
              onPress={() => onSelectSOS(sos)}
            >
              <View style={styles.sosMarkerContainer}>
                <View style={styles.sosMarkerPulse} />
                <View style={styles.sosMarker}>
                  <Ionicons name="megaphone" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.sosMarkerBadge}>
                  <Text style={styles.sosMarkerBadgeText}>SOS</Text>
                </View>
              </View>
            </Marker>
          </React.Fragment>
        ))}

        {/* Active Stalking Live Breadcrumb Trail */}
        {stalkingSession && stalkingSession.breadcrumbs && stalkingSession.breadcrumbs.length > 1 && (
          <>
            <Polyline
              coordinates={stalkingSession.breadcrumbs.map((b) => ({
                latitude: b.latitude,
                longitude: b.longitude,
              }))}
              strokeColor="#0F172A"
              strokeWidth={7}
            />
            <Polyline
              coordinates={stalkingSession.breadcrumbs.map((b) => ({
                latitude: b.latitude,
                longitude: b.longitude,
              }))}
              strokeColor="#EF4444"
              strokeWidth={4}
              lineDashPattern={[4, 6]}
            />
          </>
        )}

        {/* Live Stalking Marker of Protected Person */}
        {stalkingSession && (
          <>
            <Circle
              center={{ latitude: stalkingSession.latestLat, longitude: stalkingSession.latestLng }}
              radius={30}
              fillColor="rgba(239, 68, 68, 0.22)"
              strokeColor="rgba(239, 68, 68, 0.65)"
              strokeWidth={1.5}
            />
            <Marker
              coordinate={{ latitude: stalkingSession.latestLat, longitude: stalkingSession.latestLng }}
              zIndex={1008}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.stalkingMarkerWrap}>
                <View style={styles.stalkingPulseCircle}>
                  <Ionicons name="eye" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.stalkingNamePill}>
                  <Text style={styles.stalkingNameText}>{stalkingSession.userName.split(' ')[0]}</Text>
                </View>
              </View>
            </Marker>
          </>
        )}

        {/* Safe Places (Police Stations & Pharmacies) */}
        {filteredSafePlaces.map((place) => {
          if (place.type === 'pharmacy') {
            return (
              <PharmacyMarker
                key={place.id}
                place={place}
                onSelect={() => onSelectSafePlace(place)}
              />
            );
          }

          return (
            <PoliceMarker
              key={place.id}
              place={place}
              onSelect={() => onSelectSafePlace(place)}
            />
          );
        })}

        {/* Community Hazard Incidents */}
        {filteredIncidents.map((incident) => (
          <IncidentMarker
            key={incident.id}
            incident={incident}
            onSelect={() => onSelectIncident(incident)}
          />
        ))}

        {/* Selected Map Destination Pin (POI, Shop, Supermarket, or Tapped Point) */}
        {selectedMapPoint && (
          <Marker
            coordinate={{
              latitude: selectedMapPoint.latitude,
              longitude: selectedMapPoint.longitude,
            }}
            zIndex={1002}
            anchor={{ x: 0.5, y: 1.0 }}
          >
            <View style={styles.selectedPointMarker}>
              <View style={styles.selectedPointPulse} />
              <View style={styles.selectedPointPin}>
                <Ionicons name="location" size={32} color="#38BDF8" />
              </View>
              <View style={styles.selectedPointBadge}>
                <Text style={styles.selectedPointBadgeText} numberOfLines={1}>
                  {selectedMapPoint.name}
                </Text>
              </View>
            </View>
          </Marker>
        )}
        {/* User Saved Home Marker */}
        {homeAddress && (
          <Marker
            coordinate={{
              latitude: homeAddress.latitude,
              longitude: homeAddress.longitude,
            }}
            zIndex={990}
            anchor={{ x: 0.5, y: 1.0 }}
          >
            <View style={styles.homeMapMarker}>
              <View style={styles.homeMapMarkerIcon}>
                <Ionicons name="home" size={16} color="#0F172A" />
              </View>
              <View style={styles.homeMapMarkerBadge}>
                <Text style={styles.homeMapMarkerBadgeText}>Casa</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Floating Map Controls Column (Compass, 3D/2D, Recenter) */}
      <View style={styles.floatingControlsStack}>
        {/* Protest Mode Flashlight & Strobe Buttons (placed directly above compass) */}
        {protestMode && (
          <>
            {/* Strobe Button */}
            <M3Pressable
              scaleOnPress={0.9}
              style={[styles.floatingControlBtn, styles.protestStrobeBtn]}
              onPress={onOpenStrobe}
            >
              <Ionicons name="flash" size={22} color="#EF4444" />
            </M3Pressable>

            {/* Hardware Flashlight Toggle Button */}
            <M3Pressable
              scaleOnPress={0.9}
              style={[
                styles.floatingControlBtn,
                isTorchActive ? styles.protestTorchBtnActive : styles.protestTorchBtn,
              ]}
              onPress={onToggleTorch}
            >
              <Ionicons
                name={isTorchActive ? "flashlight" : "flashlight-outline"}
                size={22}
                color={isTorchActive ? "#000000" : "#F59E0B"}
              />
            </M3Pressable>
          </>
        )}

        {/* Gyroscope/Compass Heading Button */}
        <M3Pressable
          scaleOnPress={0.9}
          style={[styles.floatingControlBtn, followHeading && styles.floatingControlBtnActive]}
          onPress={toggleHeadingFollow}
        >
          <View style={{ transform: [{ rotate: `${-userHeading}deg` }] }}>
            <Ionicons
              name="compass-outline"
              size={22}
              color={followHeading ? M3Colors.primary : M3Colors.onSurfaceVariant}
            />
          </View>
        </M3Pressable>

        {/* 3D / 2D Perspective Toggle */}
        <M3Pressable
          scaleOnPress={0.9}
          style={[styles.floatingControlBtn, is3DMode && styles.floatingControlBtnActive]}
          onPress={toggle3DMode}
        >
          <Text
            style={[
              styles.floatingControlText,
              is3DMode && styles.floatingControlTextActive,
            ]}
          >
            {is3DMode ? '3D' : '2D'}
          </Text>
        </M3Pressable>

        {/* Recenter GPS */}
        <M3Pressable
          scaleOnPress={0.9}
          style={styles.floatingControlBtn}
          onPress={handleRecenter}
        >
          <Ionicons name="locate" size={22} color={M3Colors.primary} />
        </M3Pressable>
      </View>

      {/* Re-center Navigation Pill (shown if user panned away during active navigation) */}
      {isNavigating && isUserInteracting && (
        <M3Pressable
          style={styles.recenterNavPill}
          onPress={handleRecenter}
        >
          <Ionicons name="navigate" size={16} color={M3Colors.onPrimary} />
          <Text style={styles.recenterNavPillText}>Recentrar Navegação 3D</Text>
        </M3Pressable>
      )}

      {/* Picking Location Indicator */}
      {pickingLocation && (
        <View style={styles.pickingBanner}>
          <Ionicons name="pin" size={16} color="#FFFFFF" />
          <Text style={styles.pickingBannerText}>
            Pressione longamente no mapa para escolher o ponto do alerta
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  floatingControlsStack: {
    position: 'absolute',
    right: 16,
    bottom: 110,
    gap: 10,
    alignItems: 'center',
    zIndex: 100,
  },
  floatingControlBtn: {
    width: 46,
    height: 46,
    borderRadius: M3Shapes.large,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    ...M3Elevation.level2,
  },
  floatingControlBtnActive: {
    borderColor: M3Colors.secondary,
    backgroundColor: M3Colors.secondaryContainer,
  },
  protestStrobeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: '#EF4444',
  },
  protestTorchBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#F59E0B',
  },
  protestTorchBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingControlText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  floatingControlTextActive: {
    color: M3Colors.onSecondaryContainer,
  },
  recenterNavPill: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: M3Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: M3Shapes.full,
    ...M3Elevation.level3,
    zIndex: 100,
  },
  recenterNavPillText: {
    color: M3Colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  userMarkerContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashlightConeWrap: {
    position: 'absolute',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashlightOuterBeam: {
    position: 'absolute',
    top: 14,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 38,
    borderRightWidth: 38,
    borderBottomWidth: 56,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(56, 189, 248, 0.22)',
    transform: [{ rotate: '180deg' }],
  },
  flashlightInnerBeam: {
    position: 'absolute',
    top: 26,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 44,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(56, 189, 248, 0.45)',
    transform: [{ rotate: '180deg' }],
  },
  userAvatarDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  userAvatarCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 1.5,
  },
  userPointerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  pickingBanner: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: '#1E2024',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: M3Shapes.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...M3Elevation.level3,
  },
  pickingBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  markerPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  markerIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  votesBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#10B981',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  votesBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sosMarkerContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosMarkerPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  sosMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosMarkerBadge: {
    position: 'absolute',
    bottom: -2,
    backgroundColor: '#991B1B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  sosMarkerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Clean Pharmacy Pins (no large circle)
  pharmacyCleanWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  cleanStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 1,
    borderWidth: 1,
    borderColor: '#0F172A',
  },

  // Clean Police Pins (PSP, GNR, PJ - no large circle)
  policeCleanWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  policeCleanTag: {
    marginTop: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: '#0F172A',
  },
  policeCleanTagText: {
    color: '#0F172A',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  cleanMarkerShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },

  // Selected Map Point Pin (POI / Custom Point)
  selectedPointMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
  },
  selectedPointPulse: {
    position: 'absolute',
    bottom: 2,
    width: 18,
    height: 8,
    borderRadius: 9,
    backgroundColor: 'rgba(56, 189, 248, 0.45)',
    transform: [{ scaleX: 1.8 }],
  },
  selectedPointPin: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
  },
  selectedPointBadge: {
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
    maxWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  selectedPointBadgeText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Home Map Marker
  homeMapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeMapMarkerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#38BDF8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  homeMapMarkerBadge: {
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  homeMapMarkerBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  endpointMarkerA: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  endpointMarkerB: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  endpointMarkerLetter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  stalkingMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stalkingPulseCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  stalkingNamePill: {
    backgroundColor: '#1E2430',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  stalkingNameText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Simulation Walker Marker
  simAvatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  simAvatarPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  simAvatarCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 8,
  },
});
