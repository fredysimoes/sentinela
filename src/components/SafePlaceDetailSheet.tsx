import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafePlace, UserLocation } from '../types';
import { calculateDistanceMeters, formatDistance, getGoogleMapsUrl } from '../utils/geo';
import { getPharmacyStatus } from '../utils/pharmacySchedule';
import { M3Colors, M3Shapes, M3Elevation, M3Typography, M3Motion } from '../theme/m3';

interface SafePlaceDetailSheetProps {
  place: SafePlace | null;
  userLocation: UserLocation | null;
  onClose: () => void;
  onNavigate?: (place: SafePlace) => void;
}

export const SafePlaceDetailSheet: React.FC<SafePlaceDetailSheetProps> = ({
  place,
  userLocation,
  onClose,
  onNavigate,
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

  const isPharmacy = place.type === 'pharmacy';
  const isHospital = place.type === 'hospital';
  const hasScheduleStatus = isPharmacy || isHospital;
  const placeStatus = hasScheduleStatus ? getPharmacyStatus(place) : null;

  const handleOpenMaps = () => {
    Linking.openURL(getGoogleMapsUrl(place.latitude, place.longitude));
  };

  const handleCall = () => {
    if (place.phone) {
      const cleanPhone = place.phone.replace(/\s+/g, '');
      Linking.openURL(`tel:${cleanPhone}`);
    } else {
      Linking.openURL('tel:112');
    }
  };

  const getTypeMeta = () => {
    switch (place.type) {
      case 'psp':
        return {
          title: 'PSP - Polícia de Segurança Pública',
          color: '#F8FAFC',
          bg: 'rgba(248, 250, 252, 0.14)',
          icon: 'police-badge',
          isMci: true,
          badgeText: 'ESQUADRA PSP',
        };
      case 'gnr':
        return {
          title: 'GNR - Guarda Nacional Republicana',
          color: '#F8FAFC',
          bg: 'rgba(248, 250, 252, 0.14)',
          icon: 'police-badge',
          isMci: true,
          badgeText: 'POSTO GNR',
        };
      case 'pj':
        return {
          title: 'PJ - Polícia Judiciária',
          color: '#F8FAFC',
          bg: 'rgba(248, 250, 252, 0.14)',
          icon: 'police-badge',
          isMci: true,
          badgeText: 'DIRETORIA PJ',
        };
      case 'hospital':
        return {
          title: 'Hospital / Unidade de Urgência',
          color: placeStatus?.isOpen ? '#0EA5E9' : '#94A3B8',
          bg: placeStatus?.isOpen ? 'rgba(14, 165, 233, 0.16)' : 'rgba(148, 163, 184, 0.12)',
          icon: 'hospital-building',
          isMci: true,
          badgeText: placeStatus?.isOpen ? 'HOSPITAL ABERTO' : 'HOSPITAL FECHADO',
        };
      case 'pharmacy':
        return {
          title: 'Farmácia de Atendimento',
          color: placeStatus?.isOpen ? '#10B981' : '#94A3B8',
          bg: placeStatus?.isOpen ? 'rgba(16, 185, 129, 0.16)' : 'rgba(148, 163, 184, 0.12)',
          icon: placeStatus?.isOpen ? 'plus-thick' : 'plus',
          isMci: true,
          badgeText: placeStatus?.badgeText || 'FARMÁCIA',
        };
    }
  };

  const meta = getTypeMeta();

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.typeBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
          {meta.isMci ? (
            <MaterialCommunityIcons name={meta.icon as any} size={15} color={meta.color} />
          ) : (
            <Ionicons name={meta.icon as any} size={14} color={meta.color} />
          )}
          <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.badgeText}</Text>
        </View>

        <TouchableOpacity onPress={handleAnimatedClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Name */}
      <Text style={styles.name}>{place.name}</Text>

      {/* Address */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color="#94A3B8" />
        <Text style={styles.addressText}>
          {place.address}, {place.city}
        </Text>
      </View>

      {/* Distance */}
      {distanceMeters !== null && (
        <View style={styles.distanceRow}>
          <Ionicons name="walk-outline" size={16} color="#38BDF8" />
          <Text style={styles.distanceText}>
            A {formatDistance(distanceMeters)} da sua posição atual
          </Text>
        </View>
      )}

      {/* Schedule / Open Status Card */}
      <View
        style={[
          styles.scheduleCard,
          hasScheduleStatus && {
            borderLeftColor: placeStatus?.statusColor || '#10B981',
          },
        ]}
      >
        <View style={styles.scheduleHeader}>
          <Ionicons
            name={hasScheduleStatus && !placeStatus?.isOpen ? 'close-circle' : 'time'}
            size={18}
            color={hasScheduleStatus ? placeStatus?.statusColor : '#10B981'}
          />
          <Text
            style={[
              styles.scheduleTitle,
              { color: hasScheduleStatus ? placeStatus?.statusColor : '#10B981' },
            ]}
          >
            {hasScheduleStatus ? placeStatus?.statusLabel : 'Atendimento Permanente 24 Horas'}
          </Text>
        </View>

        <Text style={styles.scheduleBody}>
          {hasScheduleStatus ? placeStatus?.hoursDescription : place.hoursDescription}
        </Text>
      </View>

      {/* Wheelmap / OpenStreetMap Accessibility Card */}
      {place.wheelchair && (
        <View
          style={[
            styles.wheelmapCard,
            {
              borderLeftColor:
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
          <View style={styles.wheelmapHeader}>
            <View
              style={[
                styles.wheelmapBadge,
                {
                  backgroundColor:
                    place.wheelchair === 'yes'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : place.wheelchair === 'limited'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : place.wheelchair === 'no'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(100, 116, 139, 0.15)',
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
                size={14}
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
                  styles.wheelmapBadgeText,
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
                  ? 'TOTALMENTE ACESSÍVEL'
                  : place.wheelchair === 'limited'
                  ? 'ACESSIBILIDADE PARCIAL'
                  : place.wheelchair === 'no'
                  ? 'INACESSÍVEL'
                  : 'NÃO CLASSIFICADO'}
              </Text>
            </View>

            <Text style={styles.wheelmapSourceText}>Wheelmap · OSM</Text>
          </View>

          <Text style={styles.wheelmapTitle}>
            {place.wheelchair === 'yes'
              ? 'Entrada nivelada e interior sem degraus'
              : place.wheelchair === 'limited'
              ? 'Entrada com degrau (< 7cm) ou rampa móvel'
              : place.wheelchair === 'no'
              ? 'Presença de degraus na entrada sem rampa'
              : 'Informação de acessibilidade não confirmada'}
          </Text>

          {place.wheelchairDescription ? (
            <Text style={styles.wheelmapDescription}>{place.wheelchairDescription}</Text>
          ) : null}

          {place.wheelchairToilet && (
            <View style={styles.wheelmapToiletRow}>
              <MaterialCommunityIcons
                name={place.wheelchairToilet === 'yes' ? 'human-male-female' : 'close-circle-outline'}
                size={14}
                color={place.wheelchairToilet === 'yes' ? '#10B981' : '#94A3B8'}
              />
              <Text style={styles.wheelmapToiletText}>
                {place.wheelchairToilet === 'yes'
                  ? 'Instalação sanitária adaptada a cadeira de rodas'
                  : place.wheelchairToilet === 'limited'
                  ? 'Instalação sanitária com acesso limitado'
                  : 'Sem instalação sanitária adaptada'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Safe Path Navigation Button */}
      {onNavigate && (
        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={() => onNavigate(place)}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={18} color="#06140E" />
          <Text style={styles.navigateBtnText}>Navegar com Rota Segura</Text>
        </TouchableOpacity>
      )}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {place.phone && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.callBtnText}>Ligar ({place.phone})</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, styles.mapsBtn, !place.phone && { flex: 1 }]}
          onPress={handleOpenMaps}
          activeOpacity={0.8}
        >
          <Ionicons name="map" size={18} color="#FFFFFF" />
          <Text style={styles.mapsBtnText}>Abrir no Mapa</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    ...M3Elevation.level4,
    zIndex: 8000,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: M3Colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: M3Shapes.small,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: M3Colors.onSurface,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 13,
    color: M3Colors.onSurfaceVariant,
    flexShrink: 1,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: M3Colors.primary,
  },
  scheduleCard: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.medium,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: M3Colors.success,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleBody: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  wheelmapCard: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.medium,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  wheelmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  wheelmapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: M3Shapes.extraSmall,
    borderWidth: 1,
  },
  wheelmapBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  wheelmapSourceText: {
    fontSize: 10,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  wheelmapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: M3Colors.onSurface,
    marginBottom: 4,
    lineHeight: 18,
  },
  wheelmapDescription: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    lineHeight: 16,
    marginBottom: 6,
  },
  wheelmapToiletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  wheelmapToiletText: {
    fontSize: 11,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    gap: 8,
    marginBottom: 12,
    ...M3Elevation.level2,
  },
  navigateBtnText: {
    color: '#06140E',
    fontWeight: '800',
    fontSize: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: M3Shapes.full,
    gap: 8,
  },
  callBtn: {
    backgroundColor: M3Colors.secondaryContainer,
  },
  callBtnText: {
    color: M3Colors.onSecondaryContainer,
    fontWeight: '600',
    fontSize: 13,
  },
  mapsBtn: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  mapsBtnText: {
    color: M3Colors.onSurface,
    fontWeight: '600',
    fontSize: 13,
  },
});
