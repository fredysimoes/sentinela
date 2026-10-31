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

      {/* Header Row with Icon, Title and Close Button (Removidas as caixas de texto redundantes) */}
      <View style={styles.headerRow}>
        <View style={[styles.titleIconSquircle, { backgroundColor: `${meta.color}25`, borderColor: meta.color }]}>
          <MaterialCommunityIcons
            name={(meta.mciIcon || 'alert-circle') as any}
            size={22}
            color={meta.color}
          />
        </View>
        <Text style={styles.title} numberOfLines={2}>{incident.title}</Text>
        <TouchableOpacity onPress={handleAnimatedClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

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
          <Ionicons name="navigate" size={18} color="#080A0C" />
          <Text style={styles.navigateBtnText}>Navegar com Rota Segura (A Pé)</Text>
        </TouchableOpacity>
      )}

      {/* Open in Maps button */}
      <TouchableOpacity
        style={styles.mapsBtn}
        onPress={handleOpenMaps}
        activeOpacity={0.85}
      >
        <Ionicons name="map-outline" size={18} color="#080A0C" />
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
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    borderTopWidth: 4,
    borderTopColor: '#000000',
    ...M3Elevation.level4,
    zIndex: 8000,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 0,
    backgroundColor: '#000000',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  titleIconSquircle: {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  dateMetaContainer: {
    gap: 6,
    marginBottom: 12,
  },
  dateMetaHighlight: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
  dateMetaValue: {
    color: '#000000',
    fontWeight: '800',
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
    color: '#000000',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  votingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    padding: 12,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#000000',
    ...M3Elevation.level2,
  },
  votingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.6,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
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
    height: 42,
    borderRadius: 0,
    gap: 6,
    borderWidth: 2.5,
    borderColor: '#000000',
    ...M3Elevation.level1,
  },
  confirmBtn: {
    backgroundColor: '#ffff00',
  },
  confirmBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  dismissBtn: {
    backgroundColor: '#ffffff',
  },
  dismissBtnText: {
    color: '#ff0000',
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  votingHint: {
    color: '#000000',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    ...M3Elevation.level2,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff0000',
    height: 48,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    marginBottom: 10,
    ...M3Elevation.level3,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
  },
  mapsBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
    textTransform: 'uppercase',
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
