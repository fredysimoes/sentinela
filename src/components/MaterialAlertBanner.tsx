import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { M3Colors, M3Shapes, M3Elevation, M3Motion } from '../theme/m3';
import Haptics from '../utils/haptics';

export interface InAppAlertData {
  title: string;
  body: string;
  type: 'sos_alert' | 'proximity_alert';
  data?: any;
}

interface MaterialAlertBannerProps {
  alert: InAppAlertData | null;
  onDismiss: () => void;
  onPress?: () => void;
  topOffset?: number;
}

/**
 * Material Design 3 Floating Alert / In-App Notification Pill.
 * Conforms to Google M3 specs for snackbars/banners:
 * - Rounded pill squircle container (radius 28dp)
 * - Tonal surface elevation (Level 3)
 * - Circular tonal icon container
 * - Smooth entrance and exit animations
 * - Auto-dismiss after 7 seconds
 */
export const MaterialAlertBanner: React.FC<MaterialAlertBannerProps> = ({
  alert,
  onDismiss,
  onPress,
  topOffset,
}) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (alert) {
      // Trigger haptic alert
      if (alert.type === 'sos_alert') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      // Animate entry with Material Motion Emphasized Decelerate
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.emphasizedDecelerate,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.emphasizedDecelerate,
          useNativeDriver: true,
        }),
      ]).start();

      // Clear previous timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Auto dismiss after 7 seconds
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, 7000);
    } else {
      translateY.setValue(-80);
      opacity.setValue(0);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [alert]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Animate exit with Material Motion Emphasized Accelerate
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
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
    ]).start(() => {
      onDismiss();
    });
  };

  if (!alert) return null;

  const isSOS = alert.type === 'sos_alert';
  const defaultTop = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 68 : 74;
  const effectiveTop = topOffset !== undefined ? topOffset : defaultTop;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: effectiveTop,
          transform: [{ translateY }],
          opacity,
        },
        isSOS ? styles.containerSOS : styles.containerWarn,
      ]}
    >
      <TouchableOpacity
        style={styles.contentRow}
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress || undefined}
      >
        {/* Tonal Circular Icon Avatar */}
        <View style={[styles.iconWrap, isSOS ? styles.iconWrapSOS : styles.iconWrapWarn]}>
          <Ionicons
            name={isSOS ? 'megaphone' : 'warning'}
            size={22}
            color={isSOS ? '#F87171' : '#FFB951'}
          />
        </View>

        {/* Text Details */}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {alert.title}
            </Text>
            <View style={[styles.pillBadge, isSOS ? styles.badgeSOS : styles.badgeWarn]}>
              <Text style={[styles.pillBadgeText, isSOS ? styles.badgeTextSOS : styles.badgeTextWarn]}>
                {isSOS ? 'SOS' : '300m'}
              </Text>
            </View>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {alert.body}
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#C4C6D0" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    borderRadius: 0,
    borderWidth: 4,
    borderColor: '#000000',
    backgroundColor: '#f5f4ee',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    overflow: 'hidden',
  },
  containerWarn: {
    backgroundColor: '#ffff00',
    borderColor: '#000000',
  },
  containerSOS: {
    backgroundColor: '#ff0000',
    borderColor: '#000000',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#000000',
  },
  iconWrapWarn: {
    backgroundColor: '#ffffff',
  },
  iconWrapSOS: {
    backgroundColor: '#ffff00',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  badgeWarn: {
    backgroundColor: '#ffffff',
  },
  badgeSOS: {
    backgroundColor: '#ffffff',
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeTextWarn: {
    color: '#000000',
  },
  badgeTextSOS: {
    color: '#ff0000',
  },
  bodyText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
