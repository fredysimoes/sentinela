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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#f5f4ee',
    borderRadius: 0,
    borderWidth: 4,
    borderColor: '#000000',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  iconCircleOuter: {
    width: 76,
    height: 76,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#000000',
  },
  iconCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  destinationName: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  safetyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    gap: 6,
    marginBottom: 20,
  },
  safetyPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
  },
  metricsBox: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 22,
    borderWidth: 3,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
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
    color: '#000000',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  metricDivider: {
    width: 2,
    height: 28,
    backgroundColor: '#000000',
  },
  finishButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#ff0000',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
