import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const pharmacyStatus = isPharmacy ? getPharmacyStatus(place) : null;

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
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.15)',
          icon: 'shield-sharp',
          badgeText: 'ESQUADRA PSP',
        };
      case 'gnr':
        return {
          title: 'GNR - Guarda Nacional Republicana',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          icon: 'shield-checkmark',
          badgeText: 'POSTO GNR',
        };
      case 'pj':
        return {
          title: 'PJ - Polícia Judiciária',
          color: '#6366F1',
          bg: 'rgba(99, 102, 241, 0.15)',
          icon: 'briefcase',
          badgeText: 'DIRETORIA PJ',
        };
      case 'pharmacy':
        return {
          title: 'Farmácia de Atendimento',
          color: pharmacyStatus?.statusColor || '#10B981',
          bg: pharmacyStatus?.isOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          icon: 'medical',
          badgeText: pharmacyStatus?.badgeText || 'FARMÁCIA',
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
          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
          <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.badgeText}</Text>
        </View>

        <TouchableOpacity onPress={handleAnimatedClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Name */}
      <Text style={styles.name}>{place.name}</Text>

      {/* Address & Distance */}
      <View style={styles.locationRow}>
        <Ionicons name="location-sharp" size={15} color="#94A3B8" />
        <Text style={styles.addressText}>
          {place.address}, {place.city}
        </Text>
      </View>

      {distanceMeters !== null && (
        <View style={styles.distanceRow}>
          <Ionicons name="navigate-circle" size={16} color="#38BDF8" />
          <Text style={styles.distanceText}>A {formatDistance(distanceMeters)} de si</Text>
        </View>
      )}

      {/* Status & Schedule Card */}
      <View style={[styles.scheduleCard, isPharmacy && { borderLeftColor: pharmacyStatus?.ringColor }]}>
        <View style={styles.scheduleHeader}>
          <Ionicons
            name={isPharmacy ? (pharmacyStatus?.isOpen ? 'time' : 'time-outline') : 'checkmark-circle'}
            size={18}
            color={isPharmacy ? pharmacyStatus?.statusColor : '#10B981'}
          />
          <Text
            style={[
              styles.scheduleTitle,
              { color: isPharmacy ? pharmacyStatus?.statusColor : '#10B981' },
            ]}
          >
            {isPharmacy ? pharmacyStatus?.statusLabel : 'Atendimento Permanente 24 Horas'}
          </Text>
        </View>

        <Text style={styles.scheduleBody}>
          {isPharmacy ? pharmacyStatus?.hoursDescription : place.hoursDescription}
        </Text>
      </View>

      {/* Safe Path Navigation Button */}
      {onNavigate && (
        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={() => onNavigate(place)}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
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
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    ...M3Elevation.level4,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.primaryContainer,
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    gap: 8,
    marginBottom: 12,
    ...M3Elevation.level2,
  },
  navigateBtnText: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
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
