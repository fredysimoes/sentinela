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
              <View style={[styles.stationBadge, { borderColor: primaryColor }]}>
                <Text style={[styles.stationBadgeText, { color: primaryColor }]}>
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
              const color = METRO_LINE_COLORS[line] || '#0284C7';
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
            icon={<Ionicons name="navigate" size={18} color="#06140E" />}
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
    backgroundColor: '#000000',
    borderRadius: 0,
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
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 3,
    borderColor: '#000000',
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffff00',
    marginRight: 8,
  },
  stationBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#000000',
  },
  distanceText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  stationName: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  stationSub: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
    marginTop: 2,
  },
  linesSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 3,
    borderTopColor: '#000000',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#000000',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  linesChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  navigateBtn: {
    marginTop: 20,
    backgroundColor: '#ff0000',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
