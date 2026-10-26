import { Linking, Platform } from 'react-native';
import { EmergencyContact, SOSAlert } from '../types';
import { getGoogleMapsUrl } from '../utils/geo';
import { sendLocalSOSPushNotification } from './notifications';

export interface DispatchSOSResult {
  alert: SOSAlert;
  shareMessage: string;
}

export async function createAndDispatchSOS(params: {
  userName?: string;
  latitude: number;
  longitude: number;
  message?: string;
}): Promise<DispatchSOSResult> {
  const mapUrl = getGoogleMapsUrl(params.latitude, params.longitude);
  const now = Date.now();
  const userName = params.userName || 'Utilizador do Sentinela';

  const defaultMsg = params.message 
    ? `🚨 *EMERGÊNCIA / ALERTA SOS!* 🚨\n"${params.message}"\nEstou a precisar de apoio imediato neste local:\n📍 Coordenadas: ${params.latitude.toFixed(5)}, ${params.longitude.toFixed(5)}\n🗺️ Ver mapa em direto: ${mapUrl}\n(Enviado via app Sentinela)`
    : `🚨 *EMERGÊNCIA / ALERTA SOS!* 🚨\nEstou a andar a pé e preciso de apoio imediato neste local!\n📍 Coordenadas: ${params.latitude.toFixed(5)}, ${params.longitude.toFixed(5)}\n🗺️ Ver mapa em direto: ${mapUrl}\n(Enviado via app Sentinela)`;

  const alert: SOSAlert = {
    id: `sos-${now}`,
    userId: 'current-user',
    userName,
    latitude: params.latitude,
    longitude: params.longitude,
    timestamp: now,
    status: 'active',
    message: params.message,
  };

  // Simulate dispatching push notification to nearby users (e.g. 250m)
  try {
    await sendLocalSOSPushNotification({
      userName,
      distanceMeters: 280,
      latitude: params.latitude,
      longitude: params.longitude,
    });
  } catch (err) {
    console.warn('Erro ao disparar push notification SOS:', err);
  }

  return {
    alert,
    shareMessage: defaultMsg,
  };
}

export function createImSafeMessage(latitude: number, longitude: number): string {
  const mapUrl = getGoogleMapsUrl(latitude, longitude);
  return `✅ *ESTOU BEM E EM SEGURANÇA*\nNão te preocupes, está tudo tranquilo comigo!\n📍 A minha localização atual:\n🗺️ ${mapUrl}\n(Enviado via app Sentinela)`;
}

export function normalizePhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Prepend Portugal country code 351 if 9 digits (standard PT phone number)
  if (cleaned.length === 9 && (cleaned.startsWith('9') || cleaned.startsWith('2') || cleaned.startsWith('3'))) {
    cleaned = `351${cleaned}`;
  }

  return cleaned;
}

export async function shareSOSToWhatsApp(phone: string, message: string): Promise<void> {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  const encodedMsg = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback directly to generic WhatsApp scheme or web
    const fallbackUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
    await Linking.openURL(fallbackUrl);
  }
}

export async function shareSOSToSMS(phone: string, message: string): Promise<void> {
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
