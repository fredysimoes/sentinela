import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { Incident, UserLocation } from '../types';
import { CATEGORIES } from '../constants/categories';
import { calculateDistanceMeters, formatDistance, formatRelativeTime, getGoogleMapsUrl } from '../utils/geo';

interface IncidentDetailSheetProps {
  incident: Incident | null;
  userLocation: UserLocation | null;
  onClose: () => void;
  onConfirm: (incidentId: string) => void;
  onDismiss: (incidentId: string) => void;
  onNavigate?: (incident: Incident) => void;
}

export const IncidentDetailSheet: React.FC<IncidentDetailSheetProps> = ({
  incident,
  userLocation,
  onClose,
  onConfirm,
  onDismiss,
  onNavigate,
}) => {
  if (!incident) return null;

  const meta = CATEGORIES[incident.category] || CATEGORIES.suspicious;

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

  return (
    <View style={styles.container}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.categoryBadge, { backgroundColor: meta.badgeBg, borderColor: meta.color }]}>
          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
          <Text style={[styles.categoryBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title}>{incident.title}</Text>

      {/* Time & Distance meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#94A3B8" />
          <Text style={styles.metaText}>{formatRelativeTime(incident.createdAt)}</Text>
        </View>

        {distanceMeters !== null && (
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={14} color="#38BDF8" />
            <Text style={[styles.metaText, { color: '#38BDF8', fontWeight: '600' }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
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
    color: '#94A3B8',
  },
  description: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 16,
  },
  votingContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  votingTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
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
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  confirmBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  confirmBtnText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 12,
  },
  dismissBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  dismissBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 12,
  },
  votingHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  mapsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
