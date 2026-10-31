import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteSimulationState, RouteStep } from '../types/navigation';
import { formatDistance } from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation, M3Typography, M3Motion } from '../theme/m3';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';

interface SimulationControllerProps {
  simulationState: RouteSimulationState;
  onNextStep: () => void;
  onPrevStep: () => void;
  onTogglePlay: () => void;
  onSelectStep: (index: number) => void;
  onExit: () => void;
}

export const SimulationController: React.FC<SimulationControllerProps> = ({
  simulationState,
  onNextStep,
  onPrevStep,
  onTogglePlay,
  onSelectStep,
  onExit,
}) => {
  const { route, currentStepIndex, isPlaying, originName, destinationName } = simulationState;
  const steps = route.steps || [];
  const currentStep: RouteStep | undefined = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex >= totalSteps - 1;

  const [showStepList, setShowStepList] = useState(false);

  // Material Motion: Entry animations
  const topAnim = useRef(new Animated.Value(-60)).current;
  const bottomAnim = useRef(new Animated.Value(60)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const prevStepRef = useRef(currentStepIndex);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(topAnim, {
        toValue: 0,
        duration: M3Motion.durations.medium2,
        easing: M3Motion.easings.emphasizedDecelerate,
        useNativeDriver: true,
      }),
      Animated.timing(bottomAnim, {
        toValue: 0,
        duration: M3Motion.durations.medium2,
        easing: M3Motion.easings.emphasizedDecelerate,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Step transition animation
  useEffect(() => {
    if (prevStepRef.current !== currentStepIndex) {
      prevStepRef.current = currentStepIndex;
      contentFadeAnim.setValue(0);
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: M3Motion.durations.medium1,
        easing: M3Motion.easings.standardDecelerate,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStepIndex]);

  const getManeuverIcon = (modifier?: string, type?: string) => {
    if (type === 'arrive') return 'flag';
    if (modifier?.includes('left')) return 'arrow-undo';
    if (modifier?.includes('right')) return 'arrow-redo';
    if (modifier?.includes('straight') || modifier?.includes('continue')) return 'arrow-up';
    return 'navigate';
  };

  const progressPercent = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <>
      {/* TOP SIMULATION HUD BANNER */}
      <Animated.View
        style={[
          styles.topBannerContainer,
          {
            transform: [{ translateY: topAnim }],
          },
        ]}
      >
        {/* Progress Bar Line */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Header Tag & Controls */}
        <View style={styles.topBannerHeader}>
          <View style={styles.simBadge}>
            <Ionicons name="game-controller" size={13} color="#383139" />
            <Text style={styles.simBadgeText}>Modo Simulação</Text>
          </View>

          <View style={styles.stepCounterBadge}>
            <Text style={styles.stepCounterText}>
              Passo {currentStepIndex + 1} de {totalSteps}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(ImpactFeedbackStyle.Light);
              onExit();
            }}
            style={styles.exitBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#383139" />
            <Text style={styles.exitBtnText}>Sair</Text>
          </TouchableOpacity>
        </View>

        {/* Transfer Warning Banner in Simulation */}
        {currentStep?.isTransfer && (
          <View style={styles.simTransferBanner}>
            <Ionicons name="swap-horizontal" size={15} color="#383139" />
            <Text style={styles.simTransferBannerText} numberOfLines={1}>
              {currentStep.transferInstruction || 'PONTO DE TRANSBORDO: Troca de veículo recomendada'}
            </Text>
          </View>
        )}

        {/* Step Instruction Row */}
        <Animated.View
          style={[
            styles.instructionRow,
            {
              opacity: contentFadeAnim,
              transform: [
                {
                  translateX: contentFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.maneuverIconBox}>
            <Ionicons
              name={getManeuverIcon(currentStep?.maneuverModifier, currentStep?.maneuverType) as any}
              size={22}
              color="#383139"
            />
          </View>

          <View style={styles.instructionTextBox}>
            <Text style={styles.stepDistanceText}>
              {currentStep?.distanceMeters
                ? `A ${formatDistance(currentStep.distanceMeters)}`
                : 'Ponto do percurso'}
            </Text>
            <Text style={styles.stepInstructionText} numberOfLines={2}>
              {currentStep?.instruction || 'Siga pelo percurso planeado'}
            </Text>
          </View>
        </Animated.View>

        {/* Origin to Destination Breadcrumb */}
        <View style={styles.endpointRow}>
          <Text style={styles.endpointText} numberOfLines={1}>
            <Text style={{ color: '#383139' }}>De: {originName}</Text> ➔{' '}
            <Text style={{ color: '#383139' }}>Para: {destinationName}</Text>
          </Text>
        </View>
      </Animated.View>

      {/* BOTTOM SIMULATION CONTROLLER PILL */}
      <Animated.View
        style={[
          styles.bottomControlsContainer,
          {
            transform: [{ translateY: bottomAnim }],
          },
        ]}
      >
        {/* Previous Button */}
        <TouchableOpacity
          style={[styles.controlBtn, isFirstStep && styles.controlBtnDisabled]}
          disabled={isFirstStep}
          onPress={() => {
            Haptics.impactAsync(ImpactFeedbackStyle.Light);
            onPrevStep();
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={isFirstStep ? '#7D7582' : '#383139'}
          />
          <Text style={[styles.controlBtnText, isFirstStep && styles.controlBtnTextDisabled]}>
            Anterior
          </Text>
        </TouchableOpacity>

        {/* Auto-Play / Pause Button (Prominent Center) */}
        <TouchableOpacity
          style={[styles.playBtn, isPlaying && styles.playBtnActive]}
          onPress={() => {
            Haptics.impactAsync(ImpactFeedbackStyle.Medium);
            onTogglePlay();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color="#383139"
          />
          <Text style={styles.playBtnText}>
            {isPlaying ? 'Pausa' : 'Auto'}
          </Text>
        </TouchableOpacity>

        {/* Next / Finish Button */}
        <TouchableOpacity
          style={[
            styles.controlBtn,
            isLastStep ? styles.finishBtn : null,
          ]}
          onPress={() => {
            Haptics.impactAsync(ImpactFeedbackStyle.Light);
            if (isLastStep) {
              onExit();
            } else {
              onNextStep();
            }
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.controlBtnText,
              isLastStep && { color: '#383139', fontWeight: '700' },
            ]}
          >
            {isLastStep ? 'Concluir' : 'Próximo'}
          </Text>
          <Ionicons
            name={isLastStep ? 'checkmark' : 'chevron-forward'}
            size={18}
            color="#383139"
          />
        </TouchableOpacity>

        {/* List of Steps Toggle */}
        <TouchableOpacity
          style={styles.listToggleBtn}
          onPress={() => {
            Haptics.impactAsync(ImpactFeedbackStyle.Light);
            setShowStepList(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={18} color="#383139" />
        </TouchableOpacity>
      </Animated.View>

      {/* MODAL / SHEET: FULL STEP-BY-STEP LIST */}
      <Modal
        visible={showStepList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStepList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Itinerário da Simulação</Text>
                <Text style={styles.modalSubtitle}>
                  {totalSteps} passos · {route.formattedDistance || `${route.distanceMeters}m`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowStepList(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#383139" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.stepListScroll} showsVerticalScrollIndicator={false}>
              {steps.map((st, idx) => {
                const isCurrent = idx === currentStepIndex;
                return (
                  <TouchableOpacity
                    key={`step-${idx}`}
                    style={[styles.stepItemRow, isCurrent && styles.stepItemRowActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onSelectStep(idx);
                      setShowStepList(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.stepNumCircle, isCurrent && styles.stepNumCircleActive]}>
                      <Text style={[styles.stepNumText, isCurrent && styles.stepNumTextActive]}>
                        {idx + 1}
                      </Text>
                    </View>

                    <View style={styles.stepItemInfo}>
                      <Text
                        style={[styles.stepItemInstruction, isCurrent && styles.stepItemInstructionActive]}
                        numberOfLines={2}
                      >
                        {st.instruction}
                      </Text>
                      <Text style={styles.stepItemDistance}>
                        {st.distanceMeters > 0 ? formatDistance(st.distanceMeters) : 'Destino final'}
                        {st.streetName ? ` • ${st.streetName}` : ''}
                      </Text>
                    </View>

                    {isCurrent && (
                      <Ionicons name="radio-button-on" size={18} color="#383139" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  topBannerContainer: {
    position: 'absolute',
    top: 52,
    left: 14,
    right: 14,
    backgroundColor: '#fffdf7',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 1000,
    overflow: 'hidden',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#ded0f9',
    width: '100%',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#f6a3ca',
  },
  topBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
  },
  simTransferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9e7a8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 4,
  },
  simTransferBannerText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.2,
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ded0f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 5,
  },
  simBadgeText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '800',
  },
  stepCounterBadge: {
    backgroundColor: '#c5e5fb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stepCounterText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '800',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  exitBtnText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fffdf7',
  },
  maneuverIconBox: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextBox: {
    flex: 1,
  },
  stepDistanceText: {
    color: '#48404b',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  stepInstructionText: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  endpointRow: {
    backgroundColor: '#fffdf7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#ffffff',
  },
  endpointText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '700',
  },

  // Bottom Controls
  bottomControlsContainer: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffdf7',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 1000,
    gap: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    gap: 4,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  controlBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '800',
  },
  controlBtnTextDisabled: {
    color: '#7D7582',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6a3ca',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  playBtnActive: {
    backgroundColor: '#f9e7a8',
  },
  playBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '800',
  },
  finishBtn: {
    backgroundColor: '#c0efdc',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  listToggleBtn: {
    padding: 8,
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

  // Modal Step List Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '75%',
    borderTopWidth: 2,
    borderTopColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#383139',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#48404b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stepListScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 8,
    backgroundColor: '#fffdf7',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  stepItemRowActive: {
    backgroundColor: '#ded0f9',
    borderColor: '#ffffff',
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    borderWidth: 1,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumCircleActive: {
    backgroundColor: '#f6a3ca',
  },
  stepNumText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
  },
  stepNumTextActive: {
    color: '#383139',
  },
  stepItemInfo: {
    flex: 1,
  },
  stepItemInstruction: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  stepItemInstructionActive: {
    color: '#383139',
  },
  stepItemDistance: {
    color: '#48404b',
    fontSize: 11,
    marginTop: 2,
  },
});
