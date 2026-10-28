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
        </View>
      )}

      {/* Quick Accessibility Mode Switcher (Before computing route) */}
      {onToggleAccessibilityRoute && (
        <TouchableOpacity
          style={[
            styles.accessToggleCard,
            accessibleRouteOnly && styles.accessToggleCardActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onToggleAccessibilityRoute(!accessibleRouteOnly);
          }}
          activeOpacity={0.82}
        >
          <View
            style={[
              styles.accessIconWrap,
              accessibleRouteOnly && styles.accessIconWrapActive,
            ]}
          >
            <MaterialCommunityIcons
              name="wheelchair"
              size={18}
              color={accessibleRouteOnly ? '#FFFFFF' : '#06B6D4'}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.accessTitleRow}>
              <Text
                style={[
                  styles.accessTitle,
                  accessibleRouteOnly && styles.accessTitleActive,
                ]}
              >
                Caminho com Acessibilidade
              </Text>
              <View
                style={[
                  styles.accessBadge,
                  accessibleRouteOnly && styles.accessBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.accessBadgeText,
                    accessibleRouteOnly && styles.accessBadgeTextActive,
                  ]}
                >
                  {accessibleRouteOnly ? 'ATIVADO' : 'DESLIGADO'}
                </Text>
              </View>
            </View>
            <Text style={styles.accessSub} numberOfLines={1}>
              {accessibleRouteOnly
                ? 'Evita degraus, obras intransitáveis e calçada estragada'
                : 'Ativar para calcular rota adaptada a mobilidade reduzida'}
            </Text>
          </View>

          <Ionicons
            name={accessibleRouteOnly ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={accessibleRouteOnly ? '#06B6D4' : '#64748B'}
          />
        </TouchableOpacity>
      )}

      {/* Main Action Buttons */}
      <View style={styles.actionButtonsRow}>
        {/* Navigate Walking */}
        <TouchableOpacity
          style={[
            styles.navBtn,
            accessibleRouteOnly ? styles.navBtnAccessible : styles.navBtnWalking,
          ]}
          onPress={handleStartWalkRoute}
          activeOpacity={0.85}
        >
          {accessibleRouteOnly ? (
            <MaterialCommunityIcons name="wheelchair" size={19} color="#080A0C" />
          ) : (
            <Ionicons name="walk" size={18} color="#0F172A" />
          )}
          <Text style={styles.navBtnTextDark}>
            {accessibleRouteOnly ? 'A Pé (Sem Barreiras)' : 'A Pé em Segurança'}
          </Text>
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
    borderRadius: M3Shapes.extraSmall,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
  },
  wheelmapInlineText: {
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: M3Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: M3Shapes.small,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  estimatePillAccessible: {
    borderColor: 'rgba(6, 182, 212, 0.45)',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  estimateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: M3Colors.onSurface,
  },
  accessToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  accessToggleCardActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderColor: '#06B6D4',
  },
  accessIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessIconWrapActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#38BDF8',
  },
  accessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  accessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  accessTitleActive: {
    color: '#FFFFFF',
  },
  accessBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  accessBadgeActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    borderColor: '#06B6D4',
  },
  accessBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  accessBadgeTextActive: {
    color: '#06B6D4',
  },
  accessSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 14,
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
  navBtnAccessible: {
    backgroundColor: '#06B6D4',
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
