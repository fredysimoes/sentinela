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
import { M3BottomSheetWrapper, M3Pressable } from './M3MotionWrapper';

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
        {/* Handle bar */}
        <View style={styles.handleBar} />

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
          <M3Pressable
            style={styles.navigateBtn}
            onPress={() => onNavigateToStation(station)}
          >
            <Ionicons name="navigate" size={18} color="#FFFFFF" />
            <Text style={styles.navigateBtnText}>Navegar até à Estação</Text>
          </M3Pressable>
        )}
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
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    marginRight: 8,
  },
  stationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  distanceText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  stationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  stationSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  linesSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#94A3B8',
    marginBottom: 10,
  },
  linesChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navigateBtn: {
    marginTop: 20,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
