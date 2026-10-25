import React, { useRef, useEffect, useMemo, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

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
import { PedestrianRoute } from '../types/navigation';
import { CATEGORIES } from '../constants/categories';
import { SafePlaceWithDistance } from '../services/safePlacesService';
import { getPharmacyStatus } from '../utils/pharmacySchedule';
import { SelectedMapPoint } from './SelectedPlaceSheet';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';

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
    >
      <View style={styles.pharmacyPinContainer}>
        <View
          style={[
            styles.pharmacyRing,
            {
              borderColor: status.ringColor,
              shadowColor: status.ringColor,
              backgroundColor: status.isOpen
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(239, 68, 68, 0.15)',
            },
          ]}
        >
          <View style={styles.pharmacyInnerCore}>
            <Ionicons name="medical" size={17} color={status.ringColor} />
          </View>
        </View>
        <View style={[styles.pharmacyBadge, { backgroundColor: status.ringColor }]}>
          <Text style={styles.pharmacyBadgeText}>{status.badgeText}</Text>
        </View>
      </View>
    </Marker>
  );
});

const PoliceMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  const isPSP = place.type === 'psp';
  const isGNR = place.type === 'gnr';
  const policeColor = isPSP ? '#3B82F6' : isGNR ? '#10B981' : '#6366F1';
  const policeTag = isPSP ? 'PSP' : isGNR ? 'GNR' : 'PJ';
  const policeIcon = isPSP ? 'shield-sharp' : isGNR ? 'shield-checkmark' : 'briefcase';

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
    >
      <View style={[styles.policePin, { borderColor: policeColor }]}>
        <View style={[styles.policeIconWrap, { backgroundColor: policeColor }]}>
          <Ionicons name={policeIcon as any} size={15} color="#FFFFFF" />
        </View>
        <View style={[styles.policeBadge, { backgroundColor: policeColor }]}>
          <Text style={styles.policeBadgeText}>{policeTag}</Text>
        </View>
      </View>
    </Marker>
  );
});

const IncidentMarker = memo(({ incident, onSelect }: { incident: Incident; onSelect: () => void }) => {
  const meta = CATEGORIES[incident.category] || CATEGORIES.suspicious;
  return (
    <Marker
      coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
    >
      <View style={[styles.markerPin, { borderColor: meta.color }]}>
        <View style={[styles.markerIconWrap, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon as any} size={16} color="#FFFFFF" />
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
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [is3DMode, setIs3DMode] = React.useState(false);
  const [followHeading, setFollowHeading] = React.useState(false);
  const [isUserInteracting, setIsUserInteracting] = React.useState(false);

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

  // Fit route coordinates when previewing
  useEffect(() => {
    if (activeRoute && activeRoute.coordinates.length > 1 && mapRef.current && !isNavigating) {
      mapRef.current.fitToCoordinates(activeRoute.coordinates, {
        edgePadding: { top: 140, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }
  }, [activeRoute?.id, isNavigating]);

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

  // Memoized filter of safe places (limits visible markers to 60 to prevent Android frame drops)
  const filteredSafePlaces = useMemo(() => {
    if (selectedCategoryFilter === 'police') {
      return safePlaces.filter((p) => p.type === 'psp' || p.type === 'gnr' || p.type === 'pj');
    }
    if (selectedCategoryFilter === 'pharmacy') {
      return safePlaces.filter((p) => p.type === 'pharmacy').slice(0, 50);
    }
    // 'all': Show all police stations + nearest 35 pharmacies
    const police = safePlaces.filter((p) => p.type === 'psp' || p.type === 'gnr' || p.type === 'pj');
    const pharmacies = safePlaces.filter((p) => p.type === 'pharmacy').slice(0, 35);
    return [...police, ...pharmacies];
  }, [safePlaces, selectedCategoryFilter]);

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
        onRegionChangeComplete={onRegionChangeComplete}
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
            zIndex={999}
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
        {/* Gyroscope/Compass Heading Button */}
        <TouchableOpacity
          style={[styles.floatingControlBtn, followHeading && styles.floatingControlBtnActive]}
          onPress={toggleHeadingFollow}
          activeOpacity={0.8}
        >
          <View style={{ transform: [{ rotate: `${-userHeading}deg` }] }}>
            <Ionicons
              name="compass-outline"
              size={22}
              color={followHeading ? M3Colors.primary : M3Colors.onSurfaceVariant}
            />
          </View>
        </TouchableOpacity>

        {/* 3D / 2D Perspective Toggle */}
        <TouchableOpacity
          style={[styles.floatingControlBtn, is3DMode && styles.floatingControlBtnActive]}
          onPress={toggle3DMode}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.floatingControlText,
              is3DMode && styles.floatingControlTextActive,
            ]}
          >
            {is3DMode ? '3D' : '2D'}
          </Text>
        </TouchableOpacity>

        {/* Recenter GPS */}
        <TouchableOpacity
          style={styles.floatingControlBtn}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color={M3Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Re-center Navigation Pill (shown if user panned away during active navigation) */}
      {isNavigating && isUserInteracting && (
        <TouchableOpacity
          style={styles.recenterNavPill}
          onPress={handleRecenter}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={16} color={M3Colors.onPrimary} />
          <Text style={styles.recenterNavPillText}>Recentrar Navegação 3D</Text>
        </TouchableOpacity>
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

  // Pharmacy Pins with Dynamic Open/Closed Status Ring
  pharmacyPinContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
  },
  pharmacyInnerCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyBadge: {
    position: 'absolute',
    bottom: -3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  pharmacyBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  // Police Pins (PSP, GNR, PJ)
  policePin: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  policeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  policeBadge: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  policeBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
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
});
