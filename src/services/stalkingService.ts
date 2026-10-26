import { supabase, isSupabaseConfigured } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface BreadcrumbPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number; // meters per second
  heading?: number;
}

export interface StalkingTrackingSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'active' | 'resolved';
  latestLat: number;
  latestLng: number;
  latestHeading?: number;
  latestSpeed?: number;
  batteryLevel?: number;
  startedAt: string;
  endedAt?: string;
  breadcrumbs: BreadcrumbPoint[];
}

const ACTIVE_STALKING_SESSION_KEY = '@sentinela_active_stalking_session_v1';
let trackingSubscription: Location.LocationSubscription | null = null;
let activeSessionCache: StalkingTrackingSession | null = null;

/**
 * Checks if there is an ongoing local stalking tracking session
 */
export async function getActiveStalkingSession(): Promise<StalkingTrackingSession | null> {
  if (activeSessionCache) return activeSessionCache;
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_STALKING_SESSION_KEY);
    activeSessionCache = raw ? JSON.parse(raw) : null;
    return activeSessionCache;
  } catch {
    return null;
  }
}

/**
 * Starts the "Estou a ser seguido(a)" live breadcrumb tracking session
 */
export async function startStalkingTrackingSession(params: {
  userId: string;
  userName: string;
  userAvatar?: string;
  initialCoords: { latitude: number; longitude: number; speed?: number; heading?: number };
}): Promise<StalkingTrackingSession> {
  const sessionId = `stalk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const initialPoint: BreadcrumbPoint = {
    latitude: params.initialCoords.latitude,
    longitude: params.initialCoords.longitude,
    timestamp: Date.now(),
    speed: params.initialCoords.speed,
    heading: params.initialCoords.heading,
  };

  const newSession: StalkingTrackingSession = {
    id: sessionId,
    userId: params.userId,
    userName: params.userName,
    userAvatar: params.userAvatar,
    status: 'active',
    latestLat: params.initialCoords.latitude,
    latestLng: params.initialCoords.longitude,
    latestHeading: params.initialCoords.heading,
    latestSpeed: params.initialCoords.speed,
    batteryLevel: 85, // estimated default
    startedAt: new Date().toISOString(),
    breadcrumbs: [initialPoint],
  };

  activeSessionCache = newSession;
  await AsyncStorage.setItem(ACTIVE_STALKING_SESSION_KEY, JSON.stringify(newSession));

  // 1. Publish session creation to Supabase
  if (isSupabaseConfigured() && params.userId) {
    try {
      await supabase.from('stalking_sessions').insert([
        {
          id: newSession.id,
          user_id: newSession.userId,
          user_name: newSession.userName,
          user_avatar: newSession.userAvatar || null,
          status: 'active',
          latest_lat: newSession.latestLat,
          latest_lng: newSession.latestLng,
          latest_heading: newSession.latestHeading || null,
          latest_speed: newSession.latestSpeed || null,
          battery_level: newSession.batteryLevel,
          breadcrumbs: newSession.breadcrumbs,
          started_at: newSession.startedAt,
        },
      ]);
    } catch (err) {
      console.warn('Erro ao criar sessão de perseguição no Supabase:', err);
    }
  }

  // 2. Start high-frequency location watcher (every 3 seconds or 5 meters)
  try {
    if (trackingSubscription) {
      trackingSubscription.remove();
    }

    trackingSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 4,
      },
      async (loc) => {
        const point: BreadcrumbPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: Date.now(),
          speed: loc.coords.speed !== null && loc.coords.speed !== undefined ? Math.max(0, loc.coords.speed) : undefined,
          heading: loc.coords.heading !== null && loc.coords.heading !== undefined ? loc.coords.heading : undefined,
        };

        await recordBreadcrumbPoint(sessionId, point);
      }
    );
  } catch (err) {
    console.warn('Erro ao iniciar watchPosition no modo estou a ser seguido:', err);
  }

  return newSession;
}

/**
 * Records an individual breadcrumb point and updates the session both locally and in Supabase
 */
export async function recordBreadcrumbPoint(sessionId: string, point: BreadcrumbPoint): Promise<void> {
  const current = activeSessionCache || (await getActiveStalkingSession());
  if (!current || current.id !== sessionId || current.status !== 'active') return;

  // Append breadcrumb (keep last 300 points)
  const updatedBreadcrumbs = [...current.breadcrumbs, point].slice(-300);

  const updatedSession: StalkingTrackingSession = {
    ...current,
    latestLat: point.latitude,
    latestLng: point.longitude,
    latestHeading: point.heading ?? current.latestHeading,
    latestSpeed: point.speed ?? current.latestSpeed,
    breadcrumbs: updatedBreadcrumbs,
  };

  activeSessionCache = updatedSession;
  await AsyncStorage.setItem(ACTIVE_STALKING_SESSION_KEY, JSON.stringify(updatedSession));

  // Sync to Supabase
  if (isSupabaseConfigured() && current.userId) {
    try {
      await supabase
        .from('stalking_sessions')
        .update({
          latest_lat: point.latitude,
          latest_lng: point.longitude,
          latest_heading: point.heading ?? null,
          latest_speed: point.speed ?? null,
          breadcrumbs: updatedBreadcrumbs,
        })
        .eq('id', sessionId);
    } catch (err) {
      console.warn('Erro ao atualizar rastro no Supabase:', err);
    }
  }
}

/**
 * Stops the active stalking tracking session ("Estou em Segurança")
 */
export async function stopStalkingTrackingSession(sessionId: string): Promise<void> {
  if (trackingSubscription) {
    trackingSubscription.remove();
    trackingSubscription = null;
  }

  const endedAt = new Date().toISOString();
  if (activeSessionCache && activeSessionCache.id === sessionId) {
    activeSessionCache = {
      ...activeSessionCache,
      status: 'resolved',
      endedAt,
    };
  }

  await AsyncStorage.removeItem(ACTIVE_STALKING_SESSION_KEY);

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('stalking_sessions')
        .update({
          status: 'resolved',
          ended_at: endedAt,
        })
        .eq('id', sessionId);
    } catch (err) {
      console.warn('Erro ao finalizar sessão no Supabase:', err);
    }
  }

  activeSessionCache = null;
}

/**
 * Subscribes a Sentinel to all active stalking sessions from users who added them as Sentinel
 */
export function subscribeToStalkingAlertsForSentinel(
  sentinelUserId: string,
  onAlert: (session: StalkingTrackingSession) => void,
  onResolved?: (sessionId: string) => void
): () => void {
  if (!isSupabaseConfigured() || !sentinelUserId) {
    return () => {};
  }

  // Realtime channel on stalking_sessions
  const channel: RealtimeChannel = supabase
    .channel('public:stalking_sessions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stalking_sessions',
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const row: any = payload.new;
          if (row.status === 'active') {
            onAlert({
              id: row.id,
              userId: row.user_id,
              userName: row.user_name,
              userAvatar: row.user_avatar,
              status: row.status,
              latestLat: row.latest_lat,
              latestLng: row.latest_lng,
              latestHeading: row.latest_heading,
              latestSpeed: row.latest_speed,
              batteryLevel: row.battery_level,
              startedAt: row.started_at,
              breadcrumbs: row.breadcrumbs || [],
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const row: any = payload.new;
          if (row.status === 'resolved') {
            onResolved?.(row.id);
          } else if (row.status === 'active') {
            onAlert({
              id: row.id,
              userId: row.user_id,
              userName: row.user_name,
              userAvatar: row.user_avatar,
              status: row.status,
              latestLat: row.latest_lat,
              latestLng: row.latest_lng,
              latestHeading: row.latest_heading,
              latestSpeed: row.latest_speed,
              batteryLevel: row.battery_level,
              startedAt: row.started_at,
              breadcrumbs: row.breadcrumbs || [],
            });
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetches active stalking session details for live following
 */
export async function fetchLiveStalkingSession(sessionId: string): Promise<StalkingTrackingSession | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('stalking_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      userAvatar: data.user_avatar,
      status: data.status,
      latestLat: data.latest_lat,
      latestLng: data.latest_lng,
      latestHeading: data.latest_heading,
      latestSpeed: data.latest_speed,
      batteryLevel: data.battery_level,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      breadcrumbs: data.breadcrumbs || [],
    };
  } catch {
    return null;
  }
}
