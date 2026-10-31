import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { TransportMode } from '../types/navigation';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3BottomSheetWrapper, M3Button, M3DragHandle, M3Pressable } from './M3MotionWrapper';

interface QuickTransportModeModalProps {
  visible: boolean;
  destinationTitle: string; // 'Casa' | 'Trabalho'
  destinationAddress: string;
  initialMode: TransportMode;
  onClose: () => void;
  onSelectAndStart: (mode: TransportMode) => void;
}

export const QuickTransportModeModal: React.FC<QuickTransportModeModalProps> = ({
  visible,
  destinationTitle,
  destinationAddress,
  initialMode,
  onClose,
  onSelectAndStart,
}) => {
  const [selectedMode, setSelectedMode] = useState<TransportMode>(initialMode);

  useEffect(() => {
    if (visible) {
      setSelectedMode(initialMode);
    }
  }, [visible, initialMode]);

  const handleChooseMode = (mode: TransportMode) => {
    Haptics.selectionAsync();
    setSelectedMode(mode);
  };

  const handleStart = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    onSelectAndStart(selectedMode);
  };

  const isHome = destinationTitle.toLowerCase().includes('casa');

  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      <View style={styles.sheetContent}>
        {/* M3 Official Drag Handle */}
        <M3DragHandle />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={[styles.destIconCircle, isHome ? styles.homeIconBg : styles.workIconBg]}>
              <Ionicons
                name={isHome ? 'home' : 'briefcase'}
                size={22}
                color={isHome ? '#38BDF8' : '#F59E0B'}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Ir para {destinationTitle}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {destinationAddress}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.promptLabel}>Escolha o meio de transporte:</Text>

        {/* Mode Selector Cards */}
        <View style={styles.modesContainer}>
          {/* Walking */}
          <M3Pressable
            scaleOnPress={0.97}
            style={[
              styles.modeCard,
              selectedMode === 'walking' && styles.modeCardSelected,
            ]}
            onPress={() => handleChooseMode('walking')}
          >
            <View style={[styles.modeIconCircle, selectedMode === 'walking' && styles.modeIconCircleActive]}>
              <Ionicons
                name="walk"
                size={22}
                color={selectedMode === 'walking' ? '#10B981' : '#94A3B8'}
              />
            </View>
            <View style={styles.modeInfo}>
              <Text style={[styles.modeTitle, selectedMode === 'walking' && styles.modeTitleActive]}>
                A pé
              </Text>
              <Text style={styles.modeDesc}>Percurso pedonal protegido</Text>
            </View>
            <Ionicons
              name={selectedMode === 'walking' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedMode === 'walking' ? '#10B981' : '#475569'}
            />
          </M3Pressable>

          {/* Transit */}
          <M3Pressable
            scaleOnPress={0.97}
            style={[
              styles.modeCard,
              selectedMode === 'transit' && styles.modeCardSelectedTransit,
            ]}
            onPress={() => handleChooseMode('transit')}
          >
            <View style={[styles.modeIconCircle, selectedMode === 'transit' && styles.modeIconCircleTransitActive]}>
              <MaterialCommunityIcons
                name="bus-clock"
                size={22}
                color={selectedMode === 'transit' ? '#06B6D4' : '#94A3B8'}
              />
            </View>
            <View style={styles.modeInfo}>
              <Text style={[styles.modeTitle, selectedMode === 'transit' && styles.modeTitleTransitActive]}>
                Transportes
              </Text>
              <Text style={styles.modeDesc}>Metro, Autocarro ou Comboio</Text>
            </View>
            <Ionicons
              name={selectedMode === 'transit' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedMode === 'transit' ? '#06B6D4' : '#475569'}
            />
          </M3Pressable>

          {/* Driving */}
          <M3Pressable
            scaleOnPress={0.97}
            style={[
              styles.modeCard,
              selectedMode === 'driving' && styles.modeCardSelectedDriving,
            ]}
            onPress={() => handleChooseMode('driving')}
          >
            <View style={[styles.modeIconCircle, selectedMode === 'driving' && styles.modeIconCircleDrivingActive]}>
              <Ionicons
                name="car-sport"
                size={22}
                color={selectedMode === 'driving' ? '#38BDF8' : '#94A3B8'}
              />
            </View>
            <View style={styles.modeInfo}>
              <Text style={[styles.modeTitle, selectedMode === 'driving' && styles.modeTitleDrivingActive]}>
                De Carro
              </Text>
              <Text style={styles.modeDesc}>Trajeto viário em tempo real</Text>
            </View>
            <Ionicons
              name={selectedMode === 'driving' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selectedMode === 'driving' ? '#38BDF8' : '#475569'}
            />
          </M3Pressable>
        </View>

        {/* Start Button */}
        <M3Button
          title="Iniciar Percurso"
          variant="filled"
          icon={<Ionicons name="navigate" size={18} color="#06140E" />}
          style={styles.startBtn}
          onPress={handleStart}
        />
      </View>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  destIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homeIconBg: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  workIconBg: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  promptLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modesContainer: {
    gap: 10,
    marginBottom: 20,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  modeCardSelectedTransit: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  modeCardSelectedDriving: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  modeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modeIconCircleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
  },
  modeIconCircleTransitActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
  },
  modeIconCircleDrivingActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  modeTitleActive: {
    color: '#10B981',
  },
  modeTitleTransitActive: {
    color: '#06B6D4',
  },
  modeTitleDrivingActive: {
    color: '#38BDF8',
  },
  modeDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
