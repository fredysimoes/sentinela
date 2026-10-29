import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Easing,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Seasonal Halloween Feature Flag
 * Para desativar ou remover esta funcionalidade depois do Halloween:
 * Basta alterar HALLOWEEN_FEATURE_ACTIVE para false, ou apagar este ficheiro
 * e a respetiva linha de importação no App.tsx.
 */
export const HALLOWEEN_FEATURE_ACTIVE = true;

interface HalloweenAmbientOverlayProps {
  enabled?: boolean;
  isDaytime?: boolean;
}

export const HalloweenAmbientOverlay: React.FC<HalloweenAmbientOverlayProps> = ({
  enabled = true,
  isDaytime = false,
}) => {
  if (!HALLOWEEN_FEATURE_ACTIVE || !enabled) {
    return null;
  }

  const statusBarHeight = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 12;
  const searchBarTop = statusBarHeight + 6;
  const searchBarBottom = searchBarTop + 50;

  // -------------------------------------------------------------
  // 1. Ghost 1 ("O Errante": Diagonal S-curve across screen)
  // -------------------------------------------------------------
  const ghost1Progress = useRef(new Animated.Value(0)).current;
  const ghost1Bob = useRef(new Animated.Value(0)).current;
  const ghost1Opacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 2. Ghost 2 ("O Rasteiro": Street-level roamer right to left)
  // -------------------------------------------------------------
  const ghost2Progress = useRef(new Animated.Value(0)).current;
  const ghost2Sway = useRef(new Animated.Value(0)).current;
  const ghost2Opacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 3. Ghost 3 ("O Curioso": Floats to center, pauses, looks & floats up)
  // -------------------------------------------------------------
  const ghost3Progress = useRef(new Animated.Value(0)).current;
  const ghost3Tilt = useRef(new Animated.Value(0)).current;
  const ghost3Opacity = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 4. Bats Flock (Moonlit Silver with black outline for high contrast)
  // -------------------------------------------------------------
  const batProgress = useRef(new Animated.Value(0)).current;
  const batFlap = useRef(new Animated.Value(0)).current;
  const batLoneProgress = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 5. Spider 1 (Anchored to Search Bar with growing/shrinking silk line)
  // -------------------------------------------------------------
  const spiderDrop = useRef(new Animated.Value(0)).current;
  const spiderSwing = useRef(new Animated.Value(0)).current;

  // -------------------------------------------------------------
  // 6. Spider 2 (Small baby spider on left side near Filtros/Casa)
  // -------------------------------------------------------------
  const spider2Drop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ghost 1: Diagonal wanderer
    const ghost1Anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ghost1Progress, {
            toValue: 1,
            duration: 17000,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ghost1Opacity, {
              toValue: 0.62,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.delay(11500),
            Animated.timing(ghost1Opacity, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.delay(2500),
      ])
    );

    const ghost1BobAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(ghost1Bob, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ghost1Bob, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Ghost 2: Low-altitude street roamer from right to left
    const ghost2Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(5000),
        Animated.parallel([
          Animated.timing(ghost2Progress, {
            toValue: 1,
            duration: 21000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ghost2Opacity, {
              toValue: 0.52,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.delay(14000),
            Animated.timing(ghost2Opacity, {
              toValue: 0,
              duration: 4000,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.delay(4000),
      ])
    );

    const ghost2SwayAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(ghost2Sway, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ghost2Sway, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Ghost 3: Curious phantom (emerges, pauses, tilts head, ascends)
    const ghost3Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(10000),
        Animated.parallel([
          Animated.sequence([
            // Float to center
            Animated.timing(ghost3Progress, {
              toValue: 0.5,
              duration: 5500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            // Pause & look around
            Animated.delay(3500),
            // Float up into the sky
            Animated.timing(ghost3Progress, {
              toValue: 1,
              duration: 5000,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(ghost3Opacity, {
              toValue: 0.58,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.delay(9500),
            Animated.timing(ghost3Opacity, {
              toValue: 0,
              duration: 2500,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.delay(6000),
      ])
    );

    const ghost3TiltAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(ghost3Tilt, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ghost3Tilt, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Bats 1 & 2 Swoop (Upper third crossing)
    const batAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(7000),
        Animated.timing(batProgress, {
          toValue: 1,
          duration: 4400,
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
          duration: 160,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(batFlap, {
          toValue: 0,
          duration: 160,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    // Bat 3 (Lone roamer gliding across lower center every 22s)
    const batLoneAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(16000),
        Animated.timing(batLoneProgress, {
          toValue: 1,
          duration: 5600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(batLoneProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Spider 1: Dropping from Search Bar on extending silk thread
    const spiderAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(8000),
        // Descend smoothly
        Animated.timing(spiderDrop, {
          toValue: 1,
          duration: 3200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Dangle and hang
        Animated.delay(4000),
        // Climb back up to Search Bar
        Animated.timing(spiderDrop, {
          toValue: 0,
          duration: 2600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(12000),
      ])
    );

    const spiderSwingAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(spiderSwing, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(spiderSwing, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Spider 2 (Small baby spider near Casa/Filtros)
    const spider2Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(17000),
        Animated.timing(spider2Drop, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(spider2Drop, {
          toValue: 0,
          duration: 1900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(15000),
      ])
    );

    ghost1Anim.start();
    ghost1BobAnim.start();
    ghost2Anim.start();
    ghost2SwayAnim.start();
    ghost3Anim.start();
    ghost3TiltAnim.start();
    batAnim.start();
    batFlapAnim.start();
    batLoneAnim.start();
    spiderAnim.start();
    spiderSwingAnim.start();
    spider2Anim.start();

    return () => {
      ghost1Anim.stop();
      ghost1BobAnim.stop();
      ghost2Anim.stop();
      ghost2SwayAnim.stop();
      ghost3Anim.stop();
      ghost3TiltAnim.stop();
      batAnim.stop();
      batFlapAnim.stop();
      batLoneAnim.stop();
      spiderAnim.stop();
      spiderSwingAnim.stop();
      spider2Anim.stop();
    };
  }, []);

  // -------------------------------------------------------------
  // Interpolations
  // -------------------------------------------------------------
  // Ghost 1
  const ghost1TranslateX = ghost1Progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-40, SCREEN_WIDTH * 0.45, SCREEN_WIDTH + 40],
  });
  const ghost1TranslateY = ghost1Progress.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [SCREEN_HEIGHT * 0.62, SCREEN_HEIGHT * 0.46, SCREEN_HEIGHT * 0.50, SCREEN_HEIGHT * 0.32],
  });
  const ghost1BobY = ghost1Bob.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  // Ghost 2 (Street roamer right to left)
  const ghost2TranslateX = ghost2Progress.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [SCREEN_WIDTH + 40, SCREEN_WIDTH * 0.65, SCREEN_WIDTH * 0.28, -40],
  });
  const ghost2TranslateY = ghost2Progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [SCREEN_HEIGHT * 0.72, SCREEN_HEIGHT * 0.66, SCREEN_HEIGHT * 0.58],
  });
  const ghost2SwayY = ghost2Sway.interpolate({
    inputRange: [0, 1],
    outputRange: [-7, 7],
  });

  // Ghost 3 (Curious phantom)
  const ghost3TranslateX = ghost3Progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-30, SCREEN_WIDTH * 0.5 - 12, SCREEN_WIDTH * 0.65],
  });
  const ghost3TranslateY = ghost3Progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [SCREEN_HEIGHT * 0.52, SCREEN_HEIGHT * 0.38, SCREEN_HEIGHT * 0.14],
  });
  const ghost3TiltRot = ghost3Tilt.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '12deg'],
  });

  // Bats 1 & 2 (High-contrast Moonlit Silver)
  const batTranslateX = batProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_WIDTH + 60],
  });
  const batTranslateY = batProgress.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [SCREEN_HEIGHT * 0.16, SCREEN_HEIGHT * 0.24, SCREEN_HEIGHT * 0.15, SCREEN_HEIGHT * 0.10],
  });
  const batOpacity = batProgress.interpolate({
    inputRange: [0, 0.08, 0.88, 1],
    outputRange: [0, 0.88, 0.88, 0],
  });
  const batRotate = batFlap.interpolate({
    inputRange: [0, 1],
    outputRange: ['-14deg', '16deg'],
  });

  // Bat 3 (Lone mid-screen roamer)
  const bat3TranslateX = batLoneProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH + 40, -40],
  });
  const bat3TranslateY = batLoneProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [SCREEN_HEIGHT * 0.42, SCREEN_HEIGHT * 0.35, SCREEN_HEIGHT * 0.46],
  });
  const bat3Opacity = batLoneProgress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.85, 0.85, 0],
  });

  // Spider 1 (Fixed Silk Thread Anchor on Search Bar)
  // Max descent: 125px below search bar
  const SPIDER_MAX_DROP = 125;
  const spiderSilkScaleY = spiderDrop; // scales thread from 0 to 1
  const spiderTranslateY = spiderDrop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SPIDER_MAX_DROP],
  });
  const spiderRotation = spiderSwing.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg'],
  });

  // Spider 2 (Left side baby spider near Casa/Filtros)
  const spider2TranslateY = spider2Drop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 65],
  });

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {/* ========================================================= */}
      {/* DECORATIVE WEBS WRAPPED AROUND BUTTONS & CORNERS          */}
      {/* ========================================================= */}

      {/* Screen Top-Left Corner Web */}
      <View style={styles.screenCornerWebLeft}>
        <MaterialCommunityIcons
          name="spider-web"
          size={38}
          color={isDaytime ? 'rgba(71, 85, 105, 0.28)' : 'rgba(226, 232, 240, 0.28)'}
        />
      </View>

      {/* Screen Top-Right Corner Web */}
      <View style={styles.screenCornerWebRight}>
        <MaterialCommunityIcons
          name="spider-web"
          size={32}
          color={isDaytime ? 'rgba(71, 85, 105, 0.22)' : 'rgba(226, 232, 240, 0.22)'}
        />
      </View>

      {/* Web wrapped around the right edge of the Search Bar */}
      <View
        style={[
          styles.searchBarWrappedWeb,
          { top: searchBarTop - 2, right: 18 },
        ]}
      >
        <MaterialCommunityIcons
          name="spider-web"
          size={28}
          color={isDaytime ? 'rgba(71, 85, 105, 0.38)' : 'rgba(226, 232, 240, 0.45)'}
        />
      </View>

      {/* Web accent near Casa & Filtros column (Left) */}
      <View style={[styles.filtersWebAccent, { top: searchBarBottom + 6 }]}>
        <MaterialCommunityIcons
          name="spider-web"
          size={22}
          color={isDaytime ? 'rgba(71, 85, 105, 0.25)' : 'rgba(226, 232, 240, 0.32)'}
        />
      </View>

      {/* Web accent near Radar Button (Right) */}
      <View style={[styles.radarWebAccent, { top: searchBarBottom + 64 }]}>
        <MaterialCommunityIcons
          name="spider-web"
          size={22}
          color={isDaytime ? 'rgba(71, 85, 105, 0.25)' : 'rgba(226, 232, 240, 0.32)'}
        />
      </View>

      {/* ========================================================= */}
      {/* SPIDER 1: ANCHORED DIRECTLY TO SEARCH BAR                 */}
      {/* ========================================================= */}
      <View
        style={[
          styles.spiderAnchorContainer,
          { top: searchBarBottom - 4, right: 34 },
        ]}
      >
        {/* Silk Thread: Anchored at Search Bar and scales downwards */}
        <Animated.View
          style={[
            styles.silkThreadSegment,
            {
              height: SPIDER_MAX_DROP,
              transform: [
                { translateY: -SPIDER_MAX_DROP / 2 },
                { scaleY: spiderSilkScaleY },
                { translateY: SPIDER_MAX_DROP / 2 },
              ],
            },
          ]}
        />

        {/* Spider Body: Moves down to the end of the silk thread */}
        <Animated.View
          style={[
            styles.spiderBodyWrap,
            {
              transform: [
                { translateY: spiderTranslateY },
                { rotate: spiderRotation },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="spider"
            size={18}
            color={isDaytime ? '#334155' : '#CBD5E1'}
            style={styles.spiderShadow}
          />
        </Animated.View>
      </View>

      {/* ========================================================= */}
      {/* SPIDER 2: BABY SPIDER (NEAR CASA / FILTROS ON LEFT)      */}
      {/* ========================================================= */}
      <View
        style={[
          styles.spiderAnchorContainer,
          { top: searchBarBottom + 62, left: 24 },
        ]}
      >
        <Animated.View
          style={[
            styles.silkThreadSegment,
            {
              height: 65,
              transform: [
                { translateY: -65 / 2 },
                { scaleY: spider2Drop },
                { translateY: 65 / 2 },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.spiderBodyWrap,
            { transform: [{ translateY: spider2TranslateY }] },
          ]}
        >
          <MaterialCommunityIcons
            name="spider"
            size={13}
            color={isDaytime ? '#475569' : '#94A3B8'}
          />
        </Animated.View>
      </View>

      {/* ========================================================= */}
      {/* BATS: MOONLIT SILVER WITH HIGH CONTRAST (VISIBLE ON DARK) */}
      {/* ========================================================= */}
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
          size={22}
          color="#F8FAFC"
          style={styles.batHighContrast}
        />
      </Animated.View>

      {/* Bat 2 (Trailing companion) */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: batOpacity,
            transform: [
              { translateX: Animated.add(batTranslateX, new Animated.Value(-22)) },
              { translateY: Animated.add(batTranslateY, new Animated.Value(16)) },
              { rotate: batRotate },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="bat"
          size={17}
          color="#E2E8F0"
          style={styles.batHighContrast}
        />
      </Animated.View>

      {/* Bat 3 (Lone mid-screen roamer) */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: bat3Opacity,
            transform: [
              { translateX: bat3TranslateX },
              { translateY: bat3TranslateY },
              { scaleX: -1 }, // faces left
              { rotate: batRotate },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="bat"
          size={19}
          color="#F1F5F9"
          style={styles.batHighContrast}
        />
      </Animated.View>

      {/* ========================================================= */}
      {/* GHOSTS: 3 DISTINCT TRAJECTORIES & ROLES                   */}
      {/* ========================================================= */}

      {/* Ghost 1 ("O Errante": Graceful diagonal wave) */}
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
          size={23}
          color={isDaytime ? 'rgba(71, 85, 105, 0.72)' : 'rgba(241, 245, 249, 0.65)'}
          style={styles.ghostGlow}
        />
      </Animated.View>

      {/* Ghost 2 ("O Rasteiro": Street level roamer right to left) */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: ghost2Opacity,
            transform: [
              { translateX: ghost2TranslateX },
              { translateY: ghost2TranslateY },
              { translateY: ghost2SwayY },
              { scaleX: -1 }, // looks towards left
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="ghost-outline"
          size={20}
          color={isDaytime ? 'rgba(71, 85, 105, 0.65)' : 'rgba(226, 232, 240, 0.58)'}
          style={styles.ghostGlow}
        />
      </Animated.View>

      {/* Ghost 3 ("O Curioso": Floats to center, pauses, looks & ascends) */}
      <Animated.View
        style={[
          styles.particleItem,
          {
            opacity: ghost3Opacity,
            transform: [
              { translateX: ghost3TranslateX },
              { translateY: ghost3TranslateY },
              { rotate: ghost3TiltRot },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="ghost"
          size={21}
          color={isDaytime ? 'rgba(71, 85, 105, 0.68)' : 'rgba(248, 250, 252, 0.62)'}
          style={styles.ghostGlow}
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
    textShadowColor: 'rgba(148, 163, 184, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  batHighContrast: {
    // Sharp shadow for 100% visibility against dark map
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  spiderAnchorContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 24,
  },
  silkThreadSegment: {
    position: 'absolute',
    top: 0,
    width: 1.2,
    backgroundColor: 'rgba(226, 232, 240, 0.45)',
  },
  spiderBodyWrap: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  spiderShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  screenCornerWebLeft: {
    position: 'absolute',
    top: -6,
    left: -6,
  },
  screenCornerWebRight: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  searchBarWrappedWeb: {
    position: 'absolute',
    zIndex: 2,
  },
  filtersWebAccent: {
    position: 'absolute',
    left: 8,
  },
  radarWebAccent: {
    position: 'absolute',
    right: 10,
  },
});
