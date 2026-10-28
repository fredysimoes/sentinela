import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3Pressable } from './M3MotionWrapper';
import {
  calculateDistanceMeters,
  calculateBearing,
  calculateRelativeAngle,
  getCompassDirectionLabel,
  getProximityStatus,
  formatDistance,
} from '../utils/geo';
import {
  RadarPeer,
  RadarSessionHandle,
  generateRadarPin,
  generatePeerId,
  joinRadarRoom,
  broadcastRadarLocation,
  sendRadarStrobeSignal,
  leaveRadarRoom,
} from '../services/radarService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 290);

interface RadarModalProps {
  visible: boolean;
  onClose: () => void;
  userLocation: { latitude: number; longitude: number } | null;
  userHeading?: number;
  onNavigateToFriend?: (name: string, coord: { latitude: number; longitude: number }) => void;
}

export const RadarModal: React.FC<RadarModalProps> = ({
  visible,
  onClose,
  userLocation,
  userHeading = 0,
  onNavigateToFriend,
}) => {
  // Session State
  const [sessionHandle, setSessionHandle] = useState<RadarSessionHandle | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [targetPeer, setTargetPeer] = useState<RadarPeer | null>(null);
  const [myRole, setMyRole] = useState<'beacon' | 'seeker' | null>(null);
  const [isVisualBeaconActive, setIsVisualBeaconActive] = useState(false);
  const [strobeAlertMessage, setStrobeAlertMessage] = useState<string | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const geigerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locBroadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const strobeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Smooth Sonar Pulsing
  useEffect(() => {
    if (!visible) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const rippleLoop = Animated.loop(
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    rippleLoop.start();

    return () => {
      pulseLoop.stop();
      rippleLoop.stop();
    };
  }, [visible]);

  // Periodic GPS Broadcast to room peers (every 1.5s)
  useEffect(() => {
    if (!sessionHandle || !userLocation) return;

    // Immediate initial broadcast
    broadcastRadarLocation(sessionHandle, {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      heading: userHeading,
      displayName: myRole === 'beacon' ? 'Amigo (Farol)' : 'Amigo (A caminho)',
    });

    locBroadcastTimerRef.current = setInterval(() => {
      broadcastRadarLocation(sessionHandle, {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        heading: userHeading,
        displayName: myRole === 'beacon' ? 'Amigo (Farol)' : 'Amigo (A caminho)',
      });
    }, 1500);

    return () => {
      if (locBroadcastTimerRef.current) {
        clearInterval(locBroadcastTimerRef.current);
        locBroadcastTimerRef.current = null;
      }
    };
  }, [sessionHandle, userLocation?.latitude, userLocation?.longitude, userHeading, myRole]);

  // Distance & Angle Computations
  const distance =
    userLocation && targetPeer
      ? calculateDistanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          targetPeer.latitude,
          targetPeer.longitude
        )
      : null;

  const bearing =
    userLocation && targetPeer
      ? calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          targetPeer.latitude,
          targetPeer.longitude
        )
      : 0;

  const relativeAngle = calculateRelativeAngle(bearing, userHeading);
  const directionText = getCompassDirectionLabel(relativeAngle);
  const proximity = distance !== null ? getProximityStatus(distance) : null;

  // Haptic "Geiger Counter" cadence when in proximity
  useEffect(() => {
    if (geigerTimerRef.current) {
      clearInterval(geigerTimerRef.current);
      geigerTimerRef.current = null;
    }

    if (visible && proximity && proximity.hapticIntervalMs !== null) {
      geigerTimerRef.current = setInterval(() => {
        Haptics.impactAsync(
          distance !== null && distance <= 3
            ? ImpactFeedbackStyle.Heavy
            : ImpactFeedbackStyle.Medium
        );
      }, proximity.hapticIntervalMs);
    }

    return () => {
      if (geigerTimerRef.current) {
        clearInterval(geigerTimerRef.current);
        geigerTimerRef.current = null;
      }
    };
  }, [visible, proximity?.hapticIntervalMs, distance]);

  // Handle incoming remote strobe trigger signal
  const handleIncomingStrobe = (fromName: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStrobeAlertMessage(`${fromName} está a sinalizar a sua localização!`);
    setIsVisualBeaconActive(true);

    if (strobeTimeoutRef.current) clearTimeout(strobeTimeoutRef.current);
    strobeTimeoutRef.current = setTimeout(() => {
      setIsVisualBeaconActive(false);
      setStrobeAlertMessage(null);
    }, 6000);
  };

  // Fullscreen Visual Screen Beacon (100% Brightness High-Visibility Pulse)
  useEffect(() => {
    if (isVisualBeaconActive) {
      (async () => {
        try {
          await Brightness.setBrightnessAsync(1.0);
        } catch {}
      })();
    } else {
      (async () => {
        try {
          await Brightness.restoreSystemBrightnessAsync();
        } catch {}
      })();
    }
  }, [isVisualBeaconActive]);

  // Join Room as Beacon ("Criar Farol")
  const handleStartBeacon = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    const newPin = generateRadarPin();
    const myId = generatePeerId();
    setMyRole('beacon');

    const handle = joinRadarRoom({
      pin: newPin,
      myPeerId: myId,
      displayName: 'Farol na Multidão',
      role: 'beacon',
      onPeerUpdate: (peer) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTargetPeer(peer);
      },
      onStrobeTrigger: handleIncomingStrobe,
      onPeerLeft: () => {
        setTargetPeer(null);
      },
    });

    setSessionHandle(handle);
  };

  // Join Room as Seeker ("Seguir Amigo via PIN")
  const handleJoinSeeker = () => {
    const cleanPin = pinInput.trim();
    if (cleanPin.length !== 4) {
      Alert.alert('PIN Inválido', 'Por favor insira um código PIN de 4 dígitos.');
      return;
    }

    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    const myId = generatePeerId();
    setMyRole('seeker');

    const handle = joinRadarRoom({
      pin: cleanPin,
      myPeerId: myId,
      displayName: 'Amigo a Caminho',
      role: 'seeker',
      onPeerUpdate: (peer) => {
        setTargetPeer(peer);
      },
      onStrobeTrigger: handleIncomingStrobe,
      onPeerLeft: () => {
        setTargetPeer(null);
      },
    });

    setSessionHandle(handle);
  };

  const handleSharePin = async () => {
    if (!sessionHandle) return;
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: `Estou no meio da multidão! Abre a app Sentinela e insere o código do radar: ${sessionHandle.pin}`,
      });
    } catch {}
  };

  const handleTriggerFriendStrobe = async () => {
    if (!sessionHandle) return;
    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    await sendRadarStrobeSignal(sessionHandle, 'O seu amigo');
    Alert.alert('Sinalizador Enviado', 'O ecrã do seu amigo está agora a piscar em néon de alta intensidade.');
  };

  const handleLeaveSession = async () => {
    Haptics.selectionAsync();
    if (sessionHandle) {
      await leaveRadarRoom(sessionHandle);
    }
    setSessionHandle(null);
    setTargetPeer(null);
    setMyRole(null);
    setPinInput('');
    setIsVisualBeaconActive(false);
  };

  const handleOpenOnMap = () => {
    if (targetPeer && onNavigateToFriend) {
      onNavigateToFriend(targetPeer.displayName, {
        latitude: targetPeer.latitude,
        longitude: targetPeer.longitude,
      });
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              handleLeaveSession();
              onClose();
            }}
          >
            <Ionicons name="close" size={24} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.radarLiveBadge}>
              <View style={styles.radarLiveDot} />
              <Text style={styles.radarLiveText}>RADAR MULTIDÃO</Text>
            </View>
            <Text style={styles.headerTitle}>Estou Aqui</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Remote Strobe Alert Banner */}
        {strobeAlertMessage && (
          <View style={styles.strobeAlertBanner}>
            <Ionicons name="flash" size={18} color="#000000" />
            <Text style={styles.strobeAlertText}>{strobeAlertMessage}</Text>
          </View>
        )}

        {/* Screen 1: Start or Join Selection */}
        {!sessionHandle ? (
          <View style={styles.startSection}>
            <View style={styles.introCard}>
              <View style={styles.introIconWrap}>
                <Ionicons name="scan" size={32} color="#10B981" />
              </View>
              <Text style={styles.introTitle}>Encontrar Amigo na Multidão</Text>
              <Text style={styles.introDesc}>
                Orientação direcional em tempo real combinando bússola vetorial, giroscópio e sinalizadores visuais para concertos, shoppings e manifestações.
              </Text>
            </View>

            {/* Option A: Create Beacon */}
            <M3Pressable
              style={styles.actionCard}
              scaleOnPress={0.97}
              onPress={handleStartBeacon}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="radio" size={24} color="#10B981" />
              </View>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>Partilhar a Minha Posição</Text>
                <Text style={styles.actionCardSubtitle}>
                  Gera um PIN de 4 dígitos para quem está à sua procura
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </M3Pressable>

            {/* Option B: Join Beacon via PIN */}
            <View style={styles.joinCard}>
              <View style={styles.joinHeader}>
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="locate" size={24} color="#38BDF8" />
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={styles.actionCardTitle}>Seguir um Amigo</Text>
                  <Text style={styles.actionCardSubtitle}>
                    Insira o código PIN de 4 dígitos partilhado
                  </Text>
                </View>
              </View>

              <View style={styles.pinInputRow}>
                <TextInput
                  style={styles.pinInput}
                  placeholder="PIN (ex: 8492)"
                  placeholderTextColor="#475569"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={pinInput}
                  onChangeText={setPinInput}
                />
                <TouchableOpacity
                  style={[
                    styles.joinBtn,
                    pinInput.trim().length === 4 && styles.joinBtnActive,
                  ]}
                  onPress={handleJoinSeeker}
                  disabled={pinInput.trim().length !== 4}
                >
                  <Text style={styles.joinBtnText}>Ligar</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          /* Screen 2: Active Sonar Radar Experience */
          <View style={styles.activeRadarSection}>
            {/* PIN Pill Card */}
            <View style={styles.pinDisplayCard}>
              <View style={styles.pinPill}>
                <Text style={styles.pinPillLabel}>PIN DA SESSÃO:</Text>
                <Text style={styles.pinPillCode}>{sessionHandle.pin}</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleSharePin}>
                <Ionicons name="share-outline" size={18} color="#38BDF8" />
                <Text style={styles.shareBtnText}>Partilhar</Text>
              </TouchableOpacity>
            </View>

            {/* Status Peer Connection Pill */}
            <View style={styles.peerStatusPill}>
              <View
                style={[
                  styles.peerStatusDot,
                  targetPeer ? styles.peerStatusDotOnline : styles.peerStatusDotSearching,
                ]}
              />
              <Text style={styles.peerStatusText}>
                {targetPeer
                  ? `${targetPeer.displayName} ligado(a)`
                  : 'À espera que o seu amigo se ligue...'}
              </Text>
            </View>

            {/* Central 360 Sonar Radar Visualizer */}
            <View style={styles.radarContainer}>
              {/* Outer Ripple Effect */}
              <Animated.View
                style={[
                  styles.sonarRipple,
                  {
                    transform: [
                      {
                        scale: rippleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, 1.4],
                        }),
                      },
                    ],
                    opacity: rippleAnim.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0.6, 0.25, 0],
                    }),
                  },
                ]}
              />

              {/* Concentric Sonar Rings */}
              <View style={[styles.sonarRing, styles.sonarRingOuter]} />
              <View style={[styles.sonarRing, styles.sonarRingMid]} />
              <View style={[styles.sonarRing, styles.sonarRingInner]} />

              {/* Crosshair Axes */}
              <View style={styles.crosshairVertical} />
              <View style={styles.crosshairHorizontal} />

              {/* Animated Compass Bearing Directional Arrow */}
              {targetPeer && (
                <View
                  style={[
                    styles.arrowTrack,
                    {
                      transform: [{ rotate: `${relativeAngle}deg` }],
                    },
                  ]}
                >
                  <View style={styles.arrowHeadContainer}>
                    <View style={styles.arrowTriangle} />
                    <View style={styles.arrowShaft} />
                  </View>
                </View>
              )}

              {/* Central Target Display */}
              <Animated.View
                style={[
                  styles.radarCenterDisplay,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: proximity ? proximity.color : 'rgba(56, 189, 248, 0.4)',
                  },
                ]}
              >
                {distance !== null ? (
                  <>
                    <Text style={styles.distanceNumber}>
                      {distance < 1000 ? distance : (distance / 1000).toFixed(1)}
                    </Text>
                    <Text style={styles.distanceUnit}>
                      {distance < 1000 ? 'METROS' : 'KM'}
                    </Text>
                  </>
                ) : (
                  <Ionicons name="radio-outline" size={36} color="#64748B" />
                )}
              </Animated.View>
            </View>

            {/* Direction & Proximity Feedback */}
            {targetPeer && proximity ? (
              <View style={styles.feedbackCard}>
                <Text style={[styles.feedbackBadge, { color: proximity.color }]}>
                  {proximity.label.toUpperCase()}
                </Text>
                <Text style={styles.directionInstruction}>{directionText}</Text>
              </View>
            ) : (
              <View style={styles.feedbackCard}>
                <Text style={styles.searchingNotice}>
                  Partilhe o PIN com o seu amigo para ativar o radar direcional.
                </Text>
              </View>
            )}

            {/* Action Buttons Footer */}
            <View style={styles.footerActions}>
              {/* Trigger Friend Strobe Button */}
              {targetPeer && (
                <M3Pressable
                  style={[styles.footerBtn, styles.strobeBtn]}
                  scaleOnPress={0.96}
                  onPress={handleTriggerFriendStrobe}
                >
                  <Ionicons name="flash" size={20} color="#000000" />
                  <Text style={styles.strobeBtnText}>Piscar Lanterna do Amigo</Text>
                </M3Pressable>
              )}

              {/* Local Visual Screen Beacon Toggle */}
              <M3Pressable
                style={[
                  styles.footerBtn,
                  isVisualBeaconActive ? styles.beaconBtnActive : styles.beaconBtn,
                ]}
                scaleOnPress={0.96}
                onPress={() => setIsVisualBeaconActive((prev) => !prev)}
              >
                <Ionicons
                  name={isVisualBeaconActive ? 'sunny' : 'sunny-outline'}
                  size={20}
                  color={isVisualBeaconActive ? '#000000' : '#F59E0B'}
                />
                <Text
                  style={[
                    styles.beaconBtnText,
                    isVisualBeaconActive && styles.beaconBtnTextActive,
                  ]}
                >
                  {isVisualBeaconActive ? 'Farol de Ecrã Ativo' : 'Erguer Farol de Ecrã'}
                </Text>
              </M3Pressable>

              {/* View on Map Option */}
              {targetPeer && onNavigateToFriend && (
                <TouchableOpacity style={styles.viewOnMapBtn} onPress={handleOpenOnMap}>
                  <Ionicons name="map-outline" size={17} color="#94A3B8" />
                  <Text style={styles.viewOnMapText}>Abrir no Mapa Sentinela</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Leave Session Button */}
            <TouchableOpacity style={styles.leaveSessionBtn} onPress={handleLeaveSession}>
              <Text style={styles.leaveSessionText}>Terminar Sessão de Radar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A0F',
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  radarLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  radarLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  radarLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  strobeAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  strobeAlertText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  startSection: {
    flex: 1,
    paddingTop: 16,
  },
  introCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  introIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  introTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  introDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  joinCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  pinInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pinInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 3,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  joinBtnActive: {
    backgroundColor: '#38BDF8',
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeRadarSection: {
    flex: 1,
    alignItems: 'center',
  },
  pinDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  pinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  pinPillCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  peerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginBottom: 16,
  },
  peerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  peerStatusDotOnline: {
    backgroundColor: '#10B981',
  },
  peerStatusDotSearching: {
    backgroundColor: '#F59E0B',
  },
  peerStatusText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  radarContainer: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  sonarRipple: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderColor: '#10B981',
    borderWidth: 2,
  },
  sonarRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sonarRingOuter: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
  },
  sonarRingMid: {
    width: RADAR_SIZE * 0.68,
    height: RADAR_SIZE * 0.68,
    borderColor: 'rgba(56, 189, 248, 0.16)',
  },
  sonarRingInner: {
    width: RADAR_SIZE * 0.38,
    height: RADAR_SIZE * 0.38,
    borderColor: 'rgba(16, 185, 129, 0.22)',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 1,
    height: RADAR_SIZE,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  crosshairHorizontal: {
    position: 'absolute',
    height: 1,
    width: RADAR_SIZE,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  arrowTrack: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
  },
  arrowHeadContainer: {
    alignItems: 'center',
    top: 4,
  },
  arrowTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#10B981',
  },
  arrowShaft: {
    width: 4,
    height: 18,
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  radarCenterDisplay: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  distanceNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  distanceUnit: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  feedbackCard: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  feedbackBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  directionInstruction: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  searchingNotice: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },
  footerActions: {
    width: '100%',
    gap: 10,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  strobeBtn: {
    backgroundColor: '#F59E0B',
  },
  strobeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  beaconBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  beaconBtnActive: {
    backgroundColor: '#10B981',
  },
  beaconBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  beaconBtnTextActive: {
    color: '#000000',
  },
  viewOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  viewOnMapText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  leaveSessionBtn: {
    marginTop: 'auto',
    marginBottom: 20,
    paddingVertical: 10,
  },
  leaveSessionText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
});
