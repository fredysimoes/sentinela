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
import { MaterialSymbolIcon, MaterialSymbolName } from './MaterialSymbolIcon';
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

  const getTypeMeta = (): {
    title: string;
    color: string;
    bg: string;
    symbol?: MaterialSymbolName;
    icon?: string;
    isMci?: boolean;
    badgeText: string;
  } => {
    switch (place.type) {
      case 'psp':
        return {
          title: 'PSP - Polícia de Segurança Pública',
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.14)',
          symbol: 'local_police',
          badgeText: 'ESQUADRA PSP',
        };
      case 'gnr':
        return {
          title: 'GNR - Guarda Nacional Republicana',
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.14)',
          symbol: 'local_police',
          badgeText: 'POSTO GNR',
        };
      case 'pj':
        return {
          title: 'PJ - Polícia Judiciária',
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.14)',
          symbol: 'local_police',
          badgeText: 'DIRETORIA PJ',
        };
      case 'hospital':
        return {
          title: 'Hospital / Unidade de Urgência',
          color: '#FFFFFF',
          bg: placeStatus?.isOpen ? 'rgba(14, 165, 233, 0.22)' : 'rgba(148, 163, 184, 0.12)',
          symbol: 'emergency',
          badgeText: placeStatus?.isOpen ? 'HOSPITAL ABERTO' : 'HOSPITAL FECHADO',
        };
      case 'pharmacy':
        return {
          title: 'Farmácia de Atendimento',
          color: placeStatus?.isOpen ? '#10B981' : '#FFFFFF',
          bg: placeStatus?.isOpen ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.12)',
          symbol: 'health_cross',
          badgeText: placeStatus?.badgeText || 'FARMÁCIA',
        };
      case 'school':
        return {
          title: 'Escola / Estabelecimento de Ensino',
          color: '#8B5CF6',
          bg: 'rgba(139, 92, 246, 0.16)',
          icon: 'school',
          isMci: true,
          badgeText: 'ESCOLA SEGURA',
        };
      case 'heritage':
        return {
          title: place.protectionTitle || 'Património Cultural Classificado',
          color: '#D97706',
          bg: 'rgba(217, 119, 6, 0.16)',
          icon: 'castle',
          isMci: true,
          badgeText: place.protectionTitle
            ? place.protectionTitle.toUpperCase()
            : 'PATRIMÓNIO CULTURAL',
        };
      case 'wheelmap':
        const isYes = place.wheelchair === 'yes';
        const isLimited = place.wheelchair === 'limited';
        const wColor = isYes ? '#10B981' : isLimited ? '#F59E0B' : '#EF4444';
        const wBg = isYes
          ? 'rgba(16, 185, 129, 0.16)'
          : isLimited
          ? 'rgba(245, 158, 11, 0.16)'
          : 'rgba(239, 68, 68, 0.16)';
        return {
          title: place.wheelmapCategory ? `Acessibilidade · ${place.wheelmapCategory}` : 'Ponto de Acessibilidade Wheelmap',
          color: wColor,
          bg: wBg,
          symbol: 'accessible',
          badgeText: isYes ? 'ACESSO TOTAL' : isLimited ? 'ACESSO PARCIAL' : 'NÃO ACESSÍVEL',
        };
      default:
        return {
          title: 'Local Seguro',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.16)',
          icon: 'shield-check',
          isMci: true,
          badgeText: 'PONTO SEGURO',
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
          {meta.symbol ? (
            <MaterialSymbolIcon name={meta.symbol} size={15} color={meta.color} />
          ) : meta.isMci ? (
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

      {/* Escola Segura Badge (PSP / GNR) */}
      {place.type === 'school' && (
        <View style={styles.schoolSafeBanner}>
          <View style={styles.schoolSafeHeader}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#8B5CF6" />
            <Text style={styles.schoolSafeTitle}>Programa Escola Segura (PSP / GNR)</Text>
          </View>
          <Text style={styles.schoolSafeDesc}>
            Perímetro de segurança prioritário com vigilância policial e acalmia de tráfego pedonal.
          </Text>
        </View>
      )}

      {/* Património Cultural Classificado Badge (Património Cultural, I.P.) */}
      {place.type === 'heritage' && (
        <View style={styles.heritageBanner}>
          <View style={styles.heritageHeader}>
            <MaterialCommunityIcons name="castle" size={16} color="#D97706" />
            <Text style={styles.heritageTitle}>
              {place.protectionTitle || 'Património Cultural Classificado'}
            </Text>
          </View>
          <Text style={styles.heritageDesc}>
            Imóvel de proteção oficial tutelado pelo Património Cultural, I.P. Ponto de referência e vigilância urbana.
          </Text>
        </View>
      )}


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
          <Ionicons name="navigate" size={18} color="#383139" />
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
            <Ionicons name="call" size={18} color="#383139" />
            <Text style={styles.callBtnText}>Ligar ({place.phone})</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, styles.mapsBtn, !place.phone && { flex: 1 }]}
          onPress={handleOpenMaps}
          activeOpacity={0.8}
        >
          <Ionicons name="map" size={18} color="#383139" />
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
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 8000,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
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
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#383139',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: '#383139',
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
    color: '#48404b',
    fontWeight: '500',
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
    fontWeight: '900',
    color: '#000000',
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
  schoolSafeBanner: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: M3Shapes.medium,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  schoolSafeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  schoolSafeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  schoolSafeDesc: {
    fontSize: 11,
    color: M3Colors.onSurfaceVariant,
    lineHeight: 16,
  },
  heritageBanner: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderRadius: M3Shapes.medium,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  heritageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heritageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  heritageDesc: {
    fontSize: 11,
    color: M3Colors.onSurfaceVariant,
    lineHeight: 16,
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
    backgroundColor: '#f6a3ca',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    marginBottom: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  navigateBtnText: {
    color: '#383139',
    fontWeight: '800',
    fontSize: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  callBtn: {
    backgroundColor: '#c0efdc',
  },
  callBtnText: {
    color: '#383139',
    fontWeight: '800',
    fontSize: 13,
  },
  mapsBtn: {
    backgroundColor: '#ded0f9',
  },
  mapsBtnText: {
    color: '#383139',
    fontWeight: '800',
    fontSize: 13,
  },
});
