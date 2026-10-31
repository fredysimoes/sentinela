import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import Haptics from '../utils/haptics';

interface ProtestHUDProps {
  onOpenTorch: () => void;
  onOpenStrobe: () => void;
  onOpenReportPolice: () => void;
  onOpenRights: () => void;
  onExitProtestMode: () => void;
}

export const ProtestHUD: React.FC<ProtestHUDProps> = ({
  onOpenTorch,
  onOpenStrobe,
  onOpenReportPolice,
  onOpenRights,
  onExitProtestMode,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Banner Tag */}
      <View style={styles.topTagRow}>
        <View style={styles.protestBadge}>
          <Ionicons name="flag" size={14} color="#383139" />
          <Text style={styles.protestBadgeText}>MODO PROTESTO ATIVO</Text>
        </View>

        <TouchableOpacity
          style={styles.exitBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onExitProtestMode();
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="exit-outline" size={14} color="#383139" />
          <Text style={styles.exitBtnText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons Scroll / Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsRow}
      >
        {/* Flashlight button */}
        <TouchableOpacity
          style={[styles.actionChip, styles.torchChip]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onOpenTorch();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="flashlight" size={16} color="#383139" />
          <Text style={styles.torchChipText}>Lanterna</Text>
        </TouchableOpacity>

        {/* Strobe Beacon button */}
        <TouchableOpacity
          style={[styles.actionChip, styles.strobeChip]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onOpenStrobe();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="flash" size={16} color="#383139" />
          <Text style={styles.strobeChipText}>Strobe Piscar</Text>
        </TouchableOpacity>

        {/* Report Police Presence button */}
        <TouchableOpacity
          style={[styles.actionChip, styles.policeChip]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onOpenReportPolice();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="shield" size={16} color="#383139" />
          <Text style={styles.policeChipText}>Sinalizar Polícia</Text>
        </TouchableOpacity>

        {/* Legal Rights in Manifestations button */}
        <TouchableOpacity
          style={[styles.actionChip, styles.rightsChip]}
          onPress={() => {
            Haptics.selectionAsync();
            onOpenRights();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="book" size={16} color="#383139" />
          <Text style={styles.rightsChipText}>Direitos Legais</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fffdf7',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginHorizontal: 14,
    marginTop: 6,
    padding: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  topTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  protestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9e7a8',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  protestBadgeText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exitBtnText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  torchChip: {
    backgroundColor: '#ffffff',
  },
  torchChipText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  strobeChip: {
    backgroundColor: '#f9e7a8',
  },
  strobeChipText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  policeChip: {
    backgroundColor: '#c5e5fb',
  },
  policeChipText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  rightsChip: {
    backgroundColor: '#ded0f9',
  },
  rightsChipText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
