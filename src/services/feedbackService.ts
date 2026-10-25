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

export async function submitUserFeedback(feedback: {
  type: FeedbackType;
  title: string;
  description: string;
  contactInfo?: string;
  latitude?: number | null;
  longitude?: number | null;
  includeDevice?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const deviceInfo = feedback.includeDevice
    ? `${Platform.OS.toUpperCase()} ${Platform.Version} (Sentinela Mobile v1.1.0)`
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
  } catch (err) {
    console.warn('Erro ao salvar feedback localmente:', err);
  }

  // 2. Forward to Supabase table 'feedback'
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('feedback').insert([
        {
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          contact_info: item.contactInfo || null,
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          device_info: item.deviceInfo || null,
          created_at: new Date(item.createdAt).toISOString(),
        },
      ]);

      if (error) {
        console.warn('Aviso ao enviar feedback para o Supabase:', error.message);
        // Stored locally, will inform user positively
        return {
          success: true,
          message: 'Feedback registado com sucesso no seu dispositivo e em fila para sincronização!',
        };
      }

      return {
        success: true,
        message: 'Obrigado! O seu relatório foi enviado diretamente à equipa do Sentinela.',
      };
    } catch (netErr: any) {
      console.warn('Falha de rede ao submeter feedback:', netErr);
      return {
        success: true,
        message: 'Feedback guardado localmente e será sincronizado quando houver ligação.',
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
