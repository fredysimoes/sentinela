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
import Haptics from '../utils/haptics';

interface ProtestLightModalProps {
  visible: boolean;
  mode: 'torch' | 'strobe';
  onClose: () => void;
}

export const ProtestLightModal: React.FC<ProtestLightModalProps> = ({
  visible,
  mode,
  onClose,
}) => {
  const [strobeState, setStrobeState] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible && mode === 'strobe') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      intervalRef.current = setInterval(() => {
        setStrobeState((prev) => !prev);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setStrobeState(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, mode]);

  if (!visible) return null;

  const isTorch = mode === 'torch';
  const backgroundColor = isTorch
    ? '#FFFFFF'
    : strobeState
    ? '#FFFFFF'
    : '#000000';

  const textColor = isTorch || strobeState ? '#000000' : '#FFFFFF';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden={true} />
      <TouchableOpacity
        style={[styles.container, { backgroundColor }]}
        activeOpacity={1}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onClose();
        }}
      >
        <View style={styles.contentWrap}>
          <Ionicons
            name={isTorch ? 'flashlight' : 'flash'}
            size={48}
            color={textColor}
          />
          <Text style={[styles.title, { color: textColor }]}>
            {isTorch ? 'LANTERNA DE ECRÃ' : 'MODO STROBE ATIVO'}
          </Text>
          <Text style={[styles.subtitle, { color: textColor }]}>
            Toque em qualquer ponto do ecrã para desligar
          </Text>
        </View>

        <View style={styles.bottomHintWrap}>
          <View style={[styles.pill, { borderColor: textColor }]}>
            <Text style={[styles.pillText, { color: textColor }]}>
              {isTorch ? 'Luz Contínua' : 'Sinal Estroboscópico de Alta Visibilidade'}
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  bottomHintWrap: {
    position: 'absolute',
    bottom: 50,
  },
  pill: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
