import { Easing } from 'react-native';

/**
 * Claymorphism Design System Tokens for Sentinela
 * 
 * Identity:
 * Use soft, inflated forms with broad light from the upper left.
 * Dark plum-grey text (#383139, #48404b) sits on pink cushions (#f6a3ca),
 * cream reading trays (#fffdf7), and pastel mint (#c0efdc), lavender (#ded0f9),
 * butter-yellow (#f9e7a8), and pale-blue (#c5e5fb) objects.
 * Rounded edges (38px surface, 70px/40px tray, 999px pills) and inset highlights.
 */

export const ClaymorphismTokens = {
  colors: {
    ground: '#f1f2fa',
    ink: '#383139',
    inkSecondary: '#48404b',
    accent: '#f6a3ca',          // Pink lead cushion / primary
    surfaceSupport: '#c0efdc',  // Mint pastel
    surfaceCompare: '#ded0f9',  // Lavender pastel
    surfaceWarm: '#f9e7a8',     // Butter-yellow pastel
    surfaceCool: '#c5e5fb',     // Pale-blue pastel
    surface: '#fffdf7',         // Cream reading surface
    highlight: '#ffffff',
  },
  radius: {
    tray: 40,
    surface: 32,
    disclosure: 20,
    control: 999,
  },
  typography: {
    fontFamily: 'sans-serif',
    body: 16,
    small: 15,
    metadata: 13,
    caption: 12,
    readingLeading: 1.55,
    emphasis: '700' as const,
    display: '800' as const,
  },
  shadow: {
    soft: {
      shadowColor: '#383139',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
    cushion: {
      shadowColor: '#383139',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 14,
      elevation: 6,
    },
    tray: {
      shadowColor: '#383139',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
    pill: {
      shadowColor: '#383139',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: 3,
    },
  },
};

export const M3Colors = {
  // Ground & Text (Dark plum-grey ink)
  ground: '#f1f2fa',
  ink: '#383139',
  inkSecondary: '#48404b',
  quiet: '#ded0f9',

  // Primary: Soft Pink Cushion
  primary: '#f6a3ca',
  onPrimary: '#383139',
  primaryContainer: '#f6a3ca',
  onPrimaryContainer: '#383139',

  // Secondary: Lavender Cushion
  secondary: '#ded0f9',
  onSecondary: '#383139',
  secondaryContainer: '#ded0f9',
  onSecondaryContainer: '#383139',

  // Tertiary / Warm: Butter-Yellow Cushion
  tertiary: '#f9e7a8',
  onTertiary: '#383139',
  tertiaryContainer: '#f9e7a8',
  onTertiaryContainer: '#383139',

  // Support / Safety: Mint Cushion
  support: '#c0efdc',
  onSupport: '#383139',

  // Cool / Info: Pale Blue Cushion
  cool: '#c5e5fb',
  onCool: '#383139',

  // Error / Alert / SOS: Pink Lead Cushion with plum ink
  error: '#f6a3ca',
  onError: '#383139',
  errorContainer: '#f9e7a8',
  onErrorContainer: '#383139',
  sosBright: '#f6a3ca',
  sosPressed: '#e690b9',

  // Success: Pastel Mint
  success: '#c0efdc',
  onSuccess: '#383139',
  successContainer: '#c0efdc',
  onSuccessContainer: '#383139',

  // Warning: Butter-Yellow
  warning: '#f9e7a8',
  onWarning: '#383139',
  warningContainer: '#f9e7a8',
  onWarningContainer: '#383139',

  // Surfaces: Cream Reading Trays
  surface: '#fffdf7',
  surfaceDim: '#f1f2fa',
  surfaceBright: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fffdf7',
  surfaceContainer: '#fffdf7',
  surfaceContainerHigh: '#ded0f9',
  surfaceContainerHighest: '#c5e5fb',

  // On Surface & Text (Dark Plum-Grey)
  onSurface: '#383139',
  onSurfaceVariant: '#48404b',
  outline: '#ffffff',
  outlineVariant: 'rgba(255, 255, 255, 0.85)',

  // Inverses
  inverseSurface: '#383139',
  inverseOnSurface: '#fffdf7',
  inversePrimary: '#f6a3ca',

  // Scrim & Shadows
  scrim: 'rgba(56, 49, 57, 0.45)',
  shadow: '#383139',
};

export const M3Shapes = {
  none: 0,
  extraSmall: 14,
  small: 20,       // Disclosure / small pills
  medium: 25,      // Disclosures / sub-cards
  large: 32,       // Cushions / card containers
  extraLarge: 40,  // Reading trays / bottom sheets
  full: 999,       // Thick pill buttons / controls
};

/**
 * Soft, inflated Claymorphism shadows with subtle upper-left lighting
 */
export const M3Elevation = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  level2: {
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  level3: {
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  level4: {
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
};

export const M3Typography = {
  displayLarge: { fontSize: 44, lineHeight: 48, fontWeight: '800' as const, letterSpacing: -0.5, color: '#383139' },
  headlineLarge: { fontSize: 30, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.4, color: '#383139' },
  headlineMedium: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, color: '#383139' },
  headlineSmall: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, color: '#383139' },
  titleLarge: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, color: '#383139' },
  titleMedium: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const, color: '#383139' },
  titleSmall: { fontSize: 14, lineHeight: 18, fontWeight: '700' as const, color: '#383139' },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const, color: '#383139' },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const, color: '#48404b' },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, color: '#48404b' },
  labelLarge: { fontSize: 15, lineHeight: 20, fontWeight: '700' as const, color: '#383139' },
  labelMedium: { fontSize: 13, lineHeight: 16, fontWeight: '700' as const, color: '#48404b' },
  labelSmall: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, color: '#48404b' },
};

/**
 * Claymorphism Motion: 180ms interaction response
 */
export const M3Motion = {
  durations: {
    short1: 60,
    short2: 120,
    medium1: 180, // --dp-motion-interaction: 180ms
    medium2: 220,
    long1: 280,
    long2: 320,
    long3: 360,
    long4: 400,
    long5: 450,
  },
  easings: {
    emphasized: Easing.bezier(0.2, 0, 0, 1),
    emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
    emphasizedAccelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
    standard: Easing.bezier(0.2, 0, 0, 1),
    standardDecelerate: Easing.bezier(0, 0, 0.2, 1),
    standardAccelerate: Easing.bezier(0.4, 0, 1, 1),
    linear: Easing.linear,
  },
};

/**
 * Claymorphism Component Presets:
 * Soft inflated forms, light highlights, pill controls, cream trays
 */
export const M3ComponentStyles = {
  // Claymorphism Reading Tray (Cream reading surface, inflated 40px top radius, white inset highlight)
  sheet: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },

  // Claymorphism Molded Drag Handle (pill shape in lavender / soft cool tone)
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    alignSelf: 'center' as const,
    marginTop: 12,
    marginBottom: 16,
  },

  // Claymorphism Search Bar (Pill cushion in cream/white with soft shadow & white highlight)
  searchBar: {
    height: 54,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },

  // Claymorphism Buttons: Thick pills with inset highlights and grounding shadow
  buttonFilled: {
    height: 50,
    borderRadius: 999,
    backgroundColor: '#f6a3ca', // Pink lead cushion
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonFilledText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '700' as const,
  },

  buttonTonal: {
    height: 50,
    borderRadius: 999,
    backgroundColor: '#ded0f9', // Lavender decision cushion
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonTonalText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '700' as const,
  },

  buttonOutlined: {
    height: 50,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonOutlinedText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '700' as const,
  },

  // Circular Action FAB (Molded pastel cushion)
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f6a3ca',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  fabSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fffdf7',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },

  // Claymorphism Chip (Molded pill)
  chip: {
    height: 36,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  chipSelected: {
    backgroundColor: '#f6a3ca',
    borderColor: '#ffffff',
  },
  chipSelectedText: {
    color: '#383139',
    fontWeight: '700' as const,
  },

  // Claymorphism Cushion Card (Soft rounded 32px, cream tray or pastel cushion)
  card: {
    borderRadius: 32,
    backgroundColor: '#fffdf7',
    borderWidth: 2,
    borderColor: '#ffffff',
    padding: 16,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },

  // Navigation Bar (Cream reading tray with soft top shadow)
  navBar: {
    height: 76,
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    paddingBottom: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  navBarActiveIndicator: {
    width: 60,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ded0f9',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
