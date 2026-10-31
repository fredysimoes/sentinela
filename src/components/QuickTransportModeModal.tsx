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
              color={selectedMode === 'walking' ? '#383139' : '#7D7582'}
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
                color="#383139"
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
              color={selectedMode === 'transit' ? '#383139' : '#7D7582'}
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
                color="#383139"
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
              color={selectedMode === 'driving' ? '#383139' : '#7D7582'}
            />
          </M3Pressable>
        </View>

        {/* Start Button */}
        <M3Button
          title="Iniciar Percurso"
          variant="filled"
          icon={<Ionicons name="navigate" size={18} color="#383139" />}
          style={styles.startBtn}
          onPress={handleStart}
        />
      </View>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: '#fffdf7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
    paddingBottom: 12,
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
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homeIconBg: {
    backgroundColor: '#f9e7a8',
  },
  workIconBg: {
    backgroundColor: '#ded0f9',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#383139',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#48404b',
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  promptLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#383139',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  modesContainer: {
    gap: 10,
    marginBottom: 20,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 24,
    padding: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  modeCardSelected: {
    borderColor: '#ffffff',
    backgroundColor: '#c0efdc',
  },
  modeCardSelectedTransit: {
    borderColor: '#ffffff',
    backgroundColor: '#ded0f9',
  },
  modeCardSelectedDriving: {
    borderColor: '#ffffff',
    backgroundColor: '#f9e7a8',
  },
  modeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modeIconCircleActive: {
    backgroundColor: '#fffdf7',
  },
  modeIconCircleTransitActive: {
    backgroundColor: '#fffdf7',
  },
  modeIconCircleDrivingActive: {
    backgroundColor: '#fffdf7',
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#383139',
  },
  modeTitleActive: {
    color: '#383139',
  },
  modeTitleTransitActive: {
    color: '#383139',
  },
  modeTitleDrivingActive: {
    color: '#383139',
  },
  modeDesc: {
    fontSize: 12,
    color: '#48404b',
    fontWeight: '500',
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
