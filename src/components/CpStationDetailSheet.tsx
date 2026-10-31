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
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  handleBar: {
    width: 48,
    height: 4,
    borderRadius: 0,
    backgroundColor: '#000000',
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
    borderRadius: 0,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000000',
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
    backgroundColor: '#ffff00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  stationBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  stationName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  stationSub: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    padding: 14,
    borderWidth: 3,
    borderColor: '#000000',
    marginBottom: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  infoDesc: {
    fontSize: 12,
    color: '#000000',
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
    color: '#000000',
    fontWeight: '600',
  },
  codeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
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
    backgroundColor: '#ff0000',
    paddingVertical: 14,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  navigateBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
  },
});
