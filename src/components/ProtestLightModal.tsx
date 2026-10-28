import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import Haptics from '../utils/haptics';

interface ProtestLightModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProtestLightModal: React.FC<ProtestLightModalProps> = ({
  visible,
  onClose,
}) => {
  const [strobeState, setStrobeState] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Maximize screen brightness for intense strobe effect
      (async () => {
        try {
          await Brightness.setBrightnessAsync(1.0);
        } catch (e) {
          console.warn('Could not set max brightness:', e);
        }
      })();

      // Ultra-fast high-frequency strobe (~45ms alternating black and white)
      intervalRef.current = setInterval(() => {
        setStrobeState((prev) => !prev);
      }, 45);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setStrobeState(false);
      (async () => {
        try {
          await Brightness.restoreSystemBrightnessAsync();
        } catch (e) {}
      })();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      (async () => {
        try {
          await Brightness.restoreSystemBrightnessAsync();
        } catch (e) {}
      })();
    };
  }, [visible]);

  if (!visible) return null;

  const backgroundColor = strobeState ? '#FFFFFF' : '#000000';
  const textColor = strobeState ? '#000000' : '#FFFFFF';

  const handleStop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await Brightness.restoreSystemBrightnessAsync();
    } catch (e) {}
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleStop}
      statusBarTranslucent
    >
      <StatusBar hidden={true} />
      <TouchableOpacity
        style={[styles.container, { backgroundColor }]}
        activeOpacity={1}
        onPress={handleStop}
      >
        <View style={styles.contentWrap}>
          <Ionicons
            name="flash"
            size={56}
            color={textColor}
          />
          <Text style={[styles.title, { color: textColor }]}>
            MODO STROBE
          </Text>
          <Text style={[styles.subtitle, { color: textColor }]}>
            Brilho Máximo • Toque no ecrã para desligar
          </Text>
        </View>

        <View style={styles.bottomHintWrap}>
          <View style={[styles.pill, { borderColor: textColor, backgroundColor: strobeState ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="power" size={16} color={textColor} />
            <Text style={[styles.pillText, { color: textColor }]}>
              DESLIGAR STROBE
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrap: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.85,
  },
  bottomHintWrap: {
    position: 'absolute',
    bottom: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
