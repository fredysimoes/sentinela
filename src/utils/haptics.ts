import { Vibration, Platform } from 'react-native';

export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
}

export const Haptics = {
  NotificationFeedbackType,
  ImpactFeedbackStyle,
  selectionAsync: async () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(20);
    }
  },
  impactAsync: async (style?: ImpactFeedbackStyle | string) => {
    if (Platform.OS === 'android') {
      const duration =
        style === ImpactFeedbackStyle.Heavy || style === 'heavy'
          ? 60
          : style === ImpactFeedbackStyle.Medium || style === 'medium'
          ? 40
          : 20;
      Vibration.vibrate(duration);
    }
  },
  notificationAsync: async (type?: NotificationFeedbackType | string) => {
    if (Platform.OS === 'android') {
      if (type === NotificationFeedbackType.Error || type === 'error') {
        Vibration.vibrate([0, 80, 80, 160]);
      } else {
        Vibration.vibrate([0, 50, 50, 50]);
      }
    }
  },
};

export default Haptics;
