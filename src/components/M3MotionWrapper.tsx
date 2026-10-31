import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
  PressableProps,
  ViewStyle,
  TextStyle,
  StyleProp,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { M3Motion, M3Colors, M3Shapes, M3Elevation, M3Typography, M3ComponentStyles } from '../theme/m3';
import Haptics from '../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Official Google M3 Drag Handle for Bottom Sheets (32x4dp pill)
 */
export const M3DragHandle: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.m3DragHandle, style]} />
);

interface M3DialogProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropClose?: boolean;
}

/**
 * Material Design 3 Dialog with Shared Axis Z (Elevation/Zoom & Fade)
 * Entering: 300ms with emphasizedDecelerate, scale 0.92 -> 1, opacity 0 -> 1
 * Exiting: 200ms with emphasizedAccelerate, scale 1 -> 0.96, opacity 1 -> 0
 */
export const M3Dialog: React.FC<M3DialogProps> = ({
  visible,
  onClose,
  children,
  backdropClose = true,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: M3Motion.durations.long1,
          easing: M3Motion.easings.emphasizedDecelerate,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: M3Motion.durations.long1,
          easing: M3Motion.easings.emphasizedDecelerate,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.standardDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.96,
          duration: M3Motion.durations.medium1,
          easing: M3Motion.easings.emphasizedAccelerate,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: M3Motion.durations.medium1,
          easing: M3Motion.easings.emphasizedAccelerate,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: M3Motion.durations.medium1,
          easing: M3Motion.easings.standardAccelerate,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.dialogContainer}>
        {/* Animated Scrim / Backdrop */}
        <TouchableWithoutFeedback onPress={backdropClose ? onClose : undefined}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.65],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated Container (Shared Axis Z) */}
        <Animated.View
          style={[
            styles.dialogContent,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

interface M3BottomSheetWrapperProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropClose?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Material Design 3 Bottom Sheet with Shared Axis Y (Slide & Fade)
 * Entering: 350ms with emphasizedDecelerate, translateY SCREEN_HEIGHT -> 0
 * Exiting: 250ms with emphasizedAccelerate, translateY 0 -> SCREEN_HEIGHT
 */
export const M3BottomSheetWrapper: React.FC<M3BottomSheetWrapperProps> = ({
  visible,
  onClose,
  children,
  backdropClose = true,
  style,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: M3Motion.durations.long2,
          easing: M3Motion.easings.emphasizedDecelerate,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.standardDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.emphasizedAccelerate,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.standardAccelerate,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <View style={styles.sheetOverlay} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={backdropClose ? onClose : undefined}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.55],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetCardWrapper}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheetCard,
            style,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface M3PressableProps extends PressableProps {
  scaleOnPress?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  rippleColor?: string;
  borderless?: boolean;
  haptic?: boolean;
}

/**
 * Material Design 3 Tactile Pressable with Spring Motion, Ripple, and Haptic Feedback
 * Delivers immediate visual compression, haptic pulse, and native Android ripple on taps.
 */
export const M3Pressable: React.FC<M3PressableProps> = ({
  scaleOnPress = 0.88,
  style,
  children,
  onPressIn,
  onPressOut,
  rippleColor = 'rgba(255, 255, 255, 0.20)',
  borderless = false,
  haptic = true,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (haptic) {
      try {
        Haptics.selectionAsync();
      } catch (_) {}
    }
    Animated.spring(scale, {
      toValue: scaleOnPress,
      tension: 340,
      friction: 12,
      useNativeDriver: true,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 240,
      friction: 8,
      useNativeDriver: true,
    }).start();
    onPressOut?.(e);
  };

  const opacity = scale.interpolate({
    inputRange: [scaleOnPress, 1],
    outputRange: [0.82, 1],
    extrapolate: 'clamp',
  });

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: rippleColor, borderless }}
      style={[
        style as any,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
};

export interface M3ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  scaleOnPress?: number;
}

/**
 * Google Material Design 3 Button conforming to official guidelines
 * Variants: filled, tonal, outlined, text, danger
 */
export const M3Button: React.FC<M3ButtonProps> = ({
  onPress,
  title,
  variant = 'filled',
  icon,
  disabled = false,
  style,
  textStyle,
  scaleOnPress = 0.94,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'tonal':
        return styles.btnTonal;
      case 'outlined':
        return styles.btnOutlined;
      case 'text':
        return styles.btnTextOnly;
      case 'danger':
        return styles.btnDanger;
      case 'filled':
      default:
        return styles.btnFilled;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'tonal':
        return styles.btnTonalText;
      case 'outlined':
        return styles.btnOutlinedText;
      case 'text':
        return styles.btnTextOnlyText;
      case 'danger':
        return styles.btnDangerText;
      case 'filled':
      default:
        return styles.btnFilledText;
    }
  };

  return (
    <M3Pressable
      onPress={onPress}
      disabled={disabled}
      scaleOnPress={scaleOnPress}
      style={[
        styles.btnBase,
        getContainerStyle(),
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      {icon && <View style={styles.btnIconWrap}>{icon}</View>}
      <Text style={[getTextStyle(), disabled && styles.btnDisabledText, textStyle]}>
        {title}
      </Text>
    </M3Pressable>
  );
};

export interface M3FabProps {
  onPress: () => void;
  icon: React.ReactNode;
  label?: string;
  size?: 'standard' | 'small' | 'extended';
  variant?: 'primary' | 'surface' | 'secondary' | 'error';
  style?: StyleProp<ViewStyle>;
  scaleOnPress?: number;
}

/**
 * Google Material Design 3 Floating Action Button (FAB)
 * Standard: 56x56 squircle (16dp radius), Small: 44x44 (12dp radius), Extended: 56dp height pill
 */
export const M3Fab: React.FC<M3FabProps> = ({
  onPress,
  icon,
  label,
  size = label ? 'extended' : 'standard',
  variant = 'surface',
  style,
  scaleOnPress = 0.90,
}) => {
  const getContainerStyle = () => {
    const sizeStyle =
      size === 'small'
        ? styles.fabSmall
        : size === 'extended'
        ? styles.fabExtended
        : styles.fabStandard;

    const variantStyle =
      variant === 'primary'
        ? styles.fabPrimary
        : variant === 'secondary'
        ? styles.fabSecondary
        : variant === 'error'
        ? styles.fabError
        : styles.fabSurface;

    return [sizeStyle, variantStyle];
  };

  return (
    <M3Pressable
      onPress={onPress}
      scaleOnPress={scaleOnPress}
      style={[styles.fabBase, ...getContainerStyle(), style]}
    >
      {icon}
      {label && size === 'extended' && (
        <Text style={styles.fabExtendedText}>{label}</Text>
      )}
    </M3Pressable>
  );
};

export interface M3ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  selectedColor?: string;
}

/**
 * Google Material Design 3 Filter / Assist Chip (32dp height, 8dp radius)
 */
export const M3Chip: React.FC<M3ChipProps> = ({
  label,
  selected = false,
  onPress,
  onLongPress,
  icon,
  style,
  textStyle,
  selectedColor,
}) => {
  return (
    <M3Pressable
      scaleOnPress={0.93}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.chipBase,
        selected && (selectedColor ? { backgroundColor: selectedColor, borderColor: selectedColor } : styles.chipSelected),
        style,
      ]}
    >
      {icon}
      <Text style={[styles.chipText, selected && styles.chipSelectedText, textStyle]}>
        {label}
      </Text>
    </M3Pressable>
  );
};

const styles = StyleSheet.create({
  m3DragHandle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  dialogContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
  },
  dialogContent: {
    width: '90%',
    maxWidth: 420,
    zIndex: 10,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    overflow: 'hidden',
    ...M3Elevation.level3,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 8000,
    elevation: 16,
  },
  sheetCardWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    width: '100%',
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 2,
    borderColor: '#ffffff',
    ...M3Elevation.level4,
    zIndex: 10,
  },
  btnBase: {
    height: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    gap: 8,
  },
  btnFilled: {
    backgroundColor: '#f6a3ca',
    ...M3Elevation.level2,
  },
  btnFilledText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnTonal: {
    backgroundColor: '#ded0f9',
    ...M3Elevation.level2,
  },
  btnTonalText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '700',
  },
  btnOutlined: {
    backgroundColor: '#fffdf7',
    borderWidth: 2,
    borderColor: '#ffffff',
    ...M3Elevation.level1,
  },
  btnOutlinedText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextOnly: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  btnTextOnlyText: {
    color: '#48404b',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDanger: {
    backgroundColor: '#f6a3ca',
    ...M3Elevation.level2,
  },
  btnDangerText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnDisabledText: {
    color: '#48404b',
  },
  btnIconWrap: {
    marginRight: 2,
  },
  fabBase: {
    alignItems: 'center',
    justifyContent: 'center',
    ...M3Elevation.level3,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  fabStandard: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fabSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  fabExtended: {
    height: 54,
    borderRadius: 999,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  fabSurface: {
    backgroundColor: '#fffdf7',
  },
  fabPrimary: {
    backgroundColor: '#f6a3ca',
    borderColor: '#ffffff',
  },
  fabSecondary: {
    backgroundColor: '#ded0f9',
    borderColor: '#ffffff',
  },
  fabError: {
    backgroundColor: '#f6a3ca',
    borderColor: '#ffffff',
  },
  fabExtendedText: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chipBase: {
    height: 36,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 6,
    ...M3Elevation.level1,
  },
  chipText: {
    color: '#48404b',
    fontSize: 12,
    fontWeight: '600',
  },
  chipSelected: {
    backgroundColor: '#f6a3ca',
    borderColor: '#ffffff',
  },
  chipSelectedText: {
    color: '#383139',
    fontWeight: '700',
  },
});
