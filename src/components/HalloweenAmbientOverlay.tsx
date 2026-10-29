import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Seasonal Halloween Feature Flag
 * Para desativar ou remover esta funcionalidade depois do Halloween:
 * Basta alterar HALLOWEEN_FEATURE_ACTIVE para false, ou remover este ficheiro
 * e a respetiva linha de importação no App.tsx.
 */
export const HALLOWEEN_FEATURE_ACTIVE = true;

interface HalloweenAmbientOverlayProps {
  enabled?: boolean;
}

export const HalloweenAmbientOverlay: React.FC<HalloweenAmbientOverlayProps> = ({
  enabled = true,
}) => {
  if (!HALLOWEEN_FEATURE_ACTIVE || !enabled) {
    return null;
  }

  // -------------------------------------------------------------
  // 1. Ghost 1 (Wandering Drifter: Floating diagonally with sine bob)
  // -------------------------------------------------------------
  const ghost1Progress = useRef(new Animated.Value(0)).current;
  const ghost1Bob = useRef(new Animated.Value(0)).current;
  const ghost1Opacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 2. Ghost 2 (Gentle Roamer: Drifting from right to left)
  // -------------------------------------------------------------
  const ghost2Progress = useRef(new Animated.Value(0)).current;
  const ghost2Bob = useRef(new Animated.Value(0)).current;
  const ghost2Opacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 3. Bat Swoop (Periodic fast flight across upper sky)
  // -------------------------------------------------------------
  const batProgress = useRef(new Animated.Value(0)).current;
  const batFlap = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 4. Spider (Subtle descent from top edge and retraction)
  // -------------------------------------------------------------
  const spiderDrop = useRef(new Animated.Value(0)).current;
  const spiderSwing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ghost 1 Animation Loop
    const ghost1Anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ghost1Progress, {
            toValue: 1,
            duration: 16000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ghost1Opacity, {
              toValue: 0.55,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.delay(10500),
            Animated.timing(ghost1Opacity, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.delay(2000),
      ])
    );

    const ghost1BobAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(ghost1Bob, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ghost1Bob, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Ghost 2 Animation Loop (offset start and different trajectory)
    const ghost2Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(4500),
        Animated.parallel([
          Animated.timing(ghost2Progress, {
            toValue: 1,
            duration: 19000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ghost2Opacity, {
              toValue: 0.48,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.delay(12500),
            Animated.timing(ghost2Opacity, {
              toValue: 0,
              duration: 3500,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.delay(3000),
      ])
    );

    const ghost2BobAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(ghost2Bob, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ghost2Bob, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Bats Flutter Swoop Loop (Periodic cross-flight)
    const batAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(8000),
        Animated.timing(batProgress, {
          toValue: 1,
          duration: 4800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(batProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const batFlapAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(batFlap, {
          toValue: 1,
          duration: 180,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(batFlap, {
          toValue: 0,
          duration: 180,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    // Spider Descent & Climb Loop
    const spiderAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(12000),
        Animated.timing(spiderDrop, {
          toValue: 1,
          duration: 3200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(3500),
        Animated.timing(spiderDrop, {
          toValue: 0,
          duration: 2800,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(14000),
      ])
    );

    const spiderSwingAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(spiderSwing, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(spiderSwing, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    ghost1Anim.start();
    ghost1BobAnim.start();
    ghost2Anim.start();
    ghost2BobAnim.start();
    batAnim.start();
    batFlapAnim.start();
    spiderAnim.start();
    spiderSwingAnim.start();

    return () => {
      ghost1Anim.stop();
      ghost1BobAnim.stop();
      ghost2Anim.stop();
      ghost2BobAnim.stop();
      batAnim.stop();
      batFlapAnim.stop();
      spiderAnim.stop();
      spiderSwingAnim.stop();
    };
  }, []);

  // Ghost 1 Interpolations
  const ghost1TranslateX = ghost1Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, SCREEN_WIDTH + 40],
  });
  const ghost1TranslateY = ghost1Progress.interpolate({
    inputRange: [0, 0.4, 0.7, 1],
    outputRange: [SCREEN_HEIGHT * 0.58, SCREEN_HEIGHT * 0.42, SCREEN_HEIGHT * 0.48, SCREEN_HEIGHT * 0.32],
  });
  const ghost1BobY = ghost1Bob.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  // Ghost 2 Interpolations (Right to left roamer)
  const ghost2TranslateX = ghost2Progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH + 40, -40],
  });
  const ghost2TranslateY = ghost2Progress.interpolate({
    inputRange: [0, 0.35, 0.75, 1],
    outputRange: [SCREEN_HEIGHT * 0.68, SCREEN_HEIGHT * 0.60, SCREEN_HEIGHT * 0.52, SCREEN_HEIGHT * 0.44],
  });
  const ghost2BobY = ghost2Bob.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  // Bat Flock Interpolations
  const batTranslateX = batProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_WIDTH + 60],
  });
  const batTranslateY = batProgress.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [SCREEN_HEIGHT * 0.18, SCREEN_HEIGHT * 0.26, SCREEN_HEIGHT * 0.16, SCREEN_HEIGHT * 0.12],
  });
  const batOpacity = batProgress.interpolate({
    inputRange: [0, 0.08, 0.88, 1],
    outputRange: [0, 0.75, 0.75, 0],
  });
  const batRotate = batFlap.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '14deg'],
  });

  // Spider Interpolations
  const spiderTranslateY = spiderDrop.interpolate({
    inputRange: [0, 1],
    outputRange: [-70, 75],
  });
  const spiderRotation = spiderSwing.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {/* Ghost 1 */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: ghost1Opacity,
            transform: [
              { translateX: ghost1TranslateX },
              { translateY: ghost1TranslateY },
              { translateY: ghost1BobY },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="ghost"
          size={22}
          color="rgba(241, 245, 249, 0.62)"
          style={styles.ghostGlow}
        />
      </Animated.View>

      {/* Ghost 2 */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: ghost2Opacity,
            transform: [
              { translateX: ghost2TranslateX },
              { translateY: ghost2TranslateY },
              { translateY: ghost2BobY },
              { scaleX: -1 }, // faces left
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="ghost-outline"
          size={19}
          color="rgba(226, 232, 240, 0.55)"
          style={styles.ghostGlow}
        />
      </Animated.View>

      {/* Bat 1 (Leader) */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: batOpacity,
            transform: [
              { translateX: batTranslateX },
              { translateY: batTranslateY },
              { rotate: batRotate },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="bat"
          size={16}
          color="rgba(30, 41, 59, 0.78)"
        />
      </Animated.View>

      {/* Bat 2 (Trailing companion) */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: batOpacity,
            transform: [
              {
                translateX: Animated.add(batTranslateX, new Animated.Value(-18)),
              },
              {
                translateY: Animated.add(batTranslateY, new Animated.Value(14)),
              },
              { rotate: batRotate },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="bat"
          size={12}
          color="rgba(15, 23, 42, 0.68)"
        />
      </Animated.View>

      {/* Spider with Silk Thread (Upper Left Edge) */}
      <Animated.View
        style={[
          styles.spiderContainer,
          {
            transform: [
              { translateY: spiderTranslateY },
              { rotate: spiderRotation },
            ],
          },
        ]}
      >
        {/* Silk Thread */}
        <View style={styles.silkThread} />
        {/* Spider Icon */}
        <MaterialCommunityIcons
          name="spider"
          size={15}
          color="rgba(100, 116, 139, 0.75)"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    overflow: 'hidden',
  },
  particleItem: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ghostGlow: {
    textShadowColor: 'rgba(148, 163, 184, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  spiderContainer: {
    position: 'absolute',
    top: 80,
    right: 22,
    alignItems: 'center',
  },
  silkThread: {
    width: 1,
    height: 70,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
  },
});
