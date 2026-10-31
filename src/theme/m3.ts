import { Easing } from 'react-native';

/**
 * Bauhaus Design System Tokens for Sentinela
 * 
 * Identity:
 * Build with off-white (#f5f4ee), black (#000000), red (#ff0000), blue (#0000ff),
 * and yellow (#ffff00) planes joined by heavy seams. Large sans type and deliberate
 * circles and triangles make the page graphic.
 * 
 * Tokens:
 * --dp-color-ground: #f5f4ee
 * --dp-color-ink: #000000
 * --dp-color-accent: #ff0000
 * --dp-color-field: #0000ff
 * --dp-color-field-support: #ffff00
 * --dp-color-quiet: #e8e8e8
 * --dp-color-on-field: #ffffff
 * --dp-radius-square: 0
 * --dp-radius-circle: 50%
 * --dp-border-rule: 4px
 * --dp-border-rule-compact: 3px
 */

export const BauhausTokens = {
  colors: {
    ground: '#f5f4ee',
    ink: '#000000',
    accent: '#ff0000',
    field: '#0000ff',
    fieldSupport: '#ffff00',
    quiet: '#e8e8e8',
    onField: '#ffffff',
  },
  typography: {
    fontFamily: 'sans-serif',
    weightDisplay: '800' as const,
    weightAction: '800' as const,
    weightLabel: '700' as const,
    weightReading: '500' as const,
  },
  shapes: {
    square: 0,
    circle: 9999,
  },
  borders: {
    rule: 4,
    ruleCompact: 3,
    color: '#000000',
  },
};

export const M3Colors = {
  // Ground & Base
  ground: '#f5f4ee',
  ink: '#000000',
  quiet: '#e8e8e8',

  // Primary (Bauhaus Accent Red Plane)
  primary: '#ff0000',
  onPrimary: '#ffffff',
  primaryContainer: '#ffff00',
  onPrimaryContainer: '#000000',

  // Secondary (Bauhaus Field Blue Plane)
  secondary: '#0000ff',
  onSecondary: '#ffffff',
  secondaryContainer: '#e8e8e8',
  onSecondaryContainer: '#000000',

  // Tertiary (Bauhaus Field Support Yellow Plane)
  tertiary: '#ffff00',
  onTertiary: '#000000',
  tertiaryContainer: '#ffff00',
  onTertiaryContainer: '#000000',

  // Error (Red for hazards and emergency SOS)
  error: '#ff0000',
  onError: '#ffffff',
  errorContainer: '#ff0000',
  onErrorContainer: '#ffffff',
  sosBright: '#ff0000',
  sosPressed: '#cc0000',

  // Success (Bold contrasting Plane)
  success: '#000000',
  onSuccess: '#ffffff',
  successContainer: '#ffff00',
  onSuccessContainer: '#000000',

  // Warning (Bauhaus Yellow)
  warning: '#ffff00',
  onWarning: '#000000',
  warningContainer: '#ffff00',
  onWarningContainer: '#000000',

  // Surfaces & Containers (Off-White Ground & White/Quiet planes)
  surface: '#f5f4ee',
  surfaceDim: '#e8e8e8',
  surfaceBright: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f4ee',
  surfaceContainer: '#ffffff',
  surfaceContainerHigh: '#e8e8e8',
  surfaceContainerHighest: '#e8e8e8',

  // On Surface & Text (Deep Black Ink)
  onSurface: '#000000',
  onSurfaceVariant: '#000000',
  outline: '#000000',
  outlineVariant: '#000000',

  // Inverses
  inverseSurface: '#000000',
  inverseOnSurface: '#ffffff',
  inversePrimary: '#ff0000',

  // Scrim & Shadows
  scrim: 'rgba(0, 0, 0, 0.75)',
  shadow: '#000000',
};

export const M3Shapes = {
  none: 0,
  extraSmall: 0, // Square corners in Bauhaus
  small: 0,      // Square corners in Bauhaus
  medium: 0,     // Square corners in Bauhaus
  large: 0,      // Square corners in Bauhaus
  extraLarge: 0, // Square corners in Bauhaus
  full: 9999,    // Reserved for deliberate circles
};

/**
 * Hard offset shadows for Bauhaus geometry (no soft blur)
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
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  level2: {
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  level3: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  level4: {
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
};

export const M3Typography = {
  displayLarge: { fontSize: 44, lineHeight: 48, fontWeight: '800' as const, letterSpacing: -0.5 },
  headlineLarge: { fontSize: 32, lineHeight: 36, fontWeight: '800' as const, letterSpacing: -0.5 },
  headlineMedium: { fontSize: 26, lineHeight: 30, fontWeight: '800' as const },
  headlineSmall: { fontSize: 22, lineHeight: 26, fontWeight: '800' as const },
  titleLarge: { fontSize: 18, lineHeight: 24, fontWeight: '800' as const },
  titleMedium: { fontSize: 16, lineHeight: 22, fontWeight: '800' as const },
  titleSmall: { fontSize: 14, lineHeight: 18, fontWeight: '700' as const },
  bodyLarge: { fontSize: 18, lineHeight: 26, fontWeight: '500' as const },
  bodyMedium: { fontSize: 16, lineHeight: 22, fontWeight: '500' as const },
  bodySmall: { fontSize: 14, lineHeight: 18, fontWeight: '500' as const },
  labelLarge: { fontSize: 15, lineHeight: 20, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  labelMedium: { fontSize: 13, lineHeight: 16, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};

/**
 * Bauhaus Motion Tokens: immediate feedback, stationary planes
 */
export const M3Motion = {
  durations: {
    short1: 0,
    short2: 50,
    medium1: 100,
    medium2: 150,
    long1: 200,
    long2: 250,
    long3: 300,
    long4: 350,
    long5: 400,
  },
  easings: {
    emphasized: Easing.linear,
    emphasizedDecelerate: Easing.linear,
    emphasizedAccelerate: Easing.linear,
    standard: Easing.linear,
    standardDecelerate: Easing.linear,
    standardAccelerate: Easing.linear,
    linear: Easing.linear,
  },
};

/**
 * Bauhaus Component Presets
 */
export const M3ComponentStyles = {
  // Bauhaus Bottom Sheet (Square corners, heavy 4px black seam, off-white ground)
  sheet: {
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    ...M3Elevation.level4,
  },

  // Bauhaus Drag Handle (48x4 solid black rule)
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 0,
    backgroundColor: '#000000',
    alignSelf: 'center' as const,
    marginTop: 12,
    marginBottom: 16,
  },

  // Bauhaus Search Bar (Square, 3px solid black seam, hard offset shadow)
  searchBar: {
    height: 56,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    borderWidth: 3,
    borderColor: '#000000',
    ...M3Elevation.level2,
  },

  // Bauhaus Buttons (Square corners, heavy black seams, bold fills)
  buttonFilled: {
    height: 48,
    borderRadius: 0,
    backgroundColor: '#ff0000',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    ...M3Elevation.level2,
  },
  buttonFilledText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },

  buttonTonal: {
    height: 48,
    borderRadius: 0,
    backgroundColor: '#0000ff',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    ...M3Elevation.level2,
  },
  buttonTonalText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800' as const,
  },

  buttonOutlined: {
    height: 48,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
    gap: 8,
    ...M3Elevation.level1,
  },
  buttonOutlinedText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800' as const,
  },

  // Bauhaus Circular Action (Large deliberate circle with 3px black seam & hard shadow)
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffff00',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 3,
    borderColor: '#000000',
    ...M3Elevation.level3,
  },

  fabSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffff00',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 3,
    borderColor: '#000000',
    ...M3Elevation.level2,
  },

  // Bauhaus Chip (Square, ruled cell)
  chip: {
    height: 34,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#000000',
    gap: 6,
    ...M3Elevation.level1,
  },
  chipText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  chipSelected: {
    backgroundColor: '#ffff00',
    borderColor: '#000000',
    borderWidth: 3,
  },
  chipSelectedText: {
    color: '#000000',
    fontWeight: '800' as const,
  },

  // Bauhaus Card (Square, 3px solid black seam, hard offset shadow)
  card: {
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#000000',
    padding: 16,
    ...M3Elevation.level2,
  },

  // Bauhaus Ledger Navigation Bar (Off-white plane, 4px black seam)
  navBar: {
    height: 76,
    backgroundColor: '#f5f4ee',
    borderTopWidth: 4,
    borderTopColor: '#000000',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    paddingBottom: 8,
  },
  navBarActiveIndicator: {
    width: 58,
    height: 32,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffff00',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
