import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';

export type MaterialSymbolName =
  | 'health_cross'
  | 'local_police'
  | 'emergency'
  | 'accessible';

/**
 * Codepoints for Google Fonts Material Symbols Outlined (24dp)
 * Exact glyphs matching:
 * - health_cross: \uf2c3 (https://fonts.google.com/icons?selected=Material+Symbols+Outlined:health_cross)
 * - local_police: \uef56 (https://fonts.google.com/icons?selected=Material+Symbols+Outlined:local_police)
 * - emergency:    \ue1eb (https://fonts.google.com/icons?selected=Material+Symbols+Outlined:emergency)
 * - accessible:   \ue914 (https://fonts.google.com/icons?selected=Material+Symbols+Outlined:accessible)
 */
const GLYPH_MAP: Record<MaterialSymbolName, string> = {
  health_cross: '\uf2c3',
  local_police: '\uef56',
  emergency: '\ue1eb',
  accessible: '\ue914',
};

interface MaterialSymbolIconProps {
  name: MaterialSymbolName;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export const MaterialSymbolIcon: React.FC<MaterialSymbolIconProps> = ({
  name,
  size = 20,
  color = '#FFFFFF',
  style,
}) => {
  const glyph = GLYPH_MAP[name] || name;

  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.icon,
        {
          fontSize: size,
          lineHeight: size,
          color,
        },
        style,
      ]}
    >
      {glyph}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontFamily: 'MaterialSymbolsOutlined',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
