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
import { M3BottomSheetWrapper, M3Button, M3DragHandle, M3Pressable } from './M3MotionWrapper';

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
        {/* M3 Official Drag handle */}
        <M3DragHandle />

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
            <Ionicons name="close" size={20} color="#383139" />
          </TouchableOpacity>
        </View>

        {/* Services & Connections */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="train-car" size={18} color="#383139" />
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
              <Ionicons name="navigate" size={18} color="#383139" />
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
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
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
    borderRadius: 999,
    backgroundColor: '#c0efdc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#ded0f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#383139',
    letterSpacing: 0.3,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#48404b',
  },
  stationName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#383139',
    marginBottom: 2,
  },
  stationSub: {
    fontSize: 12,
    color: '#48404b',
    fontWeight: '500',
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
  infoCard: {
    backgroundColor: '#fffdf7',
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginBottom: 18,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#383139',
  },
  infoDesc: {
    fontSize: 12,
    color: '#48404b',
    lineHeight: 17,
    marginBottom: 8,
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontSize: 11,
    color: '#48404b',
    fontWeight: '600',
  },
  codeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#383139',
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
    backgroundColor: '#f6a3ca',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  navigateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#383139',
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#383139',
  },
});
