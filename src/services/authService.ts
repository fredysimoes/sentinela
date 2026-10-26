import { supabase, isSupabaseConfigured } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Linking, Platform } from 'react-native';

// Complete WebBrowser auth session if returning from OAuth
WebBrowser.maybeCompleteAuthSession();

export interface UserProfile {
  id: string; // Supabase auth.uid
  email: string;
  name: string;
  avatarUrl?: string;
  sentinelCode: string; // e.g. "ST-8492"
  createdAt?: string;
}

const PROFILE_STORAGE_KEY = '@sentinela_user_profile_v1';
const SENTINEL_CODE_KEY = '@sentinela_my_sentinel_code_v1';

/**
 * Generates a unique, friendly 6-character Sentinel Code (e.g. ST-7294)
 */
export function generateSentinelCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    randomPart += chars[idx];
  }
  return `ST-${randomPart}`;
}

/**
 * Gets or creates a local fallback Sentinel Code
 */
export async function getLocalSentinelCode(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SENTINEL_CODE_KEY);
    if (stored) return stored;
    const fresh = generateSentinelCode();
    await AsyncStorage.setItem(SENTINEL_CODE_KEY, fresh);
    return fresh;
  } catch {
    return 'ST-9999';
  }
}

/**
 * Loads current cached user profile from storage
 */
export async function getCachedProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves profile to cache
 */
export async function saveCachedProfile(profile: UserProfile | null): Promise<void> {
  try {
    if (profile) {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Erro ao guardar perfil localmente:', err);
  }
}

/**
 * Fetches user profile from Supabase profiles table, or creates it if not existing
 */
export async function fetchOrCreateProfile(user: any): Promise<UserProfile> {
  const fallbackCode = await getLocalSentinelCode();
  const email = user.email || '';
  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email.split('@')[0] ||
    'Utilizador Sentinela';
  const metaAvatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    undefined;

  if (!isSupabaseConfigured()) {
    const localProf: UserProfile = {
      id: user.id || 'local-user',
      email,
      name: metaName,
      avatarUrl: metaAvatar,
      sentinelCode: fallbackCode,
    };
    await saveCachedProfile(localProf);
    return localProf;
  }

  try {
    // 1. Try to fetch existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      const prof: UserProfile = {
        id: data.id,
        email: data.email || email,
        name: data.full_name || metaName,
        avatarUrl: data.avatar_url || metaAvatar,
        sentinelCode: data.sentinel_code || fallbackCode,
        createdAt: data.created_at,
      };
      await saveCachedProfile(prof);
      return prof;
    }

    // 2. Profile doesn't exist yet, insert fresh profile
    const freshProfile = {
      id: user.id,
      email,
      full_name: metaName,
      avatar_url: metaAvatar || null,
      sentinel_code: fallbackCode,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert([freshProfile])
      .select()
      .single();

    if (inserted && !insertError) {
      const prof: UserProfile = {
        id: inserted.id,
        email: inserted.email,
        name: inserted.full_name,
        avatarUrl: inserted.avatar_url || undefined,
        sentinelCode: inserted.sentinel_code,
        createdAt: inserted.created_at,
      };
      await saveCachedProfile(prof);
      return prof;
    }
  } catch (err) {
    console.warn('Erro ao aceder à tabela profiles no Supabase:', err);
  }

  // Fallback to local profile
  const fallbackProf: UserProfile = {
    id: user.id,
    email,
    name: metaName,
    avatarUrl: metaAvatar,
    sentinelCode: fallbackCode,
  };
  await saveCachedProfile(fallbackProf);
  return fallbackProf;
}

/**
 * Signs in with Email and Password
 */
export async function signInWithEmail(email: string, pass: string): Promise<{ user: any; profile: UserProfile | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null, error: 'Supabase não configurado.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error || !data.user) {
      return { user: null, profile: null, error: error?.message || 'Falha ao autenticar.' };
    }

    const profile = await fetchOrCreateProfile(data.user);
    return { user: data.user, profile };
  } catch (err: any) {
    return { user: null, profile: null, error: err.message || 'Erro de rede ao entrar.' };
  }
}

/**
 * Registers with Email, Password and Full Name
 */
export async function signUpWithEmail(email: string, pass: string, name: string): Promise<{ user: any; profile: UserProfile | null; error?: string; message?: string }> {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null, error: 'Supabase não configurado.' };
  }

  try {
    const sentinelCode = await getLocalSentinelCode();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          full_name: name.trim(),
          sentinel_code: sentinelCode,
        },
      },
    });

    if (error) {
      return { user: null, profile: null, error: error.message };
    }

    if (data.user) {
      const profile = await fetchOrCreateProfile(data.user);
      return {
        user: data.user,
        profile,
        message: data.session ? 'Conta criada com sucesso!' : 'Conta criada! Verifique o seu email para confirmar a conta.',
      };
    }

    return { user: null, profile: null, error: 'Erro desconhecido ao criar conta.' };
  } catch (err: any) {
    return { user: null, profile: null, error: err.message || 'Erro ao criar conta.' };
  }
}

/**
 * Extracts query and hash parameters directly from a URL string without relying
 * on React Native's Blob/URL.js polyfill (whose `hash` getter truncates at `/`).
 */
function extractAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIdx = url.indexOf('#');
  const queryIdx = url.indexOf('?');

  const parseSegment = (segment: string) => {
    for (const pair of segment.split('&')) {
      if (!pair) continue;
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;
      try {
        const key = decodeURIComponent(pair.slice(0, eqIdx).replace(/\+/g, ' '));
        const val = decodeURIComponent(pair.slice(eqIdx + 1).replace(/\+/g, ' '));
        params[key] = val;
      } catch {
        const key = pair.slice(0, eqIdx);
        const val = pair.slice(eqIdx + 1);
        params[key] = val;
      }
    }
  };

  if (queryIdx !== -1) {
    const queryEnd = hashIdx !== -1 && hashIdx > queryIdx ? hashIdx : url.length;
    parseSegment(url.slice(queryIdx + 1, queryEnd));
  }
  if (hashIdx !== -1) {
    parseSegment(url.slice(hashIdx + 1));
  }
  return params;
}

let inFlightCallbackPromise: Promise<{ user: any; profile: UserProfile | null; error?: string }> | null = null;
let lastProcessedCallbackUrl: string | null = null;

async function processOAuthRedirectUrl(
  url: string
): Promise<{ user: any; profile: UserProfile | null; error?: string }> {
  if (lastProcessedCallbackUrl === url && inFlightCallbackPromise) {
    return inFlightCallbackPromise;
  }

  lastProcessedCallbackUrl = url;
  inFlightCallbackPromise = (async () => {
    const params = extractAuthParams(url);

    if (params.error_description || params.error) {
      return {
        user: null,
        profile: null,
        error: params.error_description || params.error,
      };
    }

    const code = params.code;
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (code) {
      const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeErr || !exchangeData.user) {
        return {
          user: null,
          profile: null,
          error: exchangeErr?.message || 'Erro ao validar código de sessão Google.',
        };
      }
      const profile = await fetchOrCreateProfile(exchangeData.user);
      return { user: exchangeData.user, profile };
    }

    if (accessToken) {
      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionErr || !sessionData.user) {
        return {
          user: null,
          profile: null,
          error: sessionErr?.message || 'Erro ao validar sessão Google.',
        };
      }

      const profile = await fetchOrCreateProfile(sessionData.user);
      return { user: sessionData.user, profile };
    }

    return { user: null, profile: null };
  })();

  return inFlightCallbackPromise;
}

/**
 * Initializes deep link listener to handle OAuth redirect callbacks seamlessly
 */
export function initAuthDeepLinkListener(onProfileLoaded?: (profile: UserProfile) => void): () => void {
  const handleDeepLink = async (url: string | null) => {
    if (!url || !url.startsWith('sentinela://')) return;
    try {
      const res = await processOAuthRedirectUrl(url);
      if (res.profile) {
        onProfileLoaded?.(res.profile);
      }
    } catch (e) {
      console.warn('Erro ao processar deep link de auth:', e);
    }
  };

  Linking.getInitialURL().then((url) => handleDeepLink(url || null));
  const subscription = Linking.addEventListener('url', ({ url }: { url: string }) => handleDeepLink(url));

  return () => {
    subscription.remove();
  };
}

/**
 * Signs in with Google via Supabase OAuth using Expo WebBrowser
 */
export async function signInWithGoogle(): Promise<{ user: any; profile: UserProfile | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null, error: 'Supabase não configurado.' };
  }

  try {
    // Generate OAuth redirect URL for sentinela scheme
    const redirectUrl = 'sentinela://auth/callback';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      return { user: null, profile: null, error: error?.message || 'Não foi possível iniciar o login Google.' };
    }

    // Open WebBrowser OAuth session
    inFlightCallbackPromise = null;
    lastProcessedCallbackUrl = null;
    const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (authResult.type === 'success' && authResult.url) {
      const res = await processOAuthRedirectUrl(authResult.url);
      if (res.user && res.profile) {
        return res;
      }
      if (res.error) {
        return res;
      }
    }

    // On Android, AppState 'active' often wins Promise.race in expo-web-browser
    // slightly before the Linking 'url' event arrives from MainActivity.onNewIntent.
    if (!inFlightCallbackPromise) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    if (inFlightCallbackPromise) {
      const pendingResult: { user: any; profile: UserProfile | null; error?: string } =
        await inFlightCallbackPromise;
      if (pendingResult.user && pendingResult.profile) {
        return pendingResult;
      }
      if (pendingResult.error) {
        return pendingResult;
      }
    }

    // Check if session was already established (e.g. via Linking listener when returning from Custom Tabs)
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.session?.user) {
      const profile = await fetchOrCreateProfile(currentSession.session.user);
      return { user: currentSession.session.user, profile };
    }

    return { user: null, profile: null, error: 'Autenticação cancelada.' };
  } catch (err: any) {
    console.warn('Erro durante login com Google:', err);
    return { user: null, profile: null, error: err.message || 'Erro durante login com Google.' };
  }
}

/**
 * Signs out current user
 */
export async function signOutUser(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    await saveCachedProfile(null);
  } catch (err) {
    console.warn('Erro ao terminar sessão:', err);
  }
}

/**
 * Subscribes to auth state changes
 */
export function onAuthStateChange(callback: (profile: UserProfile | null) => void): () => void {
  // 1. Initial check
  supabase.auth.getSession().then(({ data }) => {
    if (data?.session?.user) {
      fetchOrCreateProfile(data.session.user).then(callback);
    } else {
      getCachedProfile().then(callback);
    }
  });

  // 2. Auth state subscription
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const prof = await fetchOrCreateProfile(session.user);
      callback(prof);
    } else {
      await saveCachedProfile(null);
      callback(null);
    }
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}
