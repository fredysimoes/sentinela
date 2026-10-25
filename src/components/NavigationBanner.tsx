import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationState } from '../types/navigation';
import { formatDistance } from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';

interface NavigationBannerProps {
  navState: NavigationState;
  onExit: () => void;
}

export const NavigationBanner: React.FC<NavigationBannerProps> = ({
  navState,
  onExit,
}) => {
  const currentStep = navState.route.steps[navState.currentStepIndex] || navState.route.steps[0];

  const getManeuverIcon = (modifier?: string, type?: string) => {
    if (type === 'arrive') return 'flag';
    if (modifier?.includes('left')) return 'arrow-undo';
    if (modifier?.includes('right')) return 'arrow-redo';
    return 'arrow-up';
  };

  const isSafe = navState.route.isSafe;

  return (
    <View style={styles.container}>
      {/* Top status indicator */}
      <View style={[styles.statusTag, isSafe ? styles.statusSafe : styles.statusWarning]}>
        <Ionicons
          name={isSafe ? 'shield-checkmark' : 'warning'}
          size={14}
          color="#FFFFFF"
        />
        <Text style={styles.statusTagText}>
          {isSafe
            ? `ROTA SEGURA · ${navState.route.hazardsAvoided.length > 0 ? `Evita ${navState.route.hazardsAvoided.length} perigo(s)` : '0 Ocorrências'}`
            : 'ROTA DIRETA · Cuidado com ocorrências'}
        </Text>
      </View>

      {/* Main instruction row */}
      <View style={styles.mainRow}>
        <View style={[styles.turnIconWrap, isSafe ? styles.turnIconSafe : styles.turnIconWarn]}>
          <Ionicons
            name={getManeuverIcon(currentStep?.maneuverModifier, currentStep?.maneuverType) as any}
            size={24}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.instructionWrap}>
          <Text style={styles.nextDistText}>
            A {formatDistance(currentStep?.distanceMeters || navState.distanceRemainingMeters)}
          </Text>
          <Text style={styles.instructionText} numberOfLines={2}>
            {currentStep?.instruction || 'Siga o percurso marcado no mapa'}
          </Text>
        </View>

        <TouchableOpacity onPress={onExit} style={styles.exitBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom ETA bar */}
      <View style={styles.etaBar}>
        <View style={styles.etaItem}>
          <Ionicons
            name={navState.mode === 'driving' ? 'car-sport' : 'walk'}
            size={15}
            color="#38BDF8"
          />
          <Text style={styles.etaTime}>
            {navState.route.formattedDuration || `${navState.timeRemainingMinutes} min`}
          </Text>
          <Text style={styles.etaDist}>
            ({navState.route.formattedDistance || formatDistance(navState.distanceRemainingMeters)})
          </Text>
          {navState.route.estimatedArrival && (
            <Text style={styles.etaArrival}>• Chegada {navState.route.estimatedArrival}</Text>
          )}
        </View>

        <Text style={styles.destText} numberOfLines={1}>
          {navState.destinationName}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 14,
    right: 14,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.extraLarge,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    ...M3Elevation.level4,
    zIndex: 999,
    overflow: 'hidden',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusSafe: {
    backgroundColor: '#0F5132',
  },
  statusWarning: {
    backgroundColor: '#654100',
  },
  statusTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  turnIconWrap: {
    width: 46,
    height: 46,
    borderRadius: M3Shapes.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnIconSafe: {
    backgroundColor: '#15803D',
  },
  turnIconWarn: {
    backgroundColor: '#B45309',
  },
  instructionWrap: {
    flex: 1,
  },
  nextDistText: {
    fontSize: 12,
    color: M3Colors.primary,
    fontWeight: '700',
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '700',
    color: M3Colors.onSurface,
    marginTop: 2,
    lineHeight: 20,
  },
  exitBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: M3Colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaTime: {
    fontSize: 14,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  etaDist: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
  },
  etaArrival: {
    fontSize: 11,
    color: M3Colors.success,
    fontWeight: '700',
  },
  destText: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    fontWeight: '500',
    maxWidth: '55%',
  },
});
