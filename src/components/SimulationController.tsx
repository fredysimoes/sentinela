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
            <Ionicons name="game-controller" size={13} color="#38BDF8" />
            <Text style={styles.simBadgeText}>MODO SIMULAÇÃO</Text>
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
            <Ionicons name="close" size={18} color="#94A3B8" />
            <Text style={styles.exitBtnText}>Sair</Text>
          </TouchableOpacity>
        </View>

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
              color="#38BDF8"
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
            <Text style={{ color: '#38BDF8' }}>A: {originName}</Text> ➔{' '}
            <Text style={{ color: '#10B981' }}>B: {destinationName}</Text>
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
            size={22}
            color={isFirstStep ? '#475569' : '#F1F5F9'}
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
            size={20}
            color="#FFFFFF"
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
              isLastStep && { color: '#10B981', fontWeight: '700' },
            ]}
          >
            {isLastStep ? 'Concluir' : 'Próximo'}
          </Text>
          <Ionicons
            name={isLastStep ? 'checkmark' : 'chevron-forward'}
            size={20}
            color={isLastStep ? '#10B981' : '#F1F5F9'}
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
          <Ionicons name="list" size={18} color="#94A3B8" />
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
                <Ionicons name="close" size={20} color="#94A3B8" />
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
                      <Ionicons name="radio-button-on" size={18} color="#38BDF8" />
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
    backgroundColor: '#1E222A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D323F',
    ...M3Elevation.level4,
    zIndex: 1000,
    overflow: 'hidden',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#0F172A',
    width: '100%',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#38BDF8',
  },
  topBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  simBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepCounterBadge: {
    backgroundColor: '#262B36',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stepCounterText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  exitBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  maneuverIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#282E3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextBox: {
    flex: 1,
  },
  stepDistanceText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepInstructionText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  endpointRow: {
    backgroundColor: '#171A21',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#262B36',
  },
  endpointText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
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
    backgroundColor: '#1E222A',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2D323F',
    ...M3Elevation.level4,
    zIndex: 1000,
    gap: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#282E3C',
    gap: 4,
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  controlBtnText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  controlBtnTextDisabled: {
    color: '#64748B',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 6,
    ...M3Elevation.level2,
  },
  playBtnActive: {
    backgroundColor: '#EA580C',
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  finishBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  listToggleBtn: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#282E3C',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Step List Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1E222A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderTopColor: '#2D323F',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D323F',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#282E3C',
  },
  stepListScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#171A21',
    gap: 12,
  },
  stepItemRowActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#282E3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumCircleActive: {
    backgroundColor: '#0284C7',
  },
  stepNumText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  stepNumTextActive: {
    color: '#FFFFFF',
  },
  stepItemInfo: {
    flex: 1,
  },
  stepItemInstruction: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  stepItemInstructionActive: {
    color: '#38BDF8',
  },
  stepItemDistance: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
});
