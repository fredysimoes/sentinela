import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

export type FeedbackType = 'bug' | 'map_correction' | 'suggestion' | 'other';

export interface UserFeedback {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  contactInfo?: string;
  latitude?: number | null;
  longitude?: number | null;
  deviceInfo?: string;
  createdAt: number;
}

const STORAGE_KEY = '@sentinela_feedback_log_v1';
const PENDING_STORAGE_KEY = '@sentinela_pending_feedback_v1';

/**
 * Tries to sync any pending feedback items stored locally to Supabase.
 */
export async function syncPendingFeedback(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  try {
    const raw = await AsyncStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return 0;
    const pendingList: UserFeedback[] = JSON.parse(raw);
    if (pendingList.length === 0) return 0;

    const remaining: UserFeedback[] = [];
    let syncedCount = 0;

    for (const item of pendingList) {
      const payload: any = {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        contact_info: item.contactInfo || null,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        device_info: item.deviceInfo || null,
        created_at: new Date(item.createdAt).toISOString(),
      };

      let { error } = await supabase.from('feedback').insert([payload]);

      // If database id is numeric/bigint, retry omitting client string id
      if (error && (error.message.includes('bigint') || error.code === '22P02')) {
        delete payload.id;
        const retry = await supabase.from('feedback').insert([payload]);
        error = retry.error;
      }

      if (!error) {
        syncedCount++;
      } else {
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(remaining));
    return syncedCount;
  } catch (err) {
    console.warn('Erro ao sincronizar feedbacks pendentes:', err);
    return 0;
  }
}

export async function submitUserFeedback(feedback: {
  type: FeedbackType;
  title: string;
  description: string;
  contactInfo?: string;
  latitude?: number | null;
  longitude?: number | null;
  includeDevice?: boolean;
}): Promise<{ success: boolean; message: string; tableMissing?: boolean }> {
  const deviceInfo = feedback.includeDevice
    ? `${Platform.OS.toUpperCase()} ${Platform.Version} (Sentinela Mobile v1.2.0)`
    : undefined;

  const item: UserFeedback = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: feedback.type,
    title: feedback.title.trim(),
    description: feedback.description.trim(),
    contactInfo: feedback.contactInfo?.trim() || undefined,
    latitude: feedback.latitude,
    longitude: feedback.longitude,
    deviceInfo,
    createdAt: Date.now(),
  };

  // 1. Always save locally first as durable backup
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list: UserFeedback[] = raw ? JSON.parse(raw) : [];
    list.unshift(item);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));

    // Add to pending queue
    const pendingRaw = await AsyncStorage.getItem(PENDING_STORAGE_KEY);
    const pendingList: UserFeedback[] = pendingRaw ? JSON.parse(pendingRaw) : [];
    pendingList.unshift(item);
    await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingList.slice(0, 50)));
  } catch (err) {
    console.warn('Erro ao salvar feedback localmente:', err);
  }

  // 2. Forward to Supabase table 'feedback'
  if (isSupabaseConfigured()) {
    try {
      const payload: any = {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        contact_info: item.contactInfo || null,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        device_info: item.deviceInfo || null,
        created_at: new Date(item.createdAt).toISOString(),
      };

      let { error } = await supabase.from('feedback').insert([payload]);

      // If database id is numeric/bigint, retry omitting client string id
      if (error && (error.message.includes('bigint') || error.code === '22P02')) {
        delete payload.id;
        const retry = await supabase.from('feedback').insert([payload]);
        error = retry.error;
      }

      if (error) {
        console.warn('Aviso ao enviar feedback para o Supabase:', error.message);
        const isTableMissing = error.message.includes('Could not find the table') || error.code === '42P01';

        if (isTableMissing) {
          return {
            success: false,
            tableMissing: true,
            message:
              'Aviso: A tabela "feedback" ainda não existe no seu projeto Supabase.\n\nO feedback ficou guardado no telemóvel e será enviado automaticamente assim que criar a tabela no painel do Supabase.',
          };
        }

        return {
          success: false,
          message: `Falha ao registar no Supabase: ${error.message}. O feedback ficou guardado localmente e será reenviado.`,
        };
      }

      // Success in Supabase: remove from pending queue
      try {
        const pendingRaw = await AsyncStorage.getItem(PENDING_STORAGE_KEY);
        if (pendingRaw) {
          const pendingList: UserFeedback[] = JSON.parse(pendingRaw);
          const filtered = pendingList.filter((p) => p.id !== item.id);
          await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(filtered));
        }
      } catch (_) {}

      // Also try to sync any other older pending items
      syncPendingFeedback().catch(() => {});

      return {
        success: true,
        message: 'Obrigado! O seu feedback foi gravado com sucesso no Supabase e encaminhado à equipa.',
      };
    } catch (netErr: any) {
      console.warn('Falha de rede ao submeter feedback:', netErr);
      return {
        success: true,
        message: 'Sem ligação ao servidor. O feedback foi guardado no telemóvel e será sincronizado quando houver rede.',
      };
    }
  }

  return {
    success: true,
    message: 'Feedback guardado com sucesso no dispositivo.',
  };
}

export async function getLocalFeedbackHistory(): Promise<UserFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
