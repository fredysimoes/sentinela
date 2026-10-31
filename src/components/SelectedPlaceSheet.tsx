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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { UserLocation, WheelchairAccessibility } from '../types';
import { RouteCoordinate, TransportMode } from '../types/navigation';
import { calculateDistanceMeters, formatDistance, getGoogleMapsUrl } from '../utils/geo';
import { formatDuration } from '../services/routingService';
import { M3Colors, M3Shapes, M3Elevation, M3Typography, M3Motion } from '../theme/m3';

export interface SelectedMapPoint {
  name: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  houseNumber?: string;
  postcode?: string;
  wheelchair?: WheelchairAccessibility;
  wheelchairDescription?: string;
}

interface SelectedPlaceSheetProps {
  place: SelectedMapPoint | null;
  userLocation: UserLocation | null;
  transportMode: TransportMode;
  accessibleRouteOnly?: boolean;
  onToggleAccessibilityRoute?: (enabled: boolean) => void;
  onClose: () => void;
  onNavigate: (name: string, coord: RouteCoordinate, mode: TransportMode) => void;
  onReportHere: (coord: RouteCoordinate) => void;
  onSetAsOrigin?: (name: string, coord: RouteCoordinate) => void;
}

export const SelectedPlaceSheet: React.FC<SelectedPlaceSheetProps> = ({
  place,
  userLocation,
  transportMode,
  accessibleRouteOnly = false,
  onToggleAccessibilityRoute,
  onClose,
  onNavigate,
  onReportHere,
  onSetAsOrigin,
}) => {
  // Material Design 3 Motion: Shared Axis Y Sheet Slide
  const translateY = useRef(new Animated.Value(350)).current;

  useEffect(() => {
    if (place) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: M3Motion.durations.long2,
        easing: M3Motion.easings.emphasizedDecelerate,
        useNativeDriver: true,
      }).start();
    }
  }, [place]);

  if (!place) return null;

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
        {(place.houseNumber || place.postcode) && (
          <View style={styles.officialAddressBadgeWrap}>
            <View style={styles.officialAddressBadge}>
              <Ionicons name="home-outline" size={12} color="#38BDF8" />
              <Text style={styles.officialAddressText}>
                {place.houseNumber ? `N.º ${place.houseNumber}` : ''}
                {place.houseNumber && place.postcode ? ' · ' : ''}
                {place.postcode || ''}
              </Text>
              <Text style={styles.officialAddressSource}>INE · OSM</Text>
            </View>
          </View>
        )}
        {place.wheelchair && (
          <View style={styles.wheelmapInlineBadgeWrap}>
            <View
              style={[
                styles.wheelmapInlineBadge,
                {
                  borderColor:
                    place.wheelchair === 'yes'
                      ? '#10B981'
                      : place.wheelchair === 'limited'
                      ? '#F59E0B'
                      : place.wheelchair === 'no'
                      ? '#EF4444'
                      : '#64748B',
                },
              ]}
            >
              <MaterialCommunityIcons
                name="wheelchair"
                size={13}
                color={
                  place.wheelchair === 'yes'
                    ? '#10B981'
                    : place.wheelchair === 'limited'
                    ? '#F59E0B'
                    : place.wheelchair === 'no'
                    ? '#EF4444'
                    : '#94A3B8'
                }
              />
              <Text
                style={[
                  styles.wheelmapInlineText,
                  {
                    color:
                      place.wheelchair === 'yes'
                        ? '#10B981'
                        : place.wheelchair === 'limited'
                        ? '#F59E0B'
                        : place.wheelchair === 'no'
                        ? '#EF4444'
                        : '#94A3B8',
                  },
                ]}
              >
                {place.wheelchair === 'yes'
                  ? 'Acessível (Wheelmap)'
                  : place.wheelchair === 'limited'
                  ? 'Acesso Parcial (Wheelmap)'
                  : place.wheelchair === 'no'
                  ? 'Inacessível (Wheelmap)'
                  : 'Acessibilidade Não Confirmada'}
              </Text>
            </View>
          </View>
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
            <View style={[styles.estimatePill, accessibleRouteOnly && styles.estimatePillAccessible]}>
              {accessibleRouteOnly ? (
                <MaterialCommunityIcons name="wheelchair" size={15} color="#06B6D4" />
              ) : (
                <Ionicons name="walk" size={15} color="#10B981" />
              )}
              <Text style={[styles.estimateValue, accessibleRouteOnly && { color: '#06B6D4' }]}>
                ~{formatDuration(walkMins)}
              </Text>
            </View>
          )}

          {driveMins !== null && (
            <View style={styles.estimatePill}>
              <Ionicons name="car-sport" size={15} color="#F59E0B" />
              <Text style={styles.estimateValue}>~{formatDuration(driveMins)}</Text>
            </View>
          )}

          {distanceMeters !== null && (
            <View style={styles.estimatePill}>
              <MaterialCommunityIcons name="bus" size={15} color="#38BDF8" />
              <Text style={styles.estimateValue}>~{formatDuration(Math.max(1, Math.round(distanceMeters / 250)))}</Text>
            </View>
          )}
        </View>
      )}

      {/* Quick Accessibility Mode Switcher (Before computing route) */}
      {onToggleAccessibilityRoute && (
        <TouchableOpacity
          style={styles.accessToggleCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggleAccessibilityRoute(!accessibleRouteOnly);
          }}
          activeOpacity={0.82}
        >
          <View style={styles.accessIconWrap}>
            <MaterialCommunityIcons
              name="wheelchair"
              size={22}
              color="#06140E"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.accessTitle}>
              Caminho com Acessibilidade
            </Text>
            <Text style={styles.accessSub} numberOfLines={1}>
              {accessibleRouteOnly
                ? 'Evita degraus, obras intransitáveis e calçada estragada'
                : 'Ativar para calcular rota adaptada a mobilidade reduzida'}
            </Text>
          </View>

          <Ionicons
            name={accessibleRouteOnly ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color="#06140E"
          />
        </TouchableOpacity>
      )}

      {/* Main Action Buttons */}
      <View style={styles.actionButtonsRow}>
        {/* Navigate Walking */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnWhite]}
          onPress={handleStartWalkRoute}
          activeOpacity={0.85}
        >
          {accessibleRouteOnly ? (
            <MaterialCommunityIcons name="wheelchair" size={19} color="#080A0C" />
          ) : (
            <Ionicons name="walk" size={18} color="#10B981" />
          )}
          <Text style={styles.navBtnTextDark}>
            {accessibleRouteOnly ? 'A Pé (Sem Barreiras)' : 'A Pé em Segurança'}
          </Text>
        </TouchableOpacity>

        {/* Navigate Driving */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnWhite]}
          onPress={handleStartDriveRoute}
          activeOpacity={0.85}
        >
          <Ionicons name="car-sport" size={17} color="#F59E0B" />
          <Text style={styles.navBtnTextDark}>De Carro</Text>
        </TouchableOpacity>

        {/* Navigate Transit (STCP / Metro do Porto) */}
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnWhite]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onNavigate(
              place.name,
              { latitude: place.latitude, longitude: place.longitude },
              'transit'
            );
          }}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="bus-side" size={17} color="#0284C7" />
          <Text style={styles.navBtnTextDark}>Transportes</Text>
        </TouchableOpacity>
      </View>

      {/* Secondary Actions */}
      <View style={styles.secondaryRow}>
        {onSetAsOrigin && (
          <TouchableOpacity
            style={styles.secondaryBtnWhite}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSetAsOrigin(place.name, { latitude: place.latitude, longitude: place.longitude });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle-outline" size={16} color="#10B981" />
            <Text style={styles.secondaryBtnTextDark}>
              Partir Daqui (A)
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryBtnWhite}
          onPress={handleReportHere}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
          <Text style={styles.secondaryBtnTextDark}>Sinalizar Perigo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtnWhite}
          onPress={handleOpenGoogleMaps}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={16} color="#475569" />
          <Text style={styles.secondaryBtnTextDark}>Google Maps</Text>
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
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#000000',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    ...M3Elevation.level4,
    zIndex: 8000,
  },
  handle: {
    width: 48,
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 0,
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
    borderRadius: 0,
    backgroundColor: '#ffff00',
    borderWidth: 2,
    borderColor: '#000000',
  },
  poiBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 6,
  },
  infoSection: {
    marginBottom: 10,
  },
  placeTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 24,
  },
  placeSubtitle: {
    fontSize: 13,
    color: '#000000',
    marginTop: 3,
    fontWeight: '600',
  },
  wheelmapInlineBadgeWrap: {
    flexDirection: 'row',
    marginTop: 6,
  },
  wheelmapInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  wheelmapInlineText: {
    fontSize: 11,
    fontWeight: '800',
  },
  officialAddressBadgeWrap: {
    flexDirection: 'row',
    marginTop: 6,
  },
  officialAddressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  officialAddressText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  officialAddressSource: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#000000',
  },
  estimatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  estimatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  estimatePillAccessible: {
    borderColor: '#000000',
    backgroundColor: '#ffff00',
  },
  estimateValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  accessToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0000ff',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
    ...M3Elevation.level2,
  },
  accessIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  accessSub: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 14,
    marginTop: 1,
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
    borderRadius: 0,
    gap: 8,
    height: 48,
  },
  navBtnWhite: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    ...M3Elevation.level2,
  },
  navBtnTextDark: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  secondaryBtnWhite: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderWidth: 2.5,
    borderColor: '#000000',
    ...M3Elevation.level1,
  },
  secondaryBtnTextDark: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
