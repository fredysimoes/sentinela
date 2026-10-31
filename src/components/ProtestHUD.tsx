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
          <Ionicons name="flag" size={14} color="#EF4444" />
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
          <Ionicons name="exit-outline" size={14} color="#EF4444" />
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
          <Ionicons name="flashlight" size={16} color="#0F172A" />
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
          <Ionicons name="flash" size={16} color="#0F172A" />
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
          <Ionicons name="shield" size={16} color="#FFFFFF" />
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
          <Ionicons name="book" size={16} color="#FFFFFF" />
          <Text style={styles.rightsChipText}>Direitos Legais</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f4ee',
    borderRadius: 0,
    borderWidth: 4,
    borderColor: '#000000',
    marginHorizontal: 14,
    marginTop: 6,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
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
    backgroundColor: '#ff0000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  protestBadgeText: {
    color: '#ffffff',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  exitBtnText: {
    color: '#000000',
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
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 2.5,
    borderColor: '#000000',
  },
  torchChip: {
    backgroundColor: '#ffffff',
  },
  torchChipText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  strobeChip: {
    backgroundColor: '#ffff00',
  },
  strobeChipText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  policeChip: {
    backgroundColor: '#0000ff',
  },
  policeChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  rightsChip: {
    backgroundColor: '#e8e8e8',
  },
  rightsChipText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
