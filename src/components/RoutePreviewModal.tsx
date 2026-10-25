import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { PedestrianRoute, TransportMode } from '../types/navigation';
import { formatDistance } from '../utils/geo';

interface RoutePreviewModalProps {
  visible: boolean;
  destinationName: string;
  safeRoute: PedestrianRoute | null;
  directRoute?: PedestrianRoute;
  currentMode?: TransportMode;
  onToggleMode?: (mode: TransportMode) => void;
  onClose: () => void;
  onStartNavigation: (chosenRoute: PedestrianRoute) => void;
}

export const RoutePreviewModal: React.FC<RoutePreviewModalProps> = ({
  visible,
  destinationName,
  safeRoute,
  directRoute,
  currentMode = 'walking',
  onToggleMode,
  onClose,
  onStartNavigation,
}) => {
  if (!safeRoute) return null;

  const [selectedRouteId, setSelectedRouteId] = useState<string>(safeRoute.id);

  const selectedRoute =
    directRoute && selectedRouteId === directRoute.id ? directRoute : safeRoute;

  const handleSelect = (route: PedestrianRoute) => {
    Haptics.selectionAsync();
    setSelectedRouteId(route.id);
  };

  const handleStart = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    onStartNavigation(selectedRoute);
  };

  const isDriving = (safeRoute.mode || currentMode) === 'driving';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.modeIconCircle}>
              <Ionicons
                name={isDriving ? 'car-sport' : 'walk'}
                size={22}
                color="#38BDF8"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {isDriving ? 'Rota Automóvel Segura' : 'Rota Pedestre Segura'}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {destinationName}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher in Preview Modal */}
          {onToggleMode && (
            <View style={styles.modeSwitcherBar}>
              <TouchableOpacity
                style={[
                  styles.modeSwitchBtn,
                  !isDriving && styles.modeSwitchBtnActive,
                ]}
                onPress={() => onToggleMode('walking')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="walk"
                  size={15}
                  color={!isDriving ? '#0F172A' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.modeSwitchText,
                    !isDriving && styles.modeSwitchTextActive,
                  ]}
                >
                  A Pé
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeSwitchBtn,
                  isDriving && styles.modeSwitchBtnActive,
                ]}
                onPress={() => onToggleMode('driving')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="car-sport"
                  size={15}
                  color={isDriving ? '#0F172A' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.modeSwitchText,
                    isDriving && styles.modeSwitchTextActive,
                  ]}
                >
                  De Carro
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* SAFE ROUTE CARD */}
            <TouchableOpacity
              style={[
                styles.routeCard,
                selectedRouteId === safeRoute.id && styles.routeCardSelectedSafe,
              ]}
              onPress={() => handleSelect(safeRoute)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.safeBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                  <Text style={styles.safeBadgeText}>RECOMENDADA · ROTA SEGURA</Text>
                </View>

                {selectedRouteId === safeRoute.id && (
                  <Ionicons name="radio-button-on" size={20} color="#10B981" />
                )}
              </View>

              <View style={styles.metricsRow}>
                <Text style={styles.timeText}>
                  {safeRoute.formattedDuration || `${safeRoute.durationMinutes} min`}
                </Text>
                <Text style={styles.distText}>
                  ({safeRoute.formattedDistance || formatDistance(safeRoute.distanceMeters)})
                </Text>
                {safeRoute.estimatedArrival && (
                  <View style={styles.arrivalBadge}>
                    <Text style={styles.arrivalBadgeText}>
                      Chegada às {safeRoute.estimatedArrival}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.summaryText}>{safeRoute.summary}</Text>

              {safeRoute.hazardsAvoided.length > 0 && (
                <View style={styles.avoidedBox}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.avoidedText}>
                    Desvio protetor ativado: evita {safeRoute.hazardsAvoided.length} zona(s) de perigo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* DIRECT ROUTE CARD (if hazards present) */}
            {directRoute && (
              <TouchableOpacity
                style={[
                  styles.routeCard,
                  selectedRouteId === directRoute.id && styles.routeCardSelectedDirect,
                ]}
                onPress={() => handleSelect(directRoute)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.warnBadge}>
                    <Ionicons name="warning" size={14} color="#F59E0B" />
                    <Text style={styles.warnBadgeText}>MAIS RÁPIDA (COM AVISOS)</Text>
                  </View>

                  {selectedRouteId === directRoute.id && (
                    <Ionicons name="radio-button-on" size={20} color="#F59E0B" />
                  )}
                </View>

                <View style={styles.metricsRow}>
                  <Text style={styles.timeText}>
                    {directRoute.formattedDuration || `${directRoute.durationMinutes} min`}
                  </Text>
                  <Text style={styles.distText}>
                    ({directRoute.formattedDistance || formatDistance(directRoute.distanceMeters)})
                  </Text>
                  {directRoute.estimatedArrival && (
                    <View style={styles.arrivalBadge}>
                      <Text style={styles.arrivalBadgeText}>
                        Chegada às {directRoute.estimatedArrival}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.summaryText}>{directRoute.summary}</Text>

                {directRoute.hazardsOnRoute.length > 0 && (
                  <View style={styles.warningBox}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.warningText}>
                      Passa por zonas com reporte ativo de ocorrências
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Action button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.startBtn,
                selectedRoute.isSafe ? styles.startBtnSafe : styles.startBtnWarn,
              ]}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Ionicons
                name={selectedRoute.isSafe ? 'navigate' : 'navigate-outline'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.startBtnText}>
                {selectedRoute.isSafe
                  ? `Iniciar Navegação (${selectedRoute.formattedDuration || `${selectedRoute.durationMinutes} min`})`
                  : 'Iniciar Percurso'}
              </Text>
            </TouchableOpacity>
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
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  modeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeSwitcherBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 10,
    backgroundColor: '#1E293B',
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  modeSwitchBtnActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  modeSwitchText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  modeSwitchTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  arrivalBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  arrivalBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 18,
  },
  routeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 14,
  },
  routeCardSelectedSafe: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  routeCardSelectedDirect: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  safeBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  warnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warnBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  distText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  summaryText: {
    fontSize: 13,
    color: '#CBD5E1',
    marginBottom: 8,
  },
  avoidedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: 8,
    borderRadius: 8,
  },
  avoidedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  startBtnSafe: {
    backgroundColor: '#059669',
  },
  startBtnWarn: {
    backgroundColor: '#D97706',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
