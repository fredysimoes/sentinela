import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationState } from '../types/navigation';
import { formatDistance } from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation, M3Typography, M3Motion } from '../theme/m3';

interface NavigationBannerProps {
  navState: NavigationState;
  onExit: () => void;
}

export const NavigationBanner: React.FC<NavigationBannerProps> = ({
  navState,
  onExit,
}) => {
  const currentStep = navState.route.steps[navState.currentStepIndex] || navState.route.steps[0];

  // Material Motion: Entry animation (translateY + opacity)
  const translateY = useRef(new Animated.Value(-60)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // Material Motion: Step change Shared Axis X transition
  const stepAnim = useRef(new Animated.Value(1)).current;
  const prevStepRef = useRef(navState.currentStepIndex);

  useEffect(() => {
    // Banner entry
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: M3Motion.durations.long1,
        easing: M3Motion.easings.emphasizedDecelerate,
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: M3Motion.durations.medium2,
        easing: M3Motion.easings.emphasizedDecelerate,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (prevStepRef.current !== navState.currentStepIndex) {
      prevStepRef.current = navState.currentStepIndex;
      // Animate step transition using Material Design Fade Through / Shared Axis
      stepAnim.setValue(0);
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: M3Motion.durations.medium1,
        easing: M3Motion.easings.standardDecelerate,
        useNativeDriver: true,
      }).start();
    }
  }, [navState.currentStepIndex]);

  const isTransit = navState.mode === 'transit';
  const isTransitStep = !!currentStep?.transitInfo || currentStep?.maneuverType === 'transit';
  const tInfo = currentStep?.transitInfo;

  const getManeuverIcon = (modifier?: string, type?: string) => {
    if (type === 'arrive') return 'flag';
    if (modifier?.includes('left')) return 'arrow-undo';
    if (modifier?.includes('right')) return 'arrow-redo';
    return 'arrow-up';
  };

  const getTransitIcon = (vType?: string) => {
    if (vType === 'subway') return 'subway';
    if (vType === 'train') return 'train';
    if (vType === 'tram') return 'tram';
    return 'bus';
  };

  const isSafe = navState.route.isSafe;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: bannerOpacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Top status indicator */}
      <View
        style={[
          styles.statusTag,
          isTransit
            ? styles.statusTransit
            : isSafe
            ? styles.statusSafe
            : styles.statusWarning,
        ]}
      >
        {isTransit ? (
          <MaterialCommunityIcons name="bus" size={14} color="#FFFFFF" />
        ) : (
          <Ionicons
            name={isSafe ? 'shield-checkmark' : 'warning'}
            size={14}
            color="#FFFFFF"
          />
        )}
        <Text style={styles.statusTagText}>
          {isTransit
            ? tInfo?.lineShortName
              ? `TRANSPORTES · LINHA ${tInfo.lineShortName}`
              : 'TRANSPORTES PÚBLICOS EM CURSO'
            : isSafe
            ? navState.route.name.includes('Acessível')
              ? `ROTA ACESSÍVEL · ${navState.route.hazardsAvoided.length > 0 ? `Contorna ${navState.route.hazardsAvoided.length} barreira(s)` : 'Sem Degraus / Desimpedida'}`
              : `ROTA SEGURA · ${navState.route.hazardsAvoided.length > 0 ? `Evita ${navState.route.hazardsAvoided.length} perigo(s)` : '0 Ocorrências'}`
            : navState.route.name.includes('Barreiras') || navState.route.name.includes('Acessível')
            ? 'ROTA COM BARREIRAS · Atenção a degraus'
            : 'ROTA DIRETA · Cuidado com ocorrências'}
        </Text>
      </View>

      {/* Transfer Alert Banner if step involves vehicle/line exchange */}
      {currentStep?.isTransfer && (
        <View style={styles.transferAlertBanner}>
          <Ionicons name="swap-horizontal" size={15} color="#0F172A" />
          <Text style={styles.transferAlertBannerText} numberOfLines={1}>
            {currentStep.transferInstruction || 'TRANSBORDO: Troca de veículo recomendada'}
          </Text>
        </View>
      )}

      {/* Main instruction row with animated transition */}
      <Animated.View
        style={[
          styles.mainRow,
          {
            opacity: stepAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
            transform: [
              {
                translateX: stepAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.turnIconWrap,
            isTransitStep
              ? [styles.turnIconTransit, tInfo?.color ? { backgroundColor: tInfo.color } : null]
              : isSafe
              ? styles.turnIconSafe
              : styles.turnIconWarn,
          ]}
        >
          {isTransitStep ? (
            <MaterialCommunityIcons
              name={getTransitIcon(tInfo?.vehicleType) as any}
              size={24}
              color={tInfo?.textColor || '#FFFFFF'}
            />
          ) : (
            <Ionicons
              name={getManeuverIcon(currentStep?.maneuverModifier, currentStep?.maneuverType) as any}
              size={24}
              color="#FFFFFF"
            />
          )}
        </View>

        <View style={styles.instructionWrap}>
          <Text style={styles.nextDistText}>
            A {formatDistance(currentStep?.distanceMeters || navState.distanceRemainingMeters)}
            {currentStep?.durationSeconds
              ? ` • ~${Math.max(1, Math.round(currentStep.durationSeconds / 60))} min`
              : ''}
          </Text>
          <Text style={styles.instructionText} numberOfLines={2}>
            {currentStep?.instruction || 'Siga o percurso marcado no mapa'}
          </Text>
        </View>

        <TouchableOpacity onPress={onExit} style={styles.exitBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom ETA bar */}
      <View style={styles.etaBar}>
        <View style={styles.etaItem}>
          <Ionicons
            name={navState.mode === 'driving' ? 'car-sport' : navState.mode === 'transit' ? 'bus' : 'walk'}
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 14,
    right: 14,
    backgroundColor: '#f5f4ee',
    borderRadius: 0,
    borderWidth: 4,
    borderColor: '#000000',
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
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  statusSafe: {
    backgroundColor: '#0000ff',
  },
  statusTransit: {
    backgroundColor: '#0000ff',
  },
  statusWarning: {
    backgroundColor: '#ffff00',
  },
  statusTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  transferAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffff00',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  transferAlertBannerText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: '#f5f4ee',
  },
  turnIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 0,
    borderWidth: 2.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnIconSafe: {
    backgroundColor: '#ffff00',
  },
  turnIconWarn: {
    backgroundColor: '#ff0000',
  },
  turnIconTransit: {
    backgroundColor: '#0000ff',
  },
  instructionWrap: {
    flex: 1,
  },
  nextDistText: {
    fontSize: 12,
    color: '#ff0000',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
    lineHeight: 20,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 2.5,
    borderTopColor: '#000000',
  },
  etaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaTime: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  etaDist: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  etaArrival: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '900',
  },
  destText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
    maxWidth: '55%',
  },
});
