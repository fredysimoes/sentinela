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
              <Ionicons name="warning" size={18} color="#383139" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>ALERTA DE SENTINELA EM DIRETO</Text>
              <Text style={styles.subtitle}>
                {session.userName} indicou que está a ser seguido(a)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#383139" />
            </TouchableOpacity>
          </View>

          {/* Victim Live Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Ionicons name="navigate-outline" size={16} color="#383139" />
              <Text style={styles.statLabel}>Distância de si</Text>
              <Text style={styles.statVal}>
                {distToVictim !== null ? formatDistance(distToVictim) : 'GPS...'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons name="walk-outline" size={16} color="#383139" />
              <Text style={styles.statLabel}>Velocidade</Text>
              <Text style={styles.statVal}>{speedKmh ? `${speedKmh} km/h` : 'A caminhar'}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Ionicons name="battery-charging-outline" size={16} color="#383139" />
              <Text style={styles.statLabel}>Bateria</Text>
              <Text style={styles.statVal}>{session.batteryLevel || 85}%</Text>
            </View>
          </View>

          {/* Coordinate indicator */}
          <View style={styles.coordRow}>
            <Ionicons name="pin" size={14} color="#383139" style={{ marginRight: 6 }} />
            <Text style={styles.coordText}>
              Última posição: {session.latestLat.toFixed(5)}, {session.latestLng.toFixed(5)} ({session.breadcrumbs.length} pontos de rastro)
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Route Directly to Victim */}
            <M3Pressable style={styles.routeBtn} onPress={handleRouteToVictim}>
              <Ionicons name="navigate" size={18} color="#383139" style={{ marginRight: 8 }} />
              <Text style={styles.routeBtnText}>Traçar Rota até {session.userName.split(' ')[0]}</Text>
            </M3Pressable>

            {/* Emergency 112 Call */}
            <M3Pressable style={styles.sos112Btn} onPress={handleCall112}>
              <Ionicons name="call" size={18} color="#383139" style={{ marginRight: 8 }} />
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
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    paddingBottom: 12,
  },
  alertPulseBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#f6a3ca',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    color: '#f6a3ca',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#383139',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statLabel: {
    color: '#7D7582',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statVal: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
  },
  statDivider: {
    width: 1.5,
    height: 28,
    backgroundColor: '#f1f2fa',
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9e7a8',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 16,
  },
  coordText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '800',
  },
  actions: {
    gap: 10,
  },
  routeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ded0f9',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  routeBtnText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sos112Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  sos112BtnText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
