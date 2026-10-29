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
  { elementType: 'geometry', stylers: [{ color: '#0A0D12' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080A0C' }, { weight: 3.5 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#CBD5E1' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.fill',
    stylers: [{ color: '#12161E' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1E2633' }, { weight: 1 }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0D1F17' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6EE7B7' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1B212B' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0B0E13' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#CBD5E1' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#242C38' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0E1218' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#CBD5E1' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#2D3B4E' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#161F2C' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#F1F5F9' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#161B23' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#050C14' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748B' }],
  },
];
import { Incident, IncidentCategory, SOSAlert, UserLocation, SafePlace, HomeAddress } from '../types';
import { PedestrianRoute, RouteCoordinate } from '../types/navigation';
import { CATEGORIES, isAccessibilityCategory } from '../constants/categories';
import { SafePlaceWithDistance } from '../services/safePlacesService';
import { getPharmacyStatus } from '../utils/pharmacySchedule';
import { isProtestInfiltratorVerified } from '../utils/geo';
import { SelectedMapPoint } from './SelectedPlaceSheet';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { M3Pressable } from './M3MotionWrapper';

// -------------------------------------------------------------
// High Performance Memoized Teardrop Markers (Stealth & Neon UI)
// -------------------------------------------------------------
const PharmacyMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  const status = place.pharmacyStatus || getPharmacyStatus(place);
  const isOpen = status.isOpen;

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.92 }}
    >
      <View style={styles.teardropMarkerWrap}>
        {/* Teardrop Head: Solid Neon Green when Open, Outlined Neon Green when Closed */}
        <View
          style={[
            styles.teardropHead,
            isOpen ? styles.pharmacyHeadOpen : styles.pharmacyHeadClosed,
          ]}
        >
          <MaterialCommunityIcons
            name={isOpen ? 'plus-thick' : 'plus'}
            size={isOpen ? 19 : 18}
            color={isOpen ? '#06140E' : '#10B981'}
          />
        </View>
        {/* Teardrop Bottom Pointer Tip */}
        <View
          style={[
            styles.teardropTip,
            isOpen ? styles.pharmacyTipOpen : styles.pharmacyTipClosed,
          ]}
        />
        {/* Wheelmap Accessibility Micro Badge */}
        {place.wheelchair && (
          <View
            style={[
              styles.wheelmapMicroTag,
              {
                backgroundColor:
                  place.wheelchair === 'yes'
                    ? '#10B981'
                    : place.wheelchair === 'limited'
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}
          >
            <MaterialCommunityIcons name="wheelchair" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Marker>
  );
});

const HospitalMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  const status = place.pharmacyStatus || getPharmacyStatus(place);
  const isOpen = status.isOpen;

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.92 }}
    >
      <View style={styles.teardropMarkerWrap}>
        {/* Teardrop Head: Solid Cyan Neon when Open, Outlined Cyan Neon when Closed */}
        <View
          style={[
            styles.teardropHead,
            isOpen ? styles.hospitalHeadOpen : styles.hospitalHeadClosed,
          ]}
        >
          <MaterialCommunityIcons
            name="hospital-building"
            size={17}
            color={isOpen ? '#04131D' : '#0EA5E9'}
          />
        </View>
        <View
          style={[
            styles.teardropTip,
            isOpen ? styles.hospitalTipOpen : styles.hospitalTipClosed,
          ]}
        />
        {/* Wheelmap Accessibility Micro Badge */}
        {place.wheelchair && (
          <View
            style={[
              styles.wheelmapMicroTag,
              {
                backgroundColor:
                  place.wheelchair === 'yes'
                    ? '#10B981'
                    : place.wheelchair === 'limited'
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}
          >
            <MaterialCommunityIcons name="wheelchair" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Marker>
  );
});

const PoliceMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  const isPSP = place.type === 'psp';
  const isGNR = place.type === 'gnr';
  const policeTag = isPSP ? 'PSP' : isGNR ? 'GNR' : 'PJ';

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.92 }}
    >
      <View style={styles.teardropMarkerWrap}>
        {/* Crisp White Teardrop Head with Dark Obsidian Police Officer Silhouette */}
        <View style={[styles.teardropHead, styles.policeHead]}>
          <MaterialCommunityIcons
            name="police-badge"
            size={18}
            color="#080A0C"
          />
        </View>
        <View style={[styles.teardropTip, styles.policeTip]} />
        <View style={styles.policeMicroBadge}>
          <Text style={styles.policeMicroBadgeText}>{policeTag}</Text>
        </View>
        {/* Wheelmap Accessibility Micro Badge */}
        {place.wheelchair && (
          <View
            style={[
              styles.wheelmapMicroTag,
              {
                backgroundColor:
                  place.wheelchair === 'yes'
                    ? '#10B981'
                    : place.wheelchair === 'limited'
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}
          >
            <MaterialCommunityIcons name="wheelchair" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Marker>
  );
});

const SchoolMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.92 }}
    >
      <View style={styles.teardropMarkerWrap}>
        {/* Solid Indigo/Violet Teardrop Head with School Graduation Cap */}
        <View style={[styles.teardropHead, styles.schoolHead]}>
          <MaterialCommunityIcons
            name="school"
            size={18}
            color="#FFFFFF"
          />
        </View>
        <View style={[styles.teardropTip, styles.schoolTip]} />
        <View style={styles.schoolMicroBadge}>
          <Text style={styles.schoolMicroBadgeText}>ESCOLA</Text>
        </View>
        {/* Wheelmap Accessibility Micro Badge */}
        {place.wheelchair && (
          <View
            style={[
              styles.wheelmapMicroTag,
              {
                backgroundColor:
                  place.wheelchair === 'yes'
                    ? '#10B981'
                    : place.wheelchair === 'limited'
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}
          >
            <MaterialCommunityIcons name="wheelchair" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Marker>
  );
});

const HeritageMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.92 }}
    >
      <View style={styles.teardropMarkerWrap}>
        {/* Solid Amber / Bronze Teardrop Head with Castle Silhouette */}
        <View style={[styles.teardropHead, styles.heritageHead]}>
          <MaterialCommunityIcons
            name="castle"
            size={18}
            color="#FFFFFF"
          />
        </View>
        <View style={[styles.teardropTip, styles.heritageTip]} />
        <View style={styles.heritageMicroBadge}>
          <Text style={styles.heritageMicroBadgeText}>PATRIMÓNIO</Text>
        </View>
        {/* Wheelmap Accessibility Micro Badge */}
        {place.wheelchair && (
          <View
            style={[
              styles.wheelmapMicroTag,
              {
                backgroundColor:
                  place.wheelchair === 'yes'
                    ? '#10B981'
                    : place.wheelchair === 'limited'
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}
          >
            <MaterialCommunityIcons name="wheelchair" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Marker>
  );
});

const WheelmapMarker = memo(({ place, onSelect }: { place: SafePlaceWithDistance; onSelect: () => void }) => {
  const isYes = place.wheelchair === 'yes';
  const isLimited = place.wheelchair === 'limited';
  const headColor = isYes ? '#10B981' : isLimited ? '#F59E0B' : '#EF4444';
  const borderColor = isYes ? '#6EE7B7' : isLimited ? '#FDE68A' : '#FCA5A5';

  return (
    <Marker
      coordinate={{ latitude: place.latitude, longitude: place.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.92 }}
    >
      <View style={styles.teardropMarkerWrap}>
        {/* Wheelmap Accessibility Teardrop Head */}
        <View style={[styles.teardropHead, { backgroundColor: headColor, borderColor, borderWidth: 2 }]}>
          <MaterialCommunityIcons
            name="wheelchair"
            size={18}
            color="#FFFFFF"
          />
        </View>
        <View
          style={[
            styles.teardropTip,
            {
              backgroundColor: headColor,
              borderColor,
              borderRightWidth: 1.5,
              borderBottomWidth: 1.5,
            },
          ]}
        />
        <View style={[styles.wheelmapMicroBadge, { borderColor }]}>
          <Text style={[styles.wheelmapMicroBadgeText, { color: borderColor }]}>WHEELMAP</Text>
        </View>
        {place.wheelchairToilet === 'yes' && (
          <View style={[styles.wheelmapMicroTag, { backgroundColor: '#0284C7' }]}>
            <MaterialCommunityIcons name="toilet" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Marker>
  );
});

const IncidentMarker = memo(({ incident, onSelect }: { incident: Incident; onSelect: () => void }) => {
  const meta = CATEGORIES[incident.category] || CATEGORIES.suspicious;
  const isAccess = isAccessibilityCategory(incident.category);

  return (
    <Marker
      coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
      onPress={onSelect}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.markerPin, { borderColor: meta.color }]}>
        <View style={[styles.markerIconWrap, { backgroundColor: meta.color }]}>
          <MaterialCommunityIcons
            name={(meta.mciIcon || 'alert-circle') as any}
            size={16}
            color="#FFFFFF"
          />
        </View>
        {isAccess && (
          <View style={styles.accessMicroTag}>
            <MaterialCommunityIcons name="wheelchair" size={10} color="#FFFFFF" />
          </View>
        )}
        {incident.confirmations > 0 && !isAccess && (
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
  selectedCategoryFilter: IncidentCategory | 'all' | 'police' | 'pharmacy' | 'hospital' | 'school' | 'heritage' | 'wheelmap' | null;
  showPoliceOnMap?: boolean;
  showPharmaciesOnMap?: boolean;
  showHospitalsOnMap?: boolean;
  showSchoolsOnMap?: boolean;
  showHeritageOnMap?: boolean;
  showWheelmapOnMap?: boolean;
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
  onExitProtestMode?: () => void;
  routeOrigin?: { name: string; coord: RouteCoordinate } | null;
  routeDestination?: { name: string; coord: RouteCoordinate } | null;
  stalkingSession?: StalkingTrackingSession | null;
  isSimulating?: boolean;
  simulatedLocation?: RouteCoordinate | null;
  recenterSignal?: number;
  onOpenRadar?: () => void;
}

export const MapComponent: React.FC<MapComponentProps> = memo(({
  userLocation,
  userHeading = 0,
  incidents,
  activeSOSAlerts,
  safePlaces,
  selectedCategoryFilter,
  showPoliceOnMap = true,
  showPharmaciesOnMap = true,
  showHospitalsOnMap = true,
  showSchoolsOnMap = true,
  showHeritageOnMap = true,
  showWheelmapOnMap = true,
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
  onExitProtestMode,
  routeOrigin = null,
  routeDestination = null,
  stalkingSession = null,
  isSimulating = false,
  simulatedLocation = null,
  recenterSignal = 0,
  onOpenRadar,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [is3DMode, setIs3DMode] = React.useState(false);
  const [followHeading, setFollowHeading] = React.useState(false);
  const [isUserInteracting, setIsUserInteracting] = React.useState(false);
  const [mapCenter, setMapCenter] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [animatedRouteCoords, setAnimatedRouteCoords] = React.useState<RouteCoordinate[]>([]);
  const hasCenteredInitialRef = useRef(false);

  // Progressive Neon Route Drawing Animation (max 2.5s <= 3s)
  useEffect(() => {
    const fullCoords = activeRoute?.coordinates;
    if (!fullCoords || fullCoords.length < 2) {
      setAnimatedRouteCoords([]);
      return;
    }

    let animFrameId: number | null = null;
    const durationMs = 2400; // 2.4 seconds (strictly <= 3s)
    const startTime = Date.now();
    const totalSegments = fullCoords.length - 1;

    setAnimatedRouteCoords([fullCoords[0], fullCoords[0]]);

    const step = () => {
      const elapsed = Date.now() - startTime;
      const rawT = Math.min(1, elapsed / durationMs);
      // Cubic ease-out for smooth progressive drawing along the streets
      const easedT = 1 - Math.pow(1 - rawT, 3);

      const exactIndex = easedT * totalSegments;
      const wholeIndex = Math.floor(exactIndex);
      const frac = exactIndex - wholeIndex;

      const sliced = fullCoords.slice(0, wholeIndex + 1);
      if (wholeIndex < totalSegments && frac > 0) {
        const p1 = fullCoords[wholeIndex];
        const p2 = fullCoords[wholeIndex + 1];
        sliced.push({
          latitude: p1.latitude + (p2.latitude - p1.latitude) * frac,
          longitude: p1.longitude + (p2.longitude - p1.longitude) * frac,
        });
      }

      if (sliced.length >= 2) {
        setAnimatedRouteCoords(sliced);
      }

      if (rawT < 1) {
        animFrameId = requestAnimationFrame(step);
      } else {
        setAnimatedRouteCoords(fullCoords);
      }
    };

    animFrameId = requestAnimationFrame(step);

    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, [activeRoute?.id, activeRoute?.coordinates]);

  // Listen to external recenterSignal from the bottom dock "Mapa" button
  useEffect(() => {
    if (recenterSignal > 0) {
      handleRecenter();
    }
  }, [recenterSignal]);

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
        { duration: isDriving ? 220 : 350 }
      );
    }
  }, [userLocation?.latitude, userLocation?.longitude, userHeading, is3DMode, followHeading, isUserInteracting, isNavigating, navZoom, isDriving]);

  // Animate to user on initial load once, or smoothly follow when user has not panned away
  useEffect(() => {
    if (userLocation && mapRef.current && !activeRoute && !isNavigating) {
      if (!hasCenteredInitialRef.current) {
        hasCenteredInitialRef.current = true;
        mapRef.current.animateToRegion(
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          600
        );
      } else if (!isUserInteracting) {
        mapRef.current.animateCamera(
          {
            center: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          },
          { duration: 250 }
        );
      }
    }
  }, [userLocation?.latitude, userLocation?.longitude, !!activeRoute, isNavigating, isUserInteracting]);

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

    const result: SafePlaceWithDistance[] = [];

    if (showPoliceOnMap) {
      const police = safePlaces.filter((p) => p.type === 'psp' || p.type === 'gnr' || p.type === 'pj');
      result.push(...sortByDistanceToCenter(police).slice(0, 50));
    }

    if (showPharmaciesOnMap) {
      const pharmacies = safePlaces.filter((p) => p.type === 'pharmacy');
      result.push(...sortByDistanceToCenter(pharmacies).slice(0, 75));
    }

    if (showHospitalsOnMap) {
      const hospitals = safePlaces.filter((p) => p.type === 'hospital');
      result.push(...sortByDistanceToCenter(hospitals).slice(0, 35));
    }

    if (showSchoolsOnMap) {
      const schools = safePlaces.filter((p) => p.type === 'school');
      result.push(...sortByDistanceToCenter(schools).slice(0, 50));
    }

    if (showHeritageOnMap) {
      const heritage = safePlaces.filter((p) => p.type === 'heritage');
      result.push(...sortByDistanceToCenter(heritage).slice(0, 40));
    }

    if (showWheelmapOnMap) {
      const wheelmapPlaces = safePlaces.filter((p) => p.type === 'wheelmap');
      result.push(...sortByDistanceToCenter(wheelmapPlaces).slice(0, 50));
    }

    return result;
  }, [safePlaces, showPoliceOnMap, showPharmaciesOnMap, showHospitalsOnMap, showSchoolsOnMap, showHeritageOnMap, showWheelmapOnMap, mapCenter, userLocation]);

  // Memoized filter of incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      if (
        selectedCategoryFilter &&
        selectedCategoryFilter !== 'all' &&
        item.category !== selectedCategoryFilter
      ) {
        return false;
      }

      // Infiltrator caution rule: only show publicly on map after verification threshold (>= 3 signals within 300m, i.e. > 2 users)
      if (item.category === 'protest_infiltrator') {
        return isProtestInfiltratorVerified(item, incidents, 300, 3);
      }

      return true;
    });
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
        showsBuildings={true}
        showsIndoors={false}
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
            strokeColor="rgba(16, 185, 129, 0.35)"
            fillColor="rgba(16, 185, 129, 0.08)"
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

        {/* Active Pedestrian / Driving Route with Progressive Neon Animation & 3D Street Illumination */}
        {activeRoute && animatedRouteCoords.length >= 2 && (
          <>
            {/* 1. Ambient Street & 3D Building Illumination Layer (Wide Translucent Neon Halo) */}
            <Polyline
              coordinates={animatedRouteCoords}
              strokeColor={
                activeRoute.isSafe
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(245, 158, 11, 0.16)'
              }
              strokeWidth={18}
              lineCap="round"
              lineJoin="round"
            />
            {/* 2. Mid Neon Glow Layer */}
            <Polyline
              coordinates={animatedRouteCoords}
              strokeColor={
                activeRoute.isSafe
                  ? 'rgba(16, 185, 129, 0.42)'
                  : 'rgba(245, 158, 11, 0.42)'
              }
              strokeWidth={9.5}
              lineCap="round"
              lineJoin="round"
            />
            {/* 3. High-Intensity Neon Core Line */}
            <Polyline
              coordinates={animatedRouteCoords}
              strokeColor={activeRoute.isSafe ? '#34D399' : '#FBBF24'}
              strokeWidth={4.5}
              lineCap="round"
              lineJoin="round"
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

        {/* Safe Places (Police Stations, Pharmacies & Hospitals) */}
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

          if (place.type === 'hospital') {
            return (
              <HospitalMarker
                key={place.id}
                place={place}
                onSelect={() => onSelectSafePlace(place)}
              />
            );
          }

          if (place.type === 'school') {
            return (
              <SchoolMarker
                key={place.id}
                place={place}
                onSelect={() => onSelectSafePlace(place)}
              />
            );
          }

          if (place.type === 'heritage') {
            return (
              <HeritageMarker
                key={place.id}
                place={place}
                onSelect={() => onSelectSafePlace(place)}
              />
            );
          }

          if (place.type === 'wheelmap') {
            return (
              <WheelmapMarker
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
        {/* Protest Mode Controls: Exit Button, Strobe and Flashlight */}
        {protestMode && (
          <>
            {/* Quick Exit Protest Mode Button (placed directly above Strobe) */}
            {onExitProtestMode && (
              <M3Pressable
                scaleOnPress={0.9}
                style={[styles.floatingControlBtn, styles.protestExitBtn]}
                onPress={onExitProtestMode}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </M3Pressable>
            )}

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

        {/* Crowd Radar "Estou Aqui" Button */}
        {onOpenRadar && (
          <M3Pressable
            scaleOnPress={0.9}
            style={[styles.floatingControlBtn, styles.radarFloatingBtn]}
            onPress={onOpenRadar}
          >
            <Ionicons name="scan" size={22} color="#10B981" />
          </M3Pressable>
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
    backgroundColor: '#080A0C',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  floatingControlsStack: {
    position: 'absolute',
    right: 16,
    bottom: 102,
    gap: 10,
    alignItems: 'center',
    zIndex: 100,
  },
  floatingControlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(18, 22, 29, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    ...M3Elevation.level3,
  },
  floatingControlBtnActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  protestExitBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
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
  radarFloatingBtn: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  floatingControlText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingControlTextActive: {
    color: '#34D399',
  },
  recenterNavPill: {
    position: 'absolute',
    bottom: 102,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: M3Shapes.full,
    ...M3Elevation.level3,
    zIndex: 100,
  },
  recenterNavPillText: {
    color: '#06140E',
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
    borderBottomColor: 'rgba(16, 185, 129, 0.16)',
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
    borderBottomColor: 'rgba(16, 185, 129, 0.36)',
    transform: [{ rotate: '180deg' }],
  },
  userAvatarDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#080A0C',
    borderWidth: 2.5,
    borderColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  userAvatarCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
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
    borderBottomColor: '#06140E',
  },
  pickingBanner: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: '#12161D',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: M3Shapes.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...M3Elevation.level3,
  },
  pickingBannerText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  markerPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#080A0C',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
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
    borderColor: '#080A0C',
  },
  accessMicroTag: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#06B6D4',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#080A0C',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
  },
  wheelmapMicroTag: {
    position: 'absolute',
    top: -4,
    left: -4,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#080A0C',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 4,
    zIndex: 10,
  },
  votesBadgeText: {
    color: '#06140E',
    fontSize: 10,
    fontWeight: '800',
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

  // -------------------------------------------------------------
  // Stealth Teardrop (Gota) Markers for Pharmacies, Police & Hospitals
  // -------------------------------------------------------------
  teardropMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 4,
  },
  teardropHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.65,
    shadowRadius: 4,
    elevation: 6,
  },
  teardropTip: {
    width: 11,
    height: 11,
    marginTop: -6.5,
    transform: [{ rotate: '45deg' }],
    borderBottomRightRadius: 2,
    zIndex: 1,
  },

  // Pharmacy Teardrop: Solid Neon Emerald when Open, Outlined Neon Emerald when Closed
  pharmacyHeadOpen: {
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#6EE7B7',
  },
  pharmacyTipOpen: {
    backgroundColor: '#10B981',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#6EE7B7',
  },
  pharmacyHeadClosed: {
    backgroundColor: '#0A0D12',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  pharmacyTipClosed: {
    backgroundColor: '#0A0D12',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#10B981',
  },

  // Hospital Teardrop: Solid Cyan Neon when Open, Outlined Cyan Neon when Closed
  hospitalHeadOpen: {
    backgroundColor: '#0EA5E9',
    borderWidth: 2,
    borderColor: '#7DD3FC',
  },
  hospitalTipOpen: {
    backgroundColor: '#0EA5E9',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#7DD3FC',
  },
  hospitalHeadClosed: {
    backgroundColor: '#0A0D12',
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },
  hospitalTipClosed: {
    backgroundColor: '#0A0D12',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#0EA5E9',
  },

  // Police (PSP / GNR / PJ) Teardrop: Crisp White with Obsidian Police Badge
  policeHead: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  policeTip: {
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  policeMicroBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#080A0C',
    borderWidth: 1,
    borderColor: '#F8FAFC',
    borderRadius: 5,
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    zIndex: 3,
  },
  policeMicroBadgeText: {
    color: '#F8FAFC',
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // School (Escola Segura) Teardrop: Violet / Indigo
  schoolHead: {
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  schoolTip: {
    backgroundColor: '#8B5CF6',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  schoolMicroBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#080A0C',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 5,
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    zIndex: 3,
  },
  schoolMicroBadgeText: {
    color: '#DDD6FE',
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Heritage (Património Cultural Classificado) Teardrop: Amber / Bronze
  heritageHead: {
    backgroundColor: '#D97706',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  heritageTip: {
    backgroundColor: '#D97706',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#FDE68A',
  },
  heritageMicroBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#080A0C',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    zIndex: 3,
  },
  heritageMicroBadgeText: {
    color: '#FDE68A',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  // Wheelmap (Pontos de Acessibilidade) Micro Badge
  wheelmapMicroBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#080A0C',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    zIndex: 3,
  },
  wheelmapMicroBadgeText: {
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.2,
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
