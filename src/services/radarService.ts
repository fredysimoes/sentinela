import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase, isSupabaseConfigured } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import Haptics, { NotificationFeedbackType } from '../utils/haptics';

export interface RadarPeer {
  peerId: string;
  displayName: string;
  role: 'beacon' | 'seeker'; // 'beacon' = waiting in crowd / broadcasting; 'seeker' = navigating towards beacon
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  lastSeen: number;
}

export interface RadarSessionHandle {
  pin: string;
  channel: RealtimeChannel | null;
  myPeerId: string;
  role: 'beacon' | 'seeker';
}

/**
 * Generates an easy-to-read 4-digit PIN for crowd radar session
 */
export function generateRadarPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generates a unique ephemeral peer ID for the current session
 */
export function generatePeerId(): string {
  return `peer-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Joins or creates a Realtime Radar Room using Supabase Broadcast
 */
export function joinRadarRoom({
  pin,
  myPeerId,
  displayName,
  role,
  onPeerUpdate,
  onStrobeTrigger,
  onPeerLeft,
}: {
  pin: string;
  myPeerId: string;
  displayName: string;
  role: 'beacon' | 'seeker';
  onPeerUpdate: (peer: RadarPeer) => void;
  onStrobeTrigger: (fromName: string) => void;
  onPeerLeft?: (peerId: string) => void;
}): RadarSessionHandle {
  if (!isSupabaseConfigured()) {
    console.warn('[RadarService] Supabase offline/não configurado. Modo local ativado.');
    return { pin, channel: null, myPeerId, role };
  }

  try {
    const channelName = `radar:${pin}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: myPeerId },
      },
    });

    // 1. Listen for peer location and orientation updates
    channel.on('broadcast', { event: 'peer_loc' }, ({ payload }) => {
      if (!payload || payload.peerId === myPeerId) return;

      onPeerUpdate({
        peerId: payload.peerId,
        displayName: payload.displayName || 'Amigo',
        role: payload.role,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        heading: payload.heading,
        lastSeen: Date.now(),
      });
    });

    // 2. Listen for remote optical/strobe signal request
    channel.on('broadcast', { event: 'strobe_trigger' }, ({ payload }) => {
      if (!payload || payload.fromPeerId === myPeerId) return;
      onStrobeTrigger(payload.fromName || 'O seu amigo');
    });

    // 3. Track presence leaves
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (leftPresences && onPeerLeft) {
        leftPresences.forEach((p: any) => {
          if (p.key && p.key !== myPeerId) {
            onPeerLeft(p.key);
          }
        });
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          peerId: myPeerId,
          displayName,
          role,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    return {
      pin,
      channel,
      myPeerId,
      role,
    };
  } catch (err) {
    console.warn('[RadarService] Erro ao subscrever sala radar:', err);
    return { pin, channel: null, myPeerId, role };
  }
}

/**
 * Broadcasts my current GPS location and compass orientation to peers in the room
 */
export async function broadcastRadarLocation(
  handle: RadarSessionHandle,
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    displayName: string;
  }
): Promise<void> {
  if (!handle.channel) return;

  try {
    await handle.channel.send({
      type: 'broadcast',
      event: 'peer_loc',
      payload: {
        peerId: handle.myPeerId,
        displayName: location.displayName,
        role: handle.role,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('[RadarService] Erro ao transmitir posição:', err);
  }
}

/**
 * Sends a remote strobe/flashlight trigger event to the friend's phone
 */
export async function sendRadarStrobeSignal(
  handle: RadarSessionHandle,
  fromName: string
): Promise<void> {
  if (!handle.channel) return;

  try {
    await handle.channel.send({
      type: 'broadcast',
      event: 'strobe_trigger',
      payload: {
        fromPeerId: handle.myPeerId,
        fromName,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('[RadarService] Erro ao enviar sinal de strobe:', err);
  }
}

/**
 * Leaves and unsubscribes from the Realtime room
 */
export async function leaveRadarRoom(handle: RadarSessionHandle): Promise<void> {
  if (!handle.channel) return;
  try {
    await handle.channel.unsubscribe();
  } catch (err) {
    console.warn('[RadarService] Erro ao sair da sala radar:', err);
  }
}

/**
 * Creates standardized share message with deep link for SMS/WhatsApp
 */
export function createRadarShareMessage(pin: string): string {
  const webLink = `https://sentinela.app/radar?pin=${pin}`;
  const appLink = `sentinela://radar?pin=${pin}`;
  return `Sentinela - Estou aqui na multidão!\nCódigo PIN: ${pin}\n\nLink direto para abrir na app:\n${webLink}\n\n(Ou toca no deep link: ${appLink})`;
}

/**
 * Creates message with only the PIN code and instruction
 */
export function createRadarPinMessage(pin: string): string {
  return `Sentinela: Estou no meio da multidão. O meu código PIN de radar é: ${pin}`;
}

/**
 * Creates message with only the direct link so it is immediately clickable
 */
export function createRadarLinkMessage(pin: string): string {
  return `https://sentinela.app/radar?pin=${pin}`;
}

/**
 * Shares Radar PIN directly to WhatsApp with app deep link
 */
export async function shareRadarWhatsApp(
  pin: string,
  mode: 'full' | 'code' | 'link' = 'full',
  phone: string = ''
): Promise<void> {
  const message =
    mode === 'code'
      ? createRadarPinMessage(pin)
      : mode === 'link'
      ? createRadarLinkMessage(pin)
      : createRadarShareMessage(pin);

  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const encodedMsg = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    const fallback = `https://wa.me/?text=${encodedMsg}`;
    await Linking.openURL(fallback);
  }
}

/**
 * Shares Radar PIN directly via SMS with app deep link
 */
export async function shareRadarSMS(
  pin: string,
  mode: 'full' | 'code' | 'link' = 'full',
  phone: string = ''
): Promise<void> {
  const message =
    mode === 'code'
      ? createRadarPinMessage(pin)
      : mode === 'link'
      ? createRadarLinkMessage(pin)
      : createRadarShareMessage(pin);

  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const encodedMsg = encodeURIComponent(message);
  const url = cleanPhone
    ? `sms:${cleanPhone}${separator}body=${encodedMsg}`
    : `sms:${separator}body=${encodedMsg}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(`sms:${separator}body=${encodedMsg}`);
  }
}

/**
 * Sends a direct system/realtime notification to a Sentinel contact
 */
export async function notifySentinelsOfRadarSession(params: {
  pin: string;
  senderName: string;
  senderId?: string;
  targetSentinelId?: string;
  targetSentinelName?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // 1. If Supabase is active, broadcast to real-time channel
    if (isSupabaseConfigured()) {
      const channel = supabase.channel('sentinels:radar_alerts');
      await channel.send({
        type: 'broadcast',
        event: 'radar_invite',
        payload: {
          pin: params.pin,
          senderName: params.senderName,
          senderId: params.senderId,
          targetSentinelId: params.targetSentinelId,
          timestamp: Date.now(),
        },
      });
    }

    // 2. Schedule system notification with sound & vibration
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Radar Sentinela: Pedido de Ligação',
        body: `${params.senderName} está à sua espera na multidão. Toque aqui para abrir o radar diretamente.`,
        data: {
          type: 'radar_invite',
          pin: params.pin,
          senderName: params.senderName,
        },
        sound: 'default',
        color: '#10B981',
      },
      trigger: null,
    });

    Haptics.notificationAsync(NotificationFeedbackType.Success);

    const targetLabel = params.targetSentinelName ? ` para ${params.targetSentinelName}` : ' para os seus Sentinelas';
    return {
      success: true,
      message: `Notificação enviada com sucesso${targetLabel}!`,
    };
  } catch (err: any) {
    console.warn('[RadarService] Erro ao enviar notificação ao Sentinela:', err);
    return {
      success: false,
      message: 'Não foi possível enviar a notificação neste momento.',
    };
  }
}

/**
 * Subscribes to real-time incoming radar invitations for a given Sentinel
 */
export function subscribeToRadarInvitesForSentinel(
  myUserId: string,
  onInvite: (data: { pin: string; senderName: string }) => void
): () => void {
  if (!isSupabaseConfigured() || !myUserId) {
    return () => {};
  }

  try {
    const channel = supabase.channel('sentinels:radar_alerts');
    channel.on('broadcast', { event: 'radar_invite' }, ({ payload }) => {
      if (!payload || payload.senderId === myUserId) return;
      if (!payload.targetSentinelId || payload.targetSentinelId === myUserId) {
        onInvite({
          pin: payload.pin,
          senderName: payload.senderName || 'Amigo',
        });
      }
    });
    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  } catch {
    return () => {};
  }
}
