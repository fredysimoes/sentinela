import { supabase, isSupabaseConfigured } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SentinelContact {
  id: string; // sentinel user_id
  name: string;
  email?: string;
  avatarUrl?: string;
  sentinelCode: string;
  status: 'active' | 'pending';
  addedAt: number;
}

const SENTINELS_CACHE_KEY = '@sentinela_my_sentinels_cache_v1';

/**
 * Loads cached sentinels from local storage
 */
export async function getCachedSentinels(): Promise<SentinelContact[]> {
  try {
    const raw = await AsyncStorage.getItem(SENTINELS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves sentinels to local cache
 */
export async function saveCachedSentinels(sentinels: SentinelContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SENTINELS_CACHE_KEY, JSON.stringify(sentinels));
  } catch (err) {
    console.warn('Erro ao guardar sentinelas em cache:', err);
  }
}

/**
 * Fetches all active Sentinels for a given user from Supabase
 */
export async function fetchMySentinels(userId: string): Promise<SentinelContact[]> {
  if (!isSupabaseConfigured() || !userId) {
    return await getCachedSentinels();
  }

  try {
    const { data, error } = await supabase
      .from('sentinels')
      .select(`
        id,
        sentinel_id,
        status,
        created_at,
        profiles:sentinel_id (
          id,
          full_name,
          email,
          avatar_url,
          sentinel_code
        )
      `)
      .eq('user_id', userId);

    if (error || !data) {
      console.warn('Erro ao obter sentinelas do Supabase:', error);
      return await getCachedSentinels();
    }

    const result: SentinelContact[] = data
      .filter((row: any) => row.profiles)
      .map((row: any) => ({
        id: row.profiles.id,
        name: row.profiles.full_name || 'Sentinela',
        email: row.profiles.email,
        avatarUrl: row.profiles.avatar_url || undefined,
        sentinelCode: row.profiles.sentinel_code || 'ST-????',
        status: row.status as 'active' | 'pending',
        addedAt: new Date(row.created_at).getTime(),
      }));

    await saveCachedSentinels(result);
    return result;
  } catch (err) {
    console.warn('Falha ao contactar tabela sentinels:', err);
    return await getCachedSentinels();
  }
}

/**
 * Fetches users who have chosen ME as their Sentinel
 */
export async function fetchPeopleIProtect(myUserId: string): Promise<SentinelContact[]> {
  if (!isSupabaseConfigured() || !myUserId) return [];

  try {
    const { data, error } = await supabase
      .from('sentinels')
      .select(`
        id,
        user_id,
        status,
        created_at,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url,
          sentinel_code
        )
      `)
      .eq('sentinel_id', myUserId);

    if (error || !data) return [];

    return data
      .filter((row: any) => row.profiles)
      .map((row: any) => ({
        id: row.profiles.id,
        name: row.profiles.full_name || 'Protegido',
        email: row.profiles.email,
        avatarUrl: row.profiles.avatar_url || undefined,
        sentinelCode: row.profiles.sentinel_code || 'ST-????',
        status: row.status as 'active' | 'pending',
        addedAt: new Date(row.created_at).getTime(),
      }));
  } catch (err) {
    console.warn('Erro ao obter utilizadores que protejo:', err);
    return [];
  }
}

/**
 * Adds a Sentinel by their unique Sentinel Code (e.g. "ST-7842") or Email
 */
export async function addSentinelByCodeOrEmail(
  myUserId: string,
  codeOrEmail: string
): Promise<{ success: boolean; sentinel?: SentinelContact; message: string }> {
  const query = codeOrEmail.trim();
  if (!query) {
    return { success: false, message: 'Insira um código de Sentinela (ex: ST-4829) ou email.' };
  }

  if (!isSupabaseConfigured() || !myUserId) {
    // Offline simulation mode
    const fakeSentinel: SentinelContact = {
      id: `sentinel-${Date.now()}`,
      name: query.includes('@') ? query.split('@')[0] : `Sentinela (${query.toUpperCase()})`,
      email: query.includes('@') ? query : undefined,
      sentinelCode: query.toUpperCase(),
      status: 'active',
      addedAt: Date.now(),
    };
    const cached = await getCachedSentinels();
    cached.unshift(fakeSentinel);
    await saveCachedSentinels(cached);
    return { success: true, sentinel: fakeSentinel, message: 'Sentinela adicionado ao seu círculo local!' };
  }

  try {
    // 1. Search for profile by sentinel_code or email
    const isEmail = query.includes('@');
    let builder = supabase.from('profiles').select('id, full_name, email, avatar_url, sentinel_code');

    if (isEmail) {
      builder = builder.eq('email', query.toLowerCase());
    } else {
      builder = builder.ilike('sentinel_code', query.toUpperCase());
    }

    const { data: foundProfiles, error: searchErr } = await builder.limit(1);

    if (searchErr || !foundProfiles || foundProfiles.length === 0) {
      return {
        success: false,
        message: `Nenhum utilizador encontrado com o código ou email "${query}". Verifique se o contacto já tem a app instalada.`,
      };
    }

    const target = foundProfiles[0];

    // Cannot add self
    if (target.id === myUserId) {
      return { success: false, message: 'Não pode adicionar-se a si próprio como Sentinela.' };
    }

    // 2. Insert into sentinels relationship table
    const { error: insertErr } = await supabase.from('sentinels').insert([
      {
        user_id: myUserId,
        sentinel_id: target.id,
        status: 'active',
      },
    ]);

    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message.includes('unique')) {
        return { success: false, message: 'Este contacto já é seu Sentinela!' };
      }
      return { success: false, message: `Erro ao adicionar: ${insertErr.message}` };
    }

    const newSentinel: SentinelContact = {
      id: target.id,
      name: target.full_name || 'Sentinela',
      email: target.email,
      avatarUrl: target.avatar_url || undefined,
      sentinelCode: target.sentinel_code,
      status: 'active',
      addedAt: Date.now(),
    };

    // Update local cache
    const currentCached = await getCachedSentinels();
    const updated = [newSentinel, ...currentCached.filter((c) => c.id !== newSentinel.id)];
    await saveCachedSentinels(updated);

    return {
      success: true,
      sentinel: newSentinel,
      message: `${newSentinel.name} foi adicionado(a) com sucesso aos seus Sentinelas!`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Falha ao ligar ao servidor.' };
  }
}

/**
 * Removes a Sentinel from user's circle
 */
export async function removeSentinel(myUserId: string, sentinelId: string): Promise<boolean> {
  // 1. Remove from cache
  const cached = await getCachedSentinels();
  await saveCachedSentinels(cached.filter((s) => s.id !== sentinelId));

  if (!isSupabaseConfigured() || !myUserId) return true;

  try {
    const { error } = await supabase
      .from('sentinels')
      .delete()
      .eq('user_id', myUserId)
      .eq('sentinel_id', sentinelId);

    return !error;
  } catch {
    return false;
  }
}
