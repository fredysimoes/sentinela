import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3Pressable } from './M3MotionWrapper';
import { StalkingTrackingSession } from '../services/stalkingService';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';

interface LiveSentinelTrackerModalProps {
  session: StalkingTrackingSession | null;
  userLocation?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onNavigateToUser: (name: string, coord: { latitude: number; longitude: number }) => void;
}

export const LiveSentinelTrackerModal: React.FC<LiveSentinelTrackerModalProps> = ({
  session,
  userLocation,
  onClose,
  onNavigateToUser,
}) => {
  if (!session) return null;

  const distToVictim = userLocation
    ? calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        session.latestLat,
        session.latestLng
      )
    : null;

  const speedKmh = session.latestSpeed ? (session.latestSpeed * 3.6).toFixed(1) : null;

  const handleCall112 = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Ligar 112 - Emergência',
      `Pretende ligar imediatamente para o 112 para reportar que ${session.userName} se encontra em perigo e fornecer as coordenadas GPS exatas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ligar 112',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:112'),
        },
      ]
    );
  };

  const handleRouteToVictim = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    onNavigateToUser(session.userName, {
      latitude: session.latestLat,
      longitude: session.latestLng,
    });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Top Urgent Bar */}
          <View style={styles.header}>
            <View style={styles.alertPulseBadge}>
              <Ionicons name="warning" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>ALERTA DE SENTINELA EM DIRETO</Text>
              <Text style={styles.subtitle}>
                {session.userName} indicou que está a ser seguido(a)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Victim Live Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Ionicons name="navigate-outline" size={16} color="#38BDF8" />
              <Text style={styles.statLabel}>Distância de si</Text>
              <Text style={styles.statVal}>
                {distToVictim !== null ? formatDistance(distToVictim) : 'GPS...'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons name="walk-outline" size={16} color="#10B981" />
              <Text style={styles.statLabel}>Velocidade</Text>
              <Text style={styles.statVal}>{speedKmh ? `${speedKmh} km/h` : 'A caminhar'}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons name="battery-charging-outline" size={16} color="#F59E0B" />
              <Text style={styles.statLabel}>Bateria</Text>
              <Text style={styles.statVal}>{session.batteryLevel || 85}%</Text>
            </View>
          </View>

          {/* Coordinate indicator */}
          <View style={styles.coordRow}>
            <Ionicons name="pin" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.coordText}>
              Última posição: {session.latestLat.toFixed(5)}, {session.latestLng.toFixed(5)} ({session.breadcrumbs.length} pontos de rastro)
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Route Directly to Victim */}
            <M3Pressable style={styles.routeBtn} onPress={handleRouteToVictim}>
              <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.routeBtnText}>Traçar Rota até {session.userName.split(' ')[0]}</Text>
            </M3Pressable>

            {/* Emergency 112 Call */}
            <M3Pressable style={styles.sos112Btn} onPress={handleCall112}>
              <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.sos112BtnText}>Ligar 112</Text>
            </M3Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#161A22',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  alertPulseBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  subtitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2430',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2F3849',
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  statVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2F3849',
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  coordText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
  routeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: M3Shapes.full,
    paddingVertical: 14,
  },
  routeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sos112Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: M3Shapes.full,
    paddingVertical: 14,
  },
  sos112BtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
