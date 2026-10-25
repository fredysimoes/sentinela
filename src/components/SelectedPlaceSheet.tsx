import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { UserLocation } from '../types';
import { RouteCoordinate, TransportMode } from '../types/navigation';
import { calculateDistanceMeters, formatDistance, getGoogleMapsUrl } from '../utils/geo';
import { formatDuration } from '../services/routingService';

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
}

export const SelectedPlaceSheet: React.FC<SelectedPlaceSheetProps> = ({
  place,
  userLocation,
  transportMode,
  onClose,
  onNavigate,
  onReportHere,
}) => {
  if (!place) return null;

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
    <View style={styles.container}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Header Tag */}
      <View style={styles.topRow}>
        <View style={styles.poiBadge}>
          <Ionicons name="location" size={13} color="#38BDF8" />
          <Text style={styles.poiBadgeText}>DESTINO NO MAPA</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
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
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleReportHere}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
          <Text style={styles.secondaryBtnText}>Sinalizar Perigo Aqui</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 24 : 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 30,
    zIndex: 9999,
  },
  handle: {
    width: 38,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  poiBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  infoSection: {
    marginBottom: 10,
  },
  placeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 22,
  },
  placeSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  estimateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
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
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  navBtnWalking: {
    backgroundColor: '#38BDF8',
  },
  navBtnDriving: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  navBtnTextDark: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  navBtnTextLight: {
    color: '#F8FAFC',
    fontWeight: '800',
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
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
});
