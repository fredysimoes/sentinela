import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { Incident, UserLocation } from '../types';
import { CATEGORIES, isAccessibilityCategory } from '../constants/categories';
import {
  calculateDistanceMeters,
  formatDistance,
  formatReportDateTime,
  getGoogleMapsUrl,
} from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation, M3Typography, M3Motion } from '../theme/m3';

interface IncidentDetailSheetProps {
  incident: Incident | null;
  userLocation: UserLocation | null;
  onClose: () => void;
  onConfirm: (incidentId: string) => void;
  onDismiss: (incidentId: string) => void;
  onDelete?: (incidentId: string) => void;
  onNavigate?: (incident: Incident) => void;
}

export const IncidentDetailSheet: React.FC<IncidentDetailSheetProps> = ({
  incident,
  userLocation,
  onClose,
  onConfirm,
  onDismiss,
  onDelete,
  onNavigate,
}) => {
  // Material Design 3 Motion: Shared Axis Y Sheet Slide
  const translateY = useRef(new Animated.Value(350)).current;

  useEffect(() => {
    if (incident) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: M3Motion.durations.long2,
        easing: M3Motion.easings.emphasizedDecelerate,
        useNativeDriver: true,
      }).start();
    }
  }, [incident]);

  if (!incident) return null;

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

  const meta = CATEGORIES[incident.category] || CATEGORIES.suspicious;
  const isAccess = isAccessibilityCategory(incident.category);
  const reportDateTime = formatReportDateTime(incident.createdAt);

  const distanceMeters = userLocation
    ? calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        incident.latitude,
        incident.longitude
      )
    : null;

  const handleOpenMaps = () => {
    Linking.openURL(getGoogleMapsUrl(incident.latitude, incident.longitude));
  };

  const handleUpvote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(incident.id);
  };

  const handleDownvote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss(incident.id);
  };

  const handleDelete = () => {
    Alert.alert(
      'Remover Ocorrência',
      'Deseja remover definitivamente esta ocorrência do mapa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (onDelete) {
              onDelete(incident.id);
            } else {
              onDismiss(incident.id);
            }
          },
        },
      ]
    );
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.badgesWrapper}>
          <View style={[styles.categoryBadge, { backgroundColor: meta.badgeBg, borderColor: meta.color }]}>
            <MaterialCommunityIcons
              name={(meta.mciIcon || 'alert-circle') as any}
              size={14}
              color={meta.color}
            />
            <Text style={[styles.categoryBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>

          {isAccess && (
            <View style={styles.accessBadge}>
              <MaterialCommunityIcons name="wheelchair" size={12} color="#06B6D4" />
              <Text style={styles.accessBadgeText}>Acessibilidade</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleAnimatedClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title}>{incident.title}</Text>

      {/* Date, Time & Distance meta */}
      <View style={styles.dateMetaContainer}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color="#38BDF8" />
          <Text style={styles.dateMetaHighlight}>
            Reportado em <Text style={styles.dateMetaValue}>{reportDateTime.fullFormatted}</Text>
          </Text>
        </View>

        {distanceMeters !== null && (
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={14} color="#10B981" />
            <Text style={[styles.metaText, { color: '#10B981', fontWeight: '600' }]}>
              A {formatDistance(distanceMeters)} de si
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={styles.description}>{incident.description}</Text>

      {/* Community validation block */}
      <View style={styles.votingContainer}>
        <Text style={styles.votingTitle}>CONFIRMAÇÃO COMUNITÁRIA</Text>
        <View style={styles.votingActions}>
          <TouchableOpacity
            style={[styles.voteBtn, styles.confirmBtn]}
            onPress={handleUpvote}
            activeOpacity={0.8}
          >
            <Ionicons name="thumbs-up" size={16} color="#10B981" />
            <Text style={styles.confirmBtnText}>Ainda Ativo ({incident.confirmations})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteBtn, styles.dismissBtn]}
            onPress={handleDownvote}
            activeOpacity={0.8}
          >
            <Ionicons name="thumbs-down" size={16} color="#EF4444" />
            <Text style={styles.dismissBtnText}>Já Passou / Falso ({incident.dismissals})</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.votingHint}>
          💡 Se os votos negativos superarem as confirmações, o aviso é removido do mapa.
        </Text>
      </View>

      {/* Safe Path Navigation Button */}
      {onNavigate && (
        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={() => onNavigate(incident)}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
          <Text style={styles.navigateBtnText}>Navegar com Rota Segura (A Pé)</Text>
        </TouchableOpacity>
      )}

      {/* Open in Maps button */}
      <TouchableOpacity
        style={styles.mapsBtn}
        onPress={handleOpenMaps}
        activeOpacity={0.8}
      >
        <Ionicons name="map-outline" size={18} color="#FFFFFF" />
        <Text style={styles.mapsBtnText}>Ver no Google Maps</Text>
      </TouchableOpacity>

      {/* Delete / Remove Incident Button */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
        <Text style={styles.deleteBtnText}>Remover Ocorrência do Mapa</Text>
      </TouchableOpacity>
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
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: M3Shapes.small,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
  },
  accessBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06B6D4',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: M3Shapes.small,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: M3Colors.onSurface,
    marginBottom: 6,
  },
  dateMetaContainer: {
    gap: 6,
    marginBottom: 12,
  },
  dateMetaHighlight: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
  },
  dateMetaValue: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
  },
  description: {
    fontSize: 14,
    color: M3Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  votingContainer: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.medium,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  votingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  votingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: M3Shapes.full,
    gap: 6,
    borderWidth: 1,
  },
  confirmBtn: {
    backgroundColor: 'rgba(109, 213, 140, 0.12)',
    borderColor: M3Colors.success,
  },
  confirmBtnText: {
    color: M3Colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  dismissBtn: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderColor: M3Colors.outlineVariant,
  },
  dismissBtnText: {
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 12,
  },
  votingHint: {
    color: M3Colors.outline,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.surfaceContainerHigh,
    paddingVertical: 12,
    borderRadius: M3Shapes.full,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    gap: 8,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.primaryContainer,
    paddingVertical: 13,
    borderRadius: M3Shapes.full,
    gap: 8,
    marginBottom: 10,
    ...M3Elevation.level2,
  },
  navigateBtnText: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 14,
  },
  mapsBtnText: {
    color: M3Colors.onSurface,
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    gap: 6,
  },
  deleteBtnText: {
    color: M3Colors.error,
    fontWeight: '600',
    fontSize: 13,
  },
});
