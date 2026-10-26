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
    backgroundColor: '#1E1414',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 20,
    marginHorizontal: 14,
    marginTop: 6,
    padding: 10,
    ...M3Elevation.level3,
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
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Shapes.full,
  },
  protestBadgeText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: M3Shapes.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  exitBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
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
    borderRadius: M3Shapes.full,
  },
  torchChip: {
    backgroundColor: '#F8FAFC',
  },
  torchChipText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  strobeChip: {
    backgroundColor: '#FACC15',
  },
  strobeChipText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  policeChip: {
    backgroundColor: '#2563EB',
  },
  policeChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rightsChip: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  rightsChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
