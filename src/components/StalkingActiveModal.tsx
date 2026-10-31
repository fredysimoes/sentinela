import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3Pressable } from './M3MotionWrapper';
import { StalkingTrackingSession } from '../services/stalkingService';

interface StalkingActiveModalProps {
  session: StalkingTrackingSession | null;
  sentinelsCount: number;
  onStopTracking: () => void;
}

export const StalkingActiveModal: React.FC<StalkingActiveModalProps> = ({
  session,
  sentinelsCount,
  onStopTracking,
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isStealthMode, setIsStealthMode] = useState(false);

  useEffect(() => {
    if (!session) {
      setSecondsElapsed(0);
      setIsStealthMode(false);
      return;
    }

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.id]);

  if (!session) return null;

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirmStop = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Confirmar Segurança',
      'Confirma que se encontra em segurança e deseja parar a transmissão do seu trajeto?',
      [
        { text: 'Continuar a Transmitir', style: 'cancel' },
        {
          text: 'Sim, Estou em Segurança',
          style: 'default',
          onPress: onStopTracking,
        },
      ]
    );
  };

  // Stealth Camouflage View (Fake Call Screen so stalker sees innocent screen)
  if (isStealthMode) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.stealthContainer}>
          <View style={styles.stealthCallWrap}>
            <View style={styles.stealthAvatar}>
              <Ionicons name="person" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.stealthCallName}>Mãe</Text>
            <Text style={styles.stealthCallStatus}>04:18 • Em chamada</Text>
          </View>

          {/* Hidden Exit Camouflage Bar */}
          <TouchableOpacity
            style={styles.stealthExitTap}
            onPress={() => {
              Haptics.selectionAsync();
              setIsStealthMode(false);
            }}
          >
            <Text style={styles.stealthExitText}>Toque 2 vezes aqui para voltar ao Sentinela</Text>
          </TouchableOpacity>

          <View style={styles.stealthCallActions}>
            <TouchableOpacity
              style={styles.stealthEndCallBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setIsStealthMode(false);
              }}
            >
              <Ionicons name="call" size={26} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.floatingContainer}>
      {/* Top Pulse Badge */}
      <View style={styles.headerRow}>
        <View style={styles.pulseLiveDot} />
        <Text style={styles.liveAlertTitle}>ESTOU A SER SEGUIDO(A) • ATIVO</Text>
        <Text style={styles.timerText}>{formatTimer(secondsElapsed)}</Text>
      </View>

      {/* Sentinels Notice */}
      <View style={styles.infoRow}>
        <Ionicons name="shield-checkmark" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
        <Text style={styles.infoText}>
          {sentinelsCount > 0
            ? `${sentinelsCount} Sentinela(s) notificado(s) e a acompanhar o seu rastro ao vivo.`
            : 'A gravar o seu rastro GPS confidencial para os seus Sentinelas.'}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.actionsRow}>
        {/* Stealth Mode Button */}
        <TouchableOpacity
          style={styles.stealthBtn}
          onPress={() => {
            Haptics.impactAsync(ImpactFeedbackStyle.Light);
            setIsStealthMode(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-off" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
          <Text style={styles.stealthBtnText}>Camuflar Ecrã</Text>
        </TouchableOpacity>

        {/* I am Safe Button */}
        <M3Pressable style={styles.safeBtn} onPress={handleConfirmStop}>
          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.safeBtnText}>Estou em Segurança</Text>
        </M3Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#f5f4ee',
    borderRadius: 0,
    borderWidth: 4,
    borderColor: '#ff0000',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    zIndex: 9999,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 0,
    backgroundColor: '#ff0000',
    marginRight: 8,
  },
  liveAlertTitle: {
    flex: 1,
    color: '#ff0000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timerText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stealthBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  safeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffff00',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 0,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  safeBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  // Stealth Camouflage View
  stealthContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  stealthCallWrap: {
    alignItems: 'center',
  },
  stealthAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stealthCallName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  stealthCallStatus: {
    color: '#94A3B8',
    fontSize: 14,
  },
  stealthExitTap: {
    padding: 16,
    opacity: 0.4,
  },
  stealthExitText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  stealthCallActions: {
    alignItems: 'center',
  },
  stealthEndCallBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
