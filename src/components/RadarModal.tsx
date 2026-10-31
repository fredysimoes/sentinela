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
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import * as Location from 'expo-location';
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
  shareRadarWhatsApp,
  shareRadarSMS,
  createRadarShareMessage,
  notifySentinelsOfRadarSession,
} from '../services/radarService';
import { SentinelContact, getCachedSentinels } from '../services/sentinelsService';
import {
  startHeartbeatStrobe,
  stopHeartbeatStrobe,
  isHeartbeatStrobeActive,
} from '../services/torch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 290);

interface RadarModalProps {
  visible: boolean;
  onClose: () => void;
  userLocation: { latitude: number; longitude: number; accuracy?: number | null } | null;
  userHeading?: number;
  initialPin?: string | null;
  onNavigateToFriend?: (name: string, coord: { latitude: number; longitude: number }) => void;
  sentinels?: SentinelContact[];
  currentUserProfile?: { id: string; fullName?: string; email?: string } | null;
}

export const RadarModal: React.FC<RadarModalProps> = ({
  visible,
  onClose,
  userLocation,
  userHeading = 0,
  initialPin,
  onNavigateToFriend,
  sentinels,
  currentUserProfile,
}) => {
  // Session State
  const [sessionHandle, setSessionHandle] = useState<RadarSessionHandle | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [targetPeer, setTargetPeer] = useState<RadarPeer | null>(null);
  const [myRole, setMyRole] = useState<'beacon' | 'seeker' | null>(null);

  // Keyboard avoidance and auto-scroll states
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<any>(null);

  // Sentinels and Share split sheet states
  const [activeSentinels, setActiveSentinels] = useState<SentinelContact[]>(sentinels || []);
  const [showSentinelPicker, setShowSentinelPicker] = useState(false);
  const [shareSplitChannel, setShareSplitChannel] = useState<'whatsapp' | 'sms' | null>(null);

  // Heartbeat Flashlight & Strobe States
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);
  const [strobeScreenState, setStrobeScreenState] = useState(false);
  const [strobeAlertMessage, setStrobeAlertMessage] = useState<string | null>(null);

  // High-accuracy live position & compass states
  const [liveLocation, setLiveLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(userLocation);
  const [liveHeading, setLiveHeading] = useState<number>(userHeading);

  const smoothedHeadingX = useRef(Math.cos((userHeading * Math.PI) / 180));
  const smoothedHeadingY = useRef(Math.sin((userHeading * Math.PI) / 180));
  const filteredBearingRef = useRef<number>(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const geigerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locBroadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync incoming userLocation prop
  useEffect(() => {
    if (userLocation) {
      setLiveLocation(userLocation);
    }
  }, [userLocation?.latitude, userLocation?.longitude, userLocation?.accuracy]);

  // Dedicated High-Accuracy Location & Compass Watchers while Radar is active
  useEffect(() => {
    if (!visible) return;

    let headingSub: Location.LocationSubscription | null = null;
    let posSub: Location.LocationSubscription | null = null;

    // 1. High-frequency compass with smooth circular low-pass filter
    (async () => {
      try {
        headingSub = await Location.watchHeadingAsync((h) => {
          const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (typeof heading === 'number' && !isNaN(heading)) {
            const rad = (heading * Math.PI) / 180;
            smoothedHeadingX.current = smoothedHeadingX.current * 0.7 + Math.cos(rad) * 0.3;
            smoothedHeadingY.current = smoothedHeadingY.current * 0.7 + Math.sin(rad) * 0.3;
            const smoothedDeg =
              ((Math.atan2(smoothedHeadingY.current, smoothedHeadingX.current) * 180) / Math.PI + 360) % 360;
            setLiveHeading(Math.round(smoothedDeg));
          }
        });
      } catch (err) {
        console.warn('Radar watchHeadingAsync error:', err);
      }
    })();

    // 2. High-precision GPS watcher (1Hz, BestForNavigation)
    (async () => {
      try {
        posSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (loc) => {
            setLiveLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy ?? undefined,
            });
          }
        );
      } catch (err) {
        console.warn('Radar watchPositionAsync error:', err);
      }
    })();

    return () => {
      if (headingSub) headingSub.remove();
      if (posSub) posSub.remove();
    };
  }, [visible]);

  // Auto-join if opened via deep link with PIN
  useEffect(() => {
    if (!visible) return;
    if (initialPin && initialPin.trim().length === 4 && !sessionHandle) {
      setPinInput(initialPin.trim());
      handleJoinSeeker(initialPin.trim());
    }
  }, [visible, initialPin]);

  // Sync Sentinels list for direct notifications
  useEffect(() => {
    if (!visible) return;
    if (sentinels && sentinels.length > 0) {
      setActiveSentinels(sentinels);
    } else {
      getCachedSentinels().then((cached) => {
        if (cached && cached.length > 0) {
          setActiveSentinels(cached);
        }
      });
    }
  }, [sentinels, visible]);

  // Auto-scroll and keyboard listener to guarantee input and button visibility
  useEffect(() => {
    if (!visible) return;

    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 60);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  // Smooth Sonar Pulsing Animations
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

  // Periodic GPS Broadcast to room peers (every 1s)
  useEffect(() => {
    if (!sessionHandle || !liveLocation) return;

    const sendUpdate = () => {
      broadcastRadarLocation(sessionHandle, {
        latitude: liveLocation.latitude,
        longitude: liveLocation.longitude,
        accuracy: liveLocation.accuracy ?? undefined,
        heading: liveHeading,
        displayName: myRole === 'beacon' ? 'Amigo (Farol)' : 'Amigo (A caminho)',
      });
    };

    sendUpdate();
    locBroadcastTimerRef.current = setInterval(sendUpdate, 1000);

    return () => {
      if (locBroadcastTimerRef.current) {
        clearInterval(locBroadcastTimerRef.current);
        locBroadcastTimerRef.current = null;
      }
    };
  }, [sessionHandle, liveLocation?.latitude, liveLocation?.longitude, liveHeading, myRole]);

  // Distance & Proximity Computations
  const rawDistance =
    liveLocation && targetPeer
      ? calculateDistanceMeters(
          liveLocation.latitude,
          liveLocation.longitude,
          targetPeer.latitude,
          targetPeer.longitude
        )
      : null;

  const rawBearing =
    liveLocation && targetPeer
      ? calculateBearing(
          liveLocation.latitude,
          liveLocation.longitude,
          targetPeer.latitude,
          targetPeer.longitude
        )
      : 0;

  // Angular filter on bearing to eliminate 180-degree GPS jitter at close range
  useEffect(() => {
    if (rawBearing !== null && rawBearing !== undefined) {
      const diff = ((rawBearing - filteredBearingRef.current + 540) % 360) - 180;
      filteredBearingRef.current = ((filteredBearingRef.current + diff * 0.35 + 360) % 360);
    }
  }, [rawBearing]);

  const proximity = rawDistance !== null ? getProximityStatus(rawDistance) : null;
  const isImmediate = proximity?.isImmediateProximity || (rawDistance !== null && rawDistance <= 5);

  const relativeAngle = calculateRelativeAngle(
    Math.round(filteredBearingRef.current),
    liveHeading
  );
  const directionText = isImmediate
    ? 'Vocês estão lado a lado! Olhe em redor ou ative as lanternas.'
    : getCompassDirectionLabel(relativeAngle);

  // Haptic "Geiger Counter" cadence when in proximity
  useEffect(() => {
    if (geigerTimerRef.current) {
      clearInterval(geigerTimerRef.current);
      geigerTimerRef.current = null;
    }

    if (visible && proximity && proximity.hapticIntervalMs !== null) {
      geigerTimerRef.current = setInterval(() => {
        Haptics.impactAsync(
          isImmediate
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
  }, [visible, proximity?.hapticIntervalMs, isImmediate]);

  // Handle incoming remote strobe trigger signal
  const handleIncomingStrobe = (fromName: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStrobeAlertMessage(`${fromName} ativou o sinalizador de lanterna!`);
    setIsHeartbeatActive(true);

    startHeartbeatStrobe(
      7000,
      (isOn, pulseNumber) => {
        setStrobeScreenState(isOn);
        if (isOn) {
          Haptics.impactAsync(
            pulseNumber === 1 ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Medium
          );
        }
      },
      () => {
        setIsHeartbeatActive(false);
        setStrobeAlertMessage(null);
        setStrobeScreenState(false);
      }
    );
  };

  // Toggle Heartbeat Flashlight: triggers remote phone AND local phone in alternating double pulses
  const handleToggleHeartbeatStrobe = async () => {
    if (isHeartbeatActive) {
      stopHeartbeatStrobe();
      setIsHeartbeatActive(false);
      setStrobeScreenState(false);
      setStrobeAlertMessage(null);
      return;
    }

    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);

    // 1. Broadcast signal to friend's phone over Realtime
    if (sessionHandle) {
      await sendRadarStrobeSignal(sessionHandle, 'O seu amigo');
    }

    // 2. Start hardware flashlight heartbeat pulse on this phone
    setIsHeartbeatActive(true);
    setStrobeAlertMessage('Sinalizador Heartbeat ativo na lanterna (2 em 2 pulsos)');

    startHeartbeatStrobe(
      7000,
      (isOn, pulseNumber) => {
        setStrobeScreenState(isOn);
        if (isOn) {
          Haptics.impactAsync(
            pulseNumber === 1 ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Medium
          );
        }
      },
      () => {
        setIsHeartbeatActive(false);
        setStrobeAlertMessage(null);
        setStrobeScreenState(false);
      }
    );
  };

  // Fullscreen Visual Screen Brightness when heartbeat screen flash is active
  useEffect(() => {
    if (strobeScreenState) {
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
  }, [strobeScreenState]);

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
  const handleJoinSeeker = (targetPin?: string) => {
    const cleanPin = (targetPin || pinInput).trim();
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

  const handleOpenShareSplit = (channel: 'whatsapp' | 'sms') => {
    Haptics.selectionAsync();
    setShareSplitChannel(channel);
  };

  const handleExecuteShare = async (mode: 'code' | 'link' | 'full') => {
    if (!sessionHandle || !shareSplitChannel) return;
    Haptics.selectionAsync();
    const pin = sessionHandle.pin;
    const channel = shareSplitChannel;
    setShareSplitChannel(null);

    try {
      if (channel === 'whatsapp') {
        await shareRadarWhatsApp(pin, mode);
      } else {
        await shareRadarSMS(pin, mode);
      }
    } catch {
      Alert.alert('Partilha', 'Não foi possível completar o envio da mensagem.');
    }
  };

  const handleOpenSentinelNotifyModal = () => {
    Haptics.selectionAsync();
    if (activeSentinels.length === 0) {
      Alert.alert(
        'Sem Sentinelas Adicionados',
        'Ainda não tem Sentinelas registados no seu círculo. Adicione um contacto no menu Sentinelas para enviar notificações diretas de acesso imediato.'
      );
      return;
    }
    setShowSentinelPicker(true);
  };

  const handleSendNotificationToSentinel = async (sentinel?: SentinelContact) => {
    if (!sessionHandle) return;
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    setShowSentinelPicker(false);

    const senderName = currentUserProfile?.fullName || 'O seu amigo';
    const res = await notifySentinelsOfRadarSession({
      pin: sessionHandle.pin,
      senderName,
      senderId: currentUserProfile?.id,
      targetSentinelId: sentinel?.id,
      targetSentinelName: sentinel?.name,
    });

    if (res.success) {
      Alert.alert('Notificação Enviada', res.message);
    } else {
      Alert.alert('Aviso', res.message);
    }
  };

  const handleSharePinGeneral = async () => {
    if (!sessionHandle) return;
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: createRadarShareMessage(sessionHandle.pin),
      });
    } catch {}
  };

  const handleLeaveSession = async () => {
    Haptics.selectionAsync();
    stopHeartbeatStrobe();
    if (sessionHandle) {
      await leaveRadarRoom(sessionHandle);
    }
    setSessionHandle(null);
    setTargetPeer(null);
    setMyRole(null);
    setPinInput('');
    setIsHeartbeatActive(false);
    setStrobeScreenState(false);
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
      <StatusBar barStyle="dark-content" />
      <View
        style={[
          styles.container,
          strobeScreenState && styles.containerFlashWhite,
        ]}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              handleLeaveSession();
              onClose();
            }}
          >
            <Ionicons name="close" size={22} color="#383139" />
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
            <Ionicons name="flash" size={18} color="#383139" />
            <Text style={styles.strobeAlertText}>{strobeAlertMessage}</Text>
          </View>
        )}

        {/* Screen 1: Start or Join Selection */}
        {!sessionHandle ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.startScrollContent,
                isKeyboardVisible && { paddingBottom: 220 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.introCard, isKeyboardVisible && styles.introCardCompact]}>
                {!isKeyboardVisible && (
                  <View style={styles.introIconWrap}>
                    <Ionicons name="scan" size={28} color="#383139" />
                  </View>
                )}
                <Text style={[styles.introTitle, isKeyboardVisible && { fontSize: 16, marginBottom: 2 }]}>
                  Encontrar Amigo na Multidão
                </Text>
                {!isKeyboardVisible && (
                  <Text style={styles.introDesc}>
                    Orientação direcional em tempo real combinando bússola vetorial, giroscópio e sinalizador ótico heartbeat para concertos, shoppings e manifestações.
                  </Text>
                )}
              </View>

              {/* Option B: Join Beacon via PIN - Posicionado com prioridade para nunca ser tapado pelo teclado */}
              <View style={[styles.joinCard, isKeyboardVisible && styles.joinCardRaised]}>
                <View style={styles.joinHeader}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#c5e5fb' }]}>
                    <Ionicons name="locate" size={22} color="#383139" />
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
                    placeholderTextColor="#7D7582"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={pinInput}
                    onChangeText={setPinInput}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                  <TouchableOpacity
                    style={[
                      styles.joinBtn,
                      pinInput.trim().length === 4 && styles.joinBtnActive,
                    ]}
                    onPress={() => handleJoinSeeker()}
                    disabled={pinInput.trim().length !== 4}
                  >
                    <Text style={styles.joinBtnText}>Ligar</Text>
                    <Ionicons name="arrow-forward" size={16} color="#383139" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Option A: Create Beacon */}
              <M3Pressable
                style={[styles.actionCard, { marginTop: 14 }]}
                scaleOnPress={0.97}
                onPress={handleStartBeacon}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: '#c0efdc' }]}>
                  <Ionicons name="radio" size={22} color="#383139" />
                </View>
                <View style={styles.actionCardContent}>
                  <Text style={styles.actionCardTitle}>Partilhar a Minha Posição</Text>
                  <Text style={styles.actionCardSubtitle}>
                    Gera um PIN e link de acesso direto via SMS, WhatsApp ou Sentinela
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7D7582" />
              </M3Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          /* Screen 2: Active Sonar Radar Experience */
          <View style={styles.activeRadarSection}>
            {/* PIN Pill Card & Quick Share Row */}
            <View style={styles.pinDisplayCard}>
              <View style={styles.pinPill}>
                <Text style={styles.pinPillLabel}>PIN DA SESSÃO:</Text>
                <Text style={styles.pinPillCode}>{sessionHandle.pin}</Text>
              </View>
              <View style={styles.shareButtonsGroup}>
                <TouchableOpacity
                  style={[styles.sharePillBtn, styles.sharePillWhatsApp]}
                  onPress={() => handleOpenShareSplit('whatsapp')}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#383139" />
                  <Text style={styles.sharePillText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sharePillBtn, styles.sharePillSMS]}
                  onPress={() => handleOpenShareSplit('sms')}
                >
                  <Ionicons name="chatbubble-ellipses" size={15} color="#383139" />
                  <Text style={styles.sharePillText}>SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sharePillBtn, styles.sharePillSentinel]}
                  onPress={handleOpenSentinelNotifyModal}
                >
                  <Ionicons name="shield-checkmark" size={15} color="#383139" />
                  <Text style={styles.sharePillText}>Sentinela</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sharePillBtn, styles.sharePillGeneral]}
                  onPress={handleSharePinGeneral}
                >
                  <Ionicons name="share-social-outline" size={15} color="#383139" />
                </TouchableOpacity>
              </View>
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

              {/* Immediate Proximity Target Lock Ring OR Directional Arrow */}
              {targetPeer && isImmediate ? (
                <View style={styles.targetLockContainer}>
                  <View style={styles.targetLockPulseOuter} />
                  <View style={styles.targetLockPulseInner} />
                  <Ionicons name="checkmark-circle" size={32} color="#383139" />
                </View>
              ) : targetPeer ? (
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
              ) : null}

              {/* Central Target Display */}
              <Animated.View
                style={[
                  styles.radarCenterDisplay,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor: '#ffffff',
                  },
                ]}
              >
                {rawDistance !== null ? (
                  <>
                    <Text style={styles.distanceNumber}>
                      {rawDistance <= 5 ? '< 5' : (rawDistance < 1000 ? rawDistance : (rawDistance / 1000).toFixed(1))}
                    </Text>
                    <Text style={styles.distanceUnit}>
                      {rawDistance <= 5 ? 'METROS (AO LADO)' : (rawDistance < 1000 ? 'METROS' : 'KM')}
                    </Text>
                  </>
                ) : (
                  <Ionicons name="radio-outline" size={36} color="#383139" />
                )}
              </Animated.View>
            </View>

            {/* Direction & Proximity Feedback */}
            {targetPeer && proximity ? (
              <View style={styles.feedbackCard}>
                <Text style={[styles.feedbackBadge, { color: '#383139' }]}>
                  {proximity.label.toUpperCase()}
                </Text>
                <Text style={styles.directionInstruction}>{directionText}</Text>
              </View>
            ) : (
              <View style={styles.feedbackCard}>
                <Text style={styles.searchingNotice}>
                  Partilhe o PIN ou o link direto para ativar o radar de proximidade.
                </Text>
              </View>
            )}

            {/* Action Buttons Footer */}
            <View style={styles.footerActions}>
              {/* Trigger Heartbeat Flashlight Button (operates local + remote hardware torch in double-pulse cadence) */}
              <M3Pressable
                style={[
                  styles.footerBtn,
                  isHeartbeatActive ? styles.heartbeatBtnActive : styles.heartbeatBtn,
                ]}
                scaleOnPress={0.96}
                onPress={handleToggleHeartbeatStrobe}
              >
                <Ionicons
                  name={isHeartbeatActive ? 'stop-circle' : 'flash'}
                  size={20}
                  color="#383139"
                />
                <Text
                  style={[
                    styles.heartbeatBtnText,
                    isHeartbeatActive && styles.heartbeatBtnTextActive,
                  ]}
                >
                  {isHeartbeatActive
                    ? 'Parar Lanterna Heartbeat (A piscar...)'
                    : 'Piscar Lanterna (Heartbeat 2 em 2)'}
                </Text>
              </M3Pressable>

              {/* View on Map Option */}
              {targetPeer && onNavigateToFriend && (
                <TouchableOpacity style={styles.viewOnMapBtn} onPress={handleOpenOnMap}>
                  <Ionicons name="map-outline" size={17} color="#383139" />
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

        {/* Share Split Modal (WhatsApp / SMS) */}
        <Modal
          visible={shareSplitChannel !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setShareSplitChannel(null)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShareSplitChannel(null)}
          >
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderBar} />
                <Text style={styles.sheetTitle}>
                  {shareSplitChannel === 'whatsapp' ? 'Partilhar via WhatsApp' : 'Partilhar via SMS'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  Envie em separado para permitir ao seu amigo tocar diretamente no link:
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.sheetOptionBtn, { backgroundColor: '#c5e5fb', borderColor: '#ffffff' }]}
                onPress={() => handleExecuteShare('code')}
              >
                <Ionicons name="key-outline" size={20} color="#383139" />
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={styles.sheetOptionTitle}>1. Enviar Código PIN</Text>
                  <Text style={styles.sheetOptionDesc}>Informa o código PIN ({sessionHandle?.pin})</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#383139" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetOptionBtn, { backgroundColor: '#c0efdc', borderColor: '#ffffff' }]}
                onPress={() => handleExecuteShare('link')}
              >
                <Ionicons name="link-outline" size={20} color="#383139" />
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={styles.sheetOptionTitle}>2. Enviar Link Direto</Text>
                  <Text style={styles.sheetOptionDesc}>Apenas o link limpo direto (toque único para abrir)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#383139" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetOptionBtn, { backgroundColor: '#ded0f9', borderColor: '#ffffff' }]}
                onPress={() => handleExecuteShare('full')}
              >
                <Ionicons name="document-text-outline" size={20} color="#383139" />
                <View style={styles.sheetOptionTextWrap}>
                  <Text style={styles.sheetOptionTitle}>Enviar Mensagem Completa</Text>
                  <Text style={styles.sheetOptionDesc}>Texto informativo com instruções e código</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#383139" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setShareSplitChannel(null)}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Sentinel Direct Notification Picker Modal */}
        <Modal
          visible={showSentinelPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSentinelPicker(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowSentinelPicker(false)}
          >
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderBar} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="shield-checkmark" size={20} color="#383139" />
                  <Text style={styles.sheetTitle}>Notificar Sentinela</Text>
                </View>
                <Text style={styles.sheetSubtitle}>
                  Envia notificação instantânea. Ao tocar na notificação, o seu Sentinela abre o radar diretamente:
                </Text>
              </View>

              {activeSentinels.length > 1 && (
                <TouchableOpacity
                  style={[styles.sheetOptionBtn, { backgroundColor: '#c0efdc', borderColor: '#ffffff', marginBottom: 12 }]}
                  onPress={() => handleSendNotificationToSentinel(undefined)}
                >
                  <Ionicons name="notifications" size={20} color="#383139" />
                  <View style={styles.sheetOptionTextWrap}>
                    <Text style={styles.sheetOptionTitle}>Notificar Todos os Sentinelas</Text>
                    <Text style={styles.sheetOptionDesc}>Dispara alerta para todos os contactos do seu círculo</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#383139" />
                </TouchableOpacity>
              )}

              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {activeSentinels.map((sentinel) => (
                  <TouchableOpacity
                    key={`sentinel-${sentinel.id}`}
                    style={[styles.sheetOptionBtn, { backgroundColor: '#ffffff', borderColor: '#ffffff' }]}
                    onPress={() => handleSendNotificationToSentinel(sentinel)}
                  >
                    <View style={styles.sentinelAvatarWrap}>
                      <Text style={styles.sentinelAvatarLetter}>{sentinel.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.sheetOptionTextWrap}>
                      <Text style={styles.sheetOptionTitle}>{sentinel.name}</Text>
                      <Text style={styles.sheetOptionDesc}>Código: {sentinel.sentinelCode || 'ST-????'}</Text>
                    </View>
                    <View style={styles.notifyBadge}>
                      <Text style={styles.notifyBadgeText}>Notificar</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setShowSentinelPicker(false)}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f2fa',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  containerFlashWhite: {
    backgroundColor: '#f9e7a8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerCenter: {
    alignItems: 'center',
  },
  radarLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0efdc',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  radarLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#383139',
    marginRight: 6,
  },
  radarLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#383139',
    letterSpacing: 1.1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#383139',
  },
  strobeAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9e7a8',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  strobeAlertText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#383139',
    flex: 1,
  },
  startSection: {
    flex: 1,
    paddingTop: 16,
  },
  startScrollContent: {
    paddingTop: 12,
    paddingBottom: 36,
  },
  introCard: {
    backgroundColor: '#fffdf7',
    borderRadius: 32,
    padding: 22,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginBottom: 18,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  introCardCompact: {
    padding: 12,
    marginBottom: 12,
  },
  introIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#c0efdc',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  introTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#383139',
    marginBottom: 8,
    textAlign: 'center',
  },
  introDesc: {
    fontSize: 13,
    color: '#48404b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 28,
    padding: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginBottom: 16,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#383139',
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#48404b',
    fontWeight: '500',
  },
  joinCard: {
    backgroundColor: '#fffdf7',
    borderRadius: 28,
    padding: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  joinCardRaised: {
    borderColor: '#f6a3ca',
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    color: '#383139',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 3,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ded0f9',
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  joinBtnActive: {
    backgroundColor: '#f6a3ca',
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#383139',
  },
  activeRadarSection: {
    flex: 1,
    alignItems: 'center',
  },
  pinDisplayCard: {
    flexDirection: 'column',
    width: '100%',
    backgroundColor: '#fffdf7',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinPillLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7D7582',
    letterSpacing: 0.8,
  },
  pinPillCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#383139',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  shareButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#ffffff',
    paddingTop: 8,
  },
  sharePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sharePillWhatsApp: {
    backgroundColor: '#c0efdc',
    flex: 1,
    justifyContent: 'center',
  },
  sharePillSMS: {
    backgroundColor: '#c5e5fb',
    flex: 1,
    justifyContent: 'center',
  },
  sharePillSentinel: {
    backgroundColor: '#ded0f9',
    flex: 1,
    justifyContent: 'center',
  },
  sharePillGeneral: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  sharePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#383139',
  },
  peerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f9e7a8',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  peerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  peerStatusDotOnline: {
    backgroundColor: '#10B981',
  },
  peerStatusDotSearching: {
    backgroundColor: '#383139',
  },
  peerStatusText: {
    fontSize: 12,
    color: '#383139',
    fontWeight: '700',
  },
  radarContainer: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 8,
  },
  sonarRipple: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderColor: '#f6a3ca',
    borderWidth: 2.5,
  },
  sonarRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 253, 247, 0.35)',
  },
  sonarRingOuter: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    backgroundColor: '#fffdf7',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sonarRingMid: {
    width: RADAR_SIZE * 0.68,
    height: RADAR_SIZE * 0.68,
    borderColor: '#ffffff',
    backgroundColor: '#ded0f9',
  },
  sonarRingInner: {
    width: RADAR_SIZE * 0.38,
    height: RADAR_SIZE * 0.38,
    borderColor: '#ffffff',
    backgroundColor: '#c0efdc',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 1.5,
    height: RADAR_SIZE,
    backgroundColor: 'rgba(56, 49, 57, 0.1)',
  },
  crosshairHorizontal: {
    position: 'absolute',
    height: 1.5,
    width: RADAR_SIZE,
    backgroundColor: 'rgba(56, 49, 57, 0.1)',
  },
  targetLockContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
  },
  targetLockPulseOuter: {
    position: 'absolute',
    width: RADAR_SIZE * 0.55,
    height: RADAR_SIZE * 0.55,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#383139',
    borderStyle: 'dashed',
  },
  targetLockPulseInner: {
    position: 'absolute',
    width: RADAR_SIZE * 0.46,
    height: RADAR_SIZE * 0.46,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
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
    borderBottomColor: '#383139',
  },
  arrowShaft: {
    width: 4,
    height: 18,
    backgroundColor: '#383139',
    borderRadius: 2,
  },
  radarCenterDisplay: {
    width: 104,
    height: 104,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  distanceNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#383139',
    lineHeight: 30,
  },
  distanceUnit: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#48404b',
    letterSpacing: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },
  feedbackCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#fffdf7',
    borderWidth: 2,
    borderColor: '#ffffff',
    width: '100%',
    marginBottom: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  feedbackBadge: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
    color: '#383139',
  },
  directionInstruction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#383139',
    textAlign: 'center',
  },
  searchingNotice: {
    fontSize: 13,
    color: '#48404b',
    fontWeight: '600',
    textAlign: 'center',
  },
  footerActions: {
    width: '100%',
    gap: 10,
    marginTop: 'auto',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
  },
  heartbeatBtn: {
    backgroundColor: '#f9e7a8',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heartbeatBtnActive: {
    backgroundColor: '#f6a3ca',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  heartbeatBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#383139',
  },
  heartbeatBtnTextActive: {
    color: '#383139',
  },
  viewOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  viewOnMapText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#383139',
  },
  leaveSessionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  leaveSessionText: {
    fontSize: 12,
    color: '#383139',
    fontWeight: '800',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetHeaderBar: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#383139',
    marginBottom: 4,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#48404b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  sheetOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginBottom: 10,
    gap: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sheetOptionTextWrap: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#383139',
    marginBottom: 2,
  },
  sheetOptionDesc: {
    fontSize: 12,
    color: '#48404b',
    fontWeight: '500',
  },
  sheetCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#383139',
  },
  sentinelAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  sentinelAvatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#383139',
  },
  notifyBadge: {
    backgroundColor: '#c0efdc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  notifyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#383139',
  },
});
