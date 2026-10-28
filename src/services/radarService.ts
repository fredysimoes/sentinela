import { supabase, isSupabaseConfigured } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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
