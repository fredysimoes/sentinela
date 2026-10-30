import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { CpStation } from '../services/cpStationsService';
import { formatDistance } from '../utils/geo';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3BottomSheetWrapper, M3Pressable } from './M3MotionWrapper';

interface CpStationDetailSheetProps {
  station: CpStation | null;
  onClose: () => void;
  onNavigateToStation?: (station: CpStation) => void;
}

export const CpStationDetailSheet: React.FC<CpStationDetailSheetProps> = ({
  station,
  onClose,
  onNavigateToStation,
}) => {
  if (!station) return null;

  const formattedDist =
    typeof station.distanceMeters === 'number'
      ? formatDistance(station.distanceMeters)
      : null;

  return (
    <M3BottomSheetWrapper visible={Boolean(station)} onClose={onClose}>
      <View style={styles.sheetContent}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="train" size={26} color="#FFFFFF" />
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.badgeRow}>
              <View style={styles.stationBadge}>
                <Text style={styles.stationBadgeText}>
                  {station.isApeadeiro ? 'APEADEIRO CP' : 'ESTAÇÃO FERROVIÁRIA CP'}
                </Text>
              </View>
              {formattedDist && (
                <Text style={styles.distanceText}>a {formattedDist}</Text>
              )}
            </View>

            <Text style={styles.stationName} numberOfLines={2}>
              {station.name}
            </Text>
            <Text style={styles.stationSub}>
              Rede Ferroviária Nacional · CP Comboios de Portugal
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Services & Connections */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="train-car" size={18} color="#059669" />
            <Text style={styles.infoTitle}>Serviços Disponíveis</Text>
          </View>
          <Text style={styles.infoDesc}>
            Paragem servida por comboios de passageiros da CP (Urbanos, Regionais e Longo Curso consoante a linha).
          </Text>
          {station.code && (
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>Código da Estação:</Text>
              <Text style={styles.codeValue}>{station.code}</Text>
            </View>
          )}
        </View>

        {/* Navigation Action Buttons */}
        <View style={styles.actionsRow}>
          {onNavigateToStation && (
            <M3Pressable
              style={styles.navigateBtn}
              scaleOnPress={0.97}
              onPress={() => {
                onNavigateToStation(station);
                onClose();
              }}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text style={styles.navigateBtnText}>Trajeto até à Estação</Text>
            </M3Pressable>
          )}

          <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
            <Text style={styles.dismissBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#34D399',
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stationBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.4)',
  },
  stationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.8,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stationName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  stationSub: {
    fontSize: 12,
    color: '#64748B',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  codeValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    fontFamily: 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navigateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  navigateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
