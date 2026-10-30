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
              <Ionicons name="checkmark-sharp" size={32} color="#10B981" />
            </View>
          </View>

          {/* Title & Destination */}
          <Text style={styles.arrivalTitle}>Chegou ao Destino</Text>
          <Text style={styles.destinationName} numberOfLines={2}>
            {data.destinationName}
          </Text>

          {/* Safety Status Pill */}
          <View style={styles.safetyPill}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#34D399" />
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
                  <Ionicons name="car-sport" size={16} color="#38BDF8" />
                ) : isTransit ? (
                  <MaterialCommunityIcons name="bus" size={16} color="#38BDF8" />
                ) : (
                  <Ionicons name="walk" size={16} color="#38BDF8" />
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
                <Ionicons name="time-outline" size={16} color="#38BDF8" />
              </View>
              <Text style={styles.metricLabel}>Duração</Text>
              <Text style={styles.metricValue}>
                {formatDuration(data.durationMinutes)}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="navigate-outline" size={16} color="#38BDF8" />
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
            <Ionicons name="arrow-forward" size={18} color="#06140E" />
          </M3Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
    ...M3Elevation.level3,
  },
  iconCircleOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  iconCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  destinationName: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  safetyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: M3Shapes.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
    marginBottom: 20,
  },
  safetyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  metricsBox: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'space-around',
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
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
  },
  finishButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...M3Elevation.level2,
  },
  finishButtonText: {
    color: '#06140E',
    fontSize: 16,
    fontWeight: '800',
  },
});
