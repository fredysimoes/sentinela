import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { UserLocation } from '../types';
import { RouteCoordinate, TransportMode } from '../types/navigation';
import { calculateDistanceMeters, formatDistance, getGoogleMapsUrl } from '../utils/geo';
import { formatDuration } from '../services/routingService';
import { M3Colors, M3Shapes, M3Elevation, M3Typography, M3Motion } from '../theme/m3';

export interface SelectedMapPoint {
  name: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
}

interface SelectedPlaceSheetProps {
  place: SelectedMapPoint | null;
  userLocation: UserLocation | null;
  transportMode: TransportMode;
  onClose: () => void;
  onNavigate: (name: string, coord: RouteCoordinate, mode: TransportMode) => void;
  onReportHere: (coord: RouteCoordinate) => void;
  onSetAsOrigin?: (name: string, coord: RouteCoordinate) => void;
}

export const SelectedPlaceSheet: React.FC<SelectedPlaceSheetProps> = ({
  place,
  userLocation,
  transportMode,
  onClose,
  onNavigate,
  onReportHere,
  onSetAsOrigin,
}) => {
  if (!place) return null;

  // Material Design 3 Motion: Shared Axis Y Sheet Slide
  const translateY = useRef(new Animated.Value(350)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: M3Motion.durations.long2,
      easing: M3Motion.easings.emphasizedDecelerate,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAnimatedClose = () => {
    Animated.timing(translateY, {
      toValue: 350,
      duration: M3Motion.durations.medium1,
      easing: M3Motion.easings.emphasizedAccelerate,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const distanceMeters = userLocation
    ? calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        place.latitude,
        place.longitude
      )
    : null;

  // Travel time estimates
  const walkMins = distanceMeters ? Math.max(1, Math.round(distanceMeters / 75)) : null;
  const driveMins = distanceMeters ? Math.max(1, Math.round((distanceMeters / 500) + 1)) : null;

  const handleOpenGoogleMaps = () => {
    Linking.openURL(getGoogleMapsUrl(place.latitude, place.longitude));
  };

  const handleStartWalkRoute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate(
      place.name,
      { latitude: place.latitude, longitude: place.longitude },
      'walking'
    );
  };

  const handleStartDriveRoute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate(
      place.name,
      { latitude: place.latitude, longitude: place.longitude },
      'driving'
    );
  };

  const handleReportHere = () => {
    Haptics.selectionAsync();
    onReportHere({ latitude: place.latitude, longitude: place.longitude });
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Header Tag */}
      <View style={styles.topRow}>
        <View style={styles.poiBadge}>
          <Ionicons name="location" size={13} color="#38BDF8" />
          <Text style={styles.poiBadgeText}>DESTINO NO MAPA</Text>
        </View>

        <TouchableOpacity onPress={handleAnimatedClose} style={styles.closeBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Title & Subtitle */}
      <View style={styles.infoSection}>
        <Text style={styles.placeTitle} numberOfLines={2}>
          {place.name}
        </Text>
        {place.subtitle && (
          <Text style={styles.placeSubtitle} numberOfLines={2}>
            {place.subtitle}
          </Text>
        )}
      </View>

      {/* Distance & ETA Row */}
      {distanceMeters !== null && (
        <View style={styles.estimatesRow}>
          <View style={styles.estimatePill}>
            <Ionicons name="navigate-outline" size={15} color="#38BDF8" />
            <Text style={styles.estimateValue}>{formatDistance(distanceMeters)}</Text>
          </View>

          {walkMins !== null && (
            <View style={styles.estimatePill}>
              <Ionicons name="walk" size={15} color="#10B981" />
              <Text style={styles.estimateValue}>~{formatDuration(walkMins)}</Text>
            </View>
          )}

          {driveMins !== null && (
            <View style={styles.estimatePill}>
              <Ionicons name="car-sport" size={15} color="#F59E0B" />
              <Text style={styles.estimateValue}>~{formatDuration(driveMins)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Main Action Buttons */}
      <View style={styles.actionButtonsRow}>
        {/* Navigate Walking */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnWalking]}
          onPress={handleStartWalkRoute}
          activeOpacity={0.85}
        >
          <Ionicons name="walk" size={18} color="#0F172A" />
          <Text style={styles.navBtnTextDark}>A Pé em Segurança</Text>
        </TouchableOpacity>

        {/* Navigate Driving */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnDriving]}
          onPress={handleStartDriveRoute}
          activeOpacity={0.85}
        >
          <Ionicons name="car-sport" size={18} color="#F8FAFC" />
          <Text style={styles.navBtnTextLight}>De Carro</Text>
        </TouchableOpacity>
      </View>

      {/* Secondary Actions */}
      <View style={styles.secondaryRow}>
        {onSetAsOrigin && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSetAsOrigin(place.name, { latitude: place.latitude, longitude: place.longitude });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle-outline" size={16} color="#10B981" />
            <Text style={[styles.secondaryBtnText, { color: '#10B981', fontWeight: '700' }]}>
              Partir Daqui (A)
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleReportHere}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
          <Text style={styles.secondaryBtnText}>Sinalizar Perigo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleOpenGoogleMaps}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={16} color="#94A3B8" />
          <Text style={styles.secondaryBtnText}>Google Maps</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
    borderTopWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: M3Colors.outlineVariant,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    ...M3Elevation.level4,
    zIndex: 8000,
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: M3Colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: M3Shapes.small,
    backgroundColor: M3Colors.secondaryContainer,
    borderWidth: 1,
    borderColor: M3Colors.secondary,
  },
  poiBadgeText: {
    color: M3Colors.onSecondaryContainer,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
  },
  infoSection: {
    marginBottom: 10,
  },
  placeTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: M3Colors.onSurface,
    lineHeight: 24,
  },
  placeSubtitle: {
    fontSize: 13,
    color: M3Colors.onSurfaceVariant,
    marginTop: 3,
  },
  estimatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  estimatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: M3Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: M3Shapes.small,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  estimateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: M3Colors.onSurface,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: M3Shapes.full,
    gap: 8,
    height: 48,
  },
  navBtnWalking: {
    backgroundColor: M3Colors.primaryContainer,
    ...M3Elevation.level2,
  },
  navBtnDriving: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  navBtnTextDark: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 13,
  },
  navBtnTextLight: {
    color: M3Colors.onSurface,
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  secondaryBtnText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
});
