import { Easing } from 'react-native';

/**
 * Google Material Design 3 (M3) Design System Tokens for Sentinela
 * Based on official M3 specification: https://m3.material.io/
 * Dark theme optimized for night-time pedestrian safety & OLED displays.
 */

export const M3Colors = {
  // Primary (Stealth Neon Emerald & Cyan accents)
  primary: '#10B981',
  onPrimary: '#06140E',
  primaryContainer: '#0D3B2A',
  onPrimaryContainer: '#A7F3D0',

  // Secondary (Cyan / Sky Neon tonal family)
  secondary: '#38BDF8',
  onSecondary: '#072232',
  secondaryContainer: '#112E42',
  onSecondaryContainer: '#BAE6FD',

  // Tertiary (Safe haven purple / accent)
  tertiary: '#A78BFA',
  onTertiary: '#2E1065',
  tertiaryContainer: '#3B1D7A',
  onTertiaryContainer: '#EDE9FE',

  // Error (Red for hazards and emergency SOS)
  error: '#F87171',
  onError: '#450A0A',
  errorContainer: '#7F1D1D',
  onErrorContainer: '#FEE2E2',
  sosBright: '#DC2626',
  sosPressed: '#991B1B',

  // Success (Neon Emerald for safe havens & verified locations)
  success: '#10B981',
  onSuccess: '#052E16',
  successContainer: '#0F4429',
  onSuccessContainer: '#A7F3D0',

  // Warning (Amber / Yellow for caution)
  warning: '#FBBF24',
  onWarning: '#451A03',
  warningContainer: '#5C3404',
  onWarningContainer: '#FDE68A',

  // Surfaces & Containers (Stealth Obsidian Tonal Scale)
  surface: '#080A0C',
  surfaceDim: '#080A0C',
  surfaceBright: '#242A33',
  surfaceContainerLowest: '#050709',
  surfaceContainerLow: '#0E1217',
  surfaceContainer: '#12161D',
  surfaceContainerHigh: '#181D26',
  surfaceContainerHighest: '#202632',

  // On Surface & Text (Soft light grey / silver, avoiding harsh pure white)
  onSurface: '#E2E8F0',
  onSurfaceVariant: '#CBD5E1',
  outline: '#64748B',
  outlineVariant: '#262E3B',

  // Inverses
  inverseSurface: '#F8FAFC',
  inverseOnSurface: '#090B0E',
  inversePrimary: '#059669',

  // Scrim / Shadows
  scrim: '#000000',
  shadow: '#000000',
};

export const M3Shapes = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16, // M3 FAB squircle, cards
  extraLarge: 28, // M3 Bottom Sheets, Dialogs, Search Bar
  full: 9999, // M3 Pill buttons, Filter chips
};

export const M3Elevation = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  level2: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  level3: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.26,
    shadowRadius: 10,
    elevation: 6,
  },
  level4: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
};

export const M3Typography = {
  displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: '400' as const },
  headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  titleLarge: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
  labelSmall: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },
};

/**
 * Material Design Motion System Tokens
 * Conforming to: https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
 */
export const M3Motion = {
  // Motion Durations (MDC Specification)
  durations: {
    short1: 50,    // Micro-interactions, radio/checkbox checks
    short2: 100,   // Tactile press states, ripples
    medium1: 200,  // Fast exits, icon rotations
    medium2: 250,  // Banner entries, tooltip fades
    long1: 300,    // Dialog popups (Shared Axis Z)
    long2: 350,    // Bottom sheet slide entries (Shared Axis Y)
    long3: 400,    // Large container transitions
    long4: 450,    // Complex layout expansions
    long5: 500,    // Full screen page/route transitions
  },

  // Motion Easings / Interpolators (MDC Specification)
  easings: {
    // Material Emphasized (Default for high-emphasis transforms, sheets, dialogs)
    emphasized: Easing.bezier(0.2, 0.0, 0.0, 1.0),
    emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0), // Elements entering the screen
    emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15), // Elements exiting the screen

    // Material Standard (For utility and persistent components like chips, FABs, status pills)
    standard: Easing.bezier(0.2, 0.0, 0.0, 1.0),
    standardDecelerate: Easing.bezier(0.0, 0.0, 0.2, 1.0),     // Small elements appearing
    standardAccelerate: Easing.bezier(0.4, 0.0, 1.0, 1.0),     // Small elements disappearing

    // Linear (For continuous rotations, loaders)
    linear: Easing.linear,
  },
};
