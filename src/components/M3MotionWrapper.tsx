import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { M3Motion, M3Colors } from '../theme/m3';
import Haptics from '../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetOverlay}>
        <TouchableWithoutFeedback onPress={backdropClose ? onClose : undefined}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.6],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetCardWrapper}
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
    </Modal>
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

const styles = StyleSheet.create({
  dialogContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  dialogContent: {
    width: '90%',
    maxWidth: 420,
    zIndex: 10,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCardWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    width: '100%',
    zIndex: 10,
  },
});
