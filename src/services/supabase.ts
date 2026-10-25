import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Incident, SOSAlert } from '../types';

/**
 * =========================================================================
 * SUPABASE CONFIGURATION
 * =========================================================================
 * Substitua os valores abaixo pelos do seu projeto Supabase:
 * Dashboard do Supabase -> Project Settings -> API:
 * 1. Project URL (ex: https://xyzcompany.supabase.co)
 * 2. Project API anon key (ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)
 * =========================================================================
 */
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://luzkwitvodcheeurvgij.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1emt3aXR2b2RjaGVldXJ2Z2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzU5NDcsImV4cCI6MjEwODUxMTk0N30.t9H1gV4r74wfyMhrN7grsToGMmGaEx_zSD-xy-8A0gY';

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('SUBSTITUA') &&
    !SUPABASE_ANON_KEY.includes('SUBSTITUA')
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Fetch all active community incidents from Supabase (ordered by most recent)
 */
export async function fetchOnlineIncidents(): Promise<Incident[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      console.warn('Erro ao carregar incidentes do Supabase:', error);
      return [];
    }

    // Filter out demo seeds and any incident where downvotes (dismissals) >= confirmations or marked defunct
    return data
      .filter(
        (row: any) =>
          !row.id.startsWith('seed-') &&
          (row.dismissals || 0) < (row.confirmations || 1) &&
          (row.dismissals || 0) < 5
      )
      .map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        category: row.category,
        severity: row.severity,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        createdAt: new Date(row.created_at).getTime(),
        confirmations: row.confirmations || 1,
        dismissals: row.dismissals || 0,
        verified: row.verified || false,
      }));
  } catch (err) {
    console.warn('Falha na ligação ao Supabase:', err);
    return [];
  }
}

/**
 * Inserts a new community incident report into Supabase
 */
export async function createOnlineIncident(incident: Incident): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.from('incidents').insert([
      {
        id: incident.id,
        title: incident.title,
        description: incident.description,
        category: incident.category,
        severity: incident.severity,
        latitude: incident.latitude,
        longitude: incident.longitude,
        confirmations: incident.confirmations,
        dismissals: incident.dismissals,
        created_at: new Date(incident.createdAt).toISOString(),
      },
    ]);

    if (error) {
      console.warn('Erro ao guardar incidente no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Erro ao enviar incidente para Supabase:', err);
    return false;
  }
}

/**
 * Confirms / Upvotes an incident in Supabase
 */
export async function confirmIncidentOnline(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.rpc('increment_confirmations', { incident_id: id });
    if (error) {
      // Fallback direct update if RPC is not defined
      const { data } = await supabase.from('incidents').select('confirmations').eq('id', id).single();
      if (data) {
        await supabase
          .from('incidents')
          .update({ confirmations: (data.confirmations || 0) + 1 })
          .eq('id', id);
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes / Removes an incident from Supabase (e.g. when community downvotes reach confirmations)
 */
export async function deleteIncidentOnline(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // 1. Soft-delete flag (always succeeds under UPDATE policy)
    await supabase.from('incidents').update({ dismissals: 999 }).eq('id', id);
    // 2. Hard-delete (succeeds if DELETE RLS policy is enabled)
    await supabase.from('incidents').delete().eq('id', id);
    return true;
  } catch (err) {
    console.warn('Falha ao apagar incidente online:', err);
    return false;
  }
}

/**
 * Dismisses / Downvotes an incident in Supabase.
 * If dismissals reach or exceed confirmations, automatically removes it from the database!
 */
export async function dismissIncidentOnline(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { data } = await supabase
      .from('incidents')
      .select('confirmations, dismissals')
      .eq('id', id)
      .single();

    if (data) {
      const nextDismissals = (data.dismissals || 0) + 1;
      const confirmations = data.confirmations || 1;

      // Rule: if dismissals >= confirmations, remove it from the active map
      if (nextDismissals >= confirmations) {
        return await deleteIncidentOnline(id);
      }

      await supabase
        .from('incidents')
        .update({ dismissals: nextDismissals })
        .eq('id', id);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Broadcasts an active SOS emergency alert to the Supabase community
 */
export async function broadcastOnlineSOS(sos: SOSAlert): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.from('sos_alerts').insert([
      {
        id: sos.id,
        user_id: sos.userId,
        user_name: sos.userName,
        latitude: sos.latitude,
        longitude: sos.longitude,
        timestamp: new Date(sos.timestamp).toISOString(),
        status: sos.status,
      },
    ]);

    return !error;
  } catch (err) {
    console.warn('Erro ao transmitir SOS para Supabase:', err);
    return false;
  }
}

/**
 * Subscribes to Realtime Incidents (new hazards and vote updates across all phones)
 */
export function subscribeToOnlineIncidents(onChange: () => void): RealtimeChannel | null {
  if (!isSupabaseConfigured()) return null;

  try {
    const channel = supabase
      .channel('public:incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('Erro ao subscrever Realtime Supabase:', err);
    return null;
  }
}

/**
 * Resolves or deletes an active online SOS emergency alert in Supabase
 */
export async function resolveOnlineSOS(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error: updateError } = await supabase
      .from('sos_alerts')
      .update({ status: 'resolved' })
      .eq('id', id);

    // Also attempt deletion so it does not linger in the table
    await supabase.from('sos_alerts').delete().eq('id', id);

    return !updateError;
  } catch (err) {
    console.warn('Erro ao resolver SOS no Supabase:', err);
    return false;
  }
}

/**
 * Subscribes to Realtime SOS Alerts (emergencies happening right now near you)
 */
export function subscribeToOnlineSOS(
  onSOS: (sos: SOSAlert) => void,
  onRemoveSOS?: (id: string) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured()) return null;

  try {
    const channel = supabase
      .channel('public:sos_alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_alerts' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            if (row && (row.status === 'active' || !row.status)) {
              onSOS({
                id: row.id,
                userId: row.user_id,
                userName: row.user_name || 'Utilizador Sentinela',
                latitude: parseFloat(row.latitude),
                longitude: parseFloat(row.longitude),
                timestamp: new Date(row.timestamp).getTime(),
                status: row.status || 'active',
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old;
            if (oldRow?.id && onRemoveSOS) {
              onRemoveSOS(oldRow.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (row && row.status === 'resolved' && onRemoveSOS) {
              onRemoveSOS(row.id);
            }
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn('Erro ao subscrever SOS Realtime Supabase:', err);
    return null;
  }
}
