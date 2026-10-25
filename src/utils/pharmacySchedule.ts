import { SafePlace, PharmacyHours } from '../types';

export interface PharmacyStatus {
  isOpen: boolean;
  is24h: boolean;
  statusLabel: string;
  statusColor: string;
  ringColor: string;
  badgeText: string;
  hoursDescription: string;
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Parses raw OpenStreetMap opening_hours string into structured PharmacyHours
 */
export function parseOsmOpeningHours(raw?: string): { hours: PharmacyHours; hoursDescription: string } {
  if (!raw) {
    return {
      hours: {
        is24h: false,
        weekdayOpen: '08:30',
        weekdayClose: '20:00',
        saturdayOpen: '09:00',
        saturdayClose: '13:00',
      },
      hoursDescription: 'Seg-Sex: 08:30-20:00 | Sáb: 09:00-13:00',
    };
  }

  const clean = raw.trim();
  if (
    clean.includes('24/7') ||
    clean.toLowerCase().includes('24h') ||
    clean.toLowerCase().includes('permanente')
  ) {
    return {
      hours: { is24h: true },
      hoursDescription: 'Aberto 24h todos os dias sem interrupção',
    };
  }

  const hours: PharmacyHours = { is24h: false };

  // Simple format e.g. "08:30-20:00"
  const simpleMatch = clean.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (simpleMatch) {
    hours.weekdayOpen = simpleMatch[1];
    hours.weekdayClose = simpleMatch[2];
    hours.saturdayOpen = simpleMatch[1];
    hours.saturdayClose = simpleMatch[2];
    return {
      hours,
      hoursDescription: `Seg-Sáb: ${simpleMatch[1]} às ${simpleMatch[2]}`,
    };
  }

  // Parse segments separated by semicolon
  const parts = clean.split(';').map((s) => s.trim());
  let desc = '';

  for (const part of parts) {
    const timeMatch = part.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!timeMatch) continue;
    const open = timeMatch[1];
    const close = timeMatch[2];

    const partUpper = part.toUpperCase();
    if (partUpper.includes('MO') || partUpper.includes('FR') || partUpper.includes('SEG')) {
      hours.weekdayOpen = open;
      hours.weekdayClose = close;
      desc += (desc ? ' | ' : '') + `Seg-Sex: ${open}-${close}`;
    }
    if (partUpper.includes('SA') || partUpper.includes('SÁB') || partUpper.includes('SAB')) {
      hours.saturdayOpen = open;
      hours.saturdayClose = close;
      desc += (desc ? ' | ' : '') + `Sáb: ${open}-${close}`;
    }
    if (partUpper.includes('SU') || partUpper.includes('DOM')) {
      hours.sundayOpen = open;
      hours.sundayClose = close;
      desc += (desc ? ' | ' : '') + `Dom: ${open}-${close}`;
    }
  }

  if (!hours.weekdayOpen) {
    hours.weekdayOpen = '09:00';
    hours.weekdayClose = '20:00';
  }

  return {
    hours,
    hoursDescription: desc || clean,
  };
}

/**
 * Checks whether a pharmacy is open right now based on current local time
 */
export function getPharmacyStatus(place: SafePlace, customDate?: Date): PharmacyStatus {
  const hours = place.hours;
  const now = customDate || new Date();

  // If marked as 24h, always open
  if (hours?.is24h) {
    return {
      isOpen: true,
      is24h: true,
      statusLabel: 'Aberta 24 Horas (Serviço Permanente)',
      statusColor: '#10B981',
      ringColor: '#10B981',
      badgeText: '24H',
      hoursDescription: 'Aberto 24h todos os dias sem interrupção',
    };
  }

  if (!hours) {
    return {
      isOpen: true,
      is24h: false,
      statusLabel: 'Horário Habitual',
      statusColor: '#10B981',
      ringColor: '#10B981',
      badgeText: 'ABERTA',
      hoursDescription: place.hoursDescription || '09:00 - 19:30',
    };
  }

  const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let openStr: string | undefined;
  let closeStr: string | undefined;

  if (dayOfWeek === 0) {
    // Domingo
    openStr = hours.sundayOpen;
    closeStr = hours.sundayClose;
  } else if (dayOfWeek === 6) {
    // Sábado
    openStr = hours.saturdayOpen;
    closeStr = hours.saturdayClose;
  } else {
    // Segunda a Sexta
    openStr = hours.weekdayOpen;
    closeStr = hours.weekdayClose;
  }

  // If no hours set for today, assume closed
  if (!openStr || !closeStr) {
    return {
      isOpen: false,
      is24h: false,
      statusLabel: 'Fechada Hoje',
      statusColor: '#EF4444',
      ringColor: '#64748B',
      badgeText: 'FECHADA',
      hoursDescription: place.hoursDescription || 'Encerrada neste dia da semana',
    };
  }

  const openMinutes = parseTimeToMinutes(openStr);
  const closeMinutes = parseTimeToMinutes(closeStr);

  const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

  const hoursDesc = place.hoursDescription || `Hoje: ${openStr} - ${closeStr}`;

  if (isOpen) {
    return {
      isOpen: true,
      is24h: false,
      statusLabel: `Aberta Agora (encerra às ${closeStr})`,
      statusColor: '#10B981',
      ringColor: '#22C55E',
      badgeText: 'ABERTA',
      hoursDescription: hoursDesc,
    };
  } else {
    const nextMsg =
      currentMinutes < openMinutes
        ? `Abre hoje às ${openStr}`
        : `Encerrou às ${closeStr}`;

    return {
      isOpen: false,
      is24h: false,
      statusLabel: `Fechada de Momento (${nextMsg})`,
      statusColor: '#EF4444',
      ringColor: '#EF4444',
      badgeText: 'FECHADA',
      hoursDescription: hoursDesc,
    };
  }
}
