import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { MetroStation, METRO_LINE_COLORS, METRO_LINE_NAMES } from '../services/metroStationsService';
import { formatDistance } from '../utils/geo';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3BottomSheetWrapper, M3Button, M3DragHandle } from './M3MotionWrapper';

interface MetroStationDetailSheetProps {
  station: MetroStation | null;
  onClose: () => void;
  onNavigateToStation?: (station: MetroStation) => void;
}

export const MetroStationDetailSheet: React.FC<MetroStationDetailSheetProps> = ({
  station,
  onClose,
  onNavigateToStation,
}) => {
  if (!station) return null;

  const formattedDist =
    typeof station.distanceMeters === 'number'
      ? formatDistance(station.distanceMeters)
      : null;

  const primaryLine = station.lines[0] || 'D';
  const primaryColor = METRO_LINE_COLORS[primaryLine] || '#0284C7';

  return (
    <M3BottomSheetWrapper visible={Boolean(station)} onClose={onClose}>
      <View style={styles.sheetContent}>
        {/* M3 Official Drag handle */}
        <M3DragHandle />

        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: primaryColor }]}>
            <MaterialCommunityIcons name="subway-variant" size={26} color="#FFFFFF" />
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.badgeRow}>
              <View style={styles.stationBadge}>
                <Text style={styles.stationBadgeText}>
                  {station.isUnderground ? 'ESTAÇÃO SUBTERRÂNEA' : 'METRO DO PORTO'}
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
              Área Metropolitana do Porto
            </Text>
          </View>
        </View>

        {/* Linhas que servem esta estação */}
        <View style={styles.linesSection}>
          <Text style={styles.sectionTitle}>LINHAS QUE SERVEM ESTA ESTAÇÃO</Text>
          <View style={styles.linesChipsWrap}>
            {station.lines.map((line) => {
              const color = METRO_LINE_COLORS[line] || '#ded0f9';
              return (
                <View key={`line-chip-${line}`} style={[styles.lineBadge, { backgroundColor: color }]}>
                  <Text style={styles.lineBadgeText}>Linha {line}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Botão de Navegação por Transportes */}
        {onNavigateToStation && (
          <M3Button
            title="Navegar até à Estação"
            variant="filled"
            icon={<Ionicons name="navigate" size={18} color="#383139" />}
            style={styles.navigateBtn}
            onPress={() => onNavigateToStation(station)}
          />
        )}
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
    backgroundColor: '#ded0f9',
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ded0f9',
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
    marginBottom: 4,
  },
  stationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ded0f9',
    marginRight: 8,
  },
  stationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#383139',
  },
  distanceText: {
    fontSize: 12,
    color: '#48404b',
    fontWeight: '600',
  },
  stationName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#383139',
    letterSpacing: -0.3,
  },
  stationSub: {
    fontSize: 13,
    color: '#48404b',
    fontWeight: '500',
    marginTop: 2,
  },
  linesSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#383139',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  linesChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  lineBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navigateBtn: {
    marginTop: 20,
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  navigateBtnText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
