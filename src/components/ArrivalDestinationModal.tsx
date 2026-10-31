import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { TransportMode } from '../types/navigation';
import { formatDistance } from '../utils/geo';
import { formatDuration } from '../services/routingService';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { M3Pressable } from './M3MotionWrapper';

export interface ArrivalModalData {
  destinationName: string;
  durationMinutes: number;
  distanceMeters: number;
  mode: TransportMode;
  isSafe: boolean;
  hazardsAvoidedCount?: number;
}

interface ArrivalDestinationModalProps {
  visible: boolean;
  data: ArrivalModalData | null;
  onDismiss: () => void;
}

export const ArrivalDestinationModal: React.FC<ArrivalDestinationModalProps> = ({
  visible,
  data,
  onDismiss,
}) => {
  if (!data) return null;

  const handleFinish = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Light);
    onDismiss();
  };

  const isDriving = data.mode === 'driving';
  const isTransit = data.mode === 'transit';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleFinish}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Header Icon with Neon Glow */}
          <View style={styles.iconCircleOuter}>
            <View style={styles.iconCircleInner}>
              <Ionicons name="checkmark-sharp" size={32} color="#383139" />
            </View>
          </View>

          {/* Title & Destination */}
          <Text style={styles.arrivalTitle}>Chegou ao Destino</Text>
          <Text style={styles.destinationName} numberOfLines={2}>
            {data.destinationName}
          </Text>

          {/* Safety Status Pill */}
          <View style={styles.safetyPill}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#383139" />
            <Text style={styles.safetyPillText}>
              {data.hazardsAvoidedCount && data.hazardsAvoidedCount > 0
                ? `${data.hazardsAvoidedCount} zona(s) de perigo contornada(s)`
                : 'Trajeto concluído em total segurança'}
            </Text>
          </View>

          {/* Metrics Box */}
          <View style={styles.metricsBox}>
            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                {isDriving ? (
                  <Ionicons name="car-sport" size={16} color="#383139" />
                ) : isTransit ? (
                  <MaterialCommunityIcons name="bus" size={16} color="#383139" />
                ) : (
                  <Ionicons name="walk" size={16} color="#383139" />
                )}
              </View>
              <Text style={styles.metricLabel}>Modo</Text>
              <Text style={styles.metricValue}>
                {isDriving ? 'Automóvel' : isTransit ? 'Transporte' : 'A pé'}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="time-outline" size={16} color="#383139" />
              </View>
              <Text style={styles.metricLabel}>Duração</Text>
              <Text style={styles.metricValue}>
                {formatDuration(data.durationMinutes)}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="navigate-outline" size={16} color="#383139" />
              </View>
              <Text style={styles.metricLabel}>Distância</Text>
              <Text style={styles.metricValue}>
                {formatDistance(data.distanceMeters)}
              </Text>
            </View>
          </View>

          {/* Primary Action Button */}
          <M3Pressable style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Concluir Navegação</Text>
            <Ionicons name="arrow-forward" size={18} color="#383139" />
          </M3Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fffdf7',
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircleOuter: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: '#c0efdc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#c0efdc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#383139',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  destinationName: {
    fontSize: 15,
    color: '#7D7582',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  safetyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0efdc',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 6,
    marginBottom: 20,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  safetyPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#383139',
    textTransform: 'uppercase',
  },
  metricsBox: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricIconWrap: {
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#7D7582',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#383139',
  },
  metricDivider: {
    width: 1.5,
    height: 28,
    backgroundColor: '#f1f2fa',
  },
  finishButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  finishButtonText: {
    color: '#383139',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
