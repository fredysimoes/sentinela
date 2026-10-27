import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGoogleMapsUrl } from '../utils/geo';

const { TvdeBridgeModule } = NativeModules;

const ACTIVE_TVDE_TRIP_KEY = '@sentinela_active_tvde_trip_v1';

export type TvdePlatform = 'Uber' | 'Bolt' | 'FreeNow' | 'Táxi / TVDE';

export interface TvdeTripSession {
  id: string;
  platform: TvdePlatform;
  driverName: string;
  vehicleModel: string;
  licensePlate: string;
  destination: string;
  trackingUrl?: string;
  rawSharedText?: string;
  startedAt: number;
  status: 'active' | 'completed' | 'sos_triggered';
  source: 'share_sheet' | 'notification' | 'manual';
}

export interface ParsedTvdeDraft {
  platform: TvdePlatform;
  driverName: string;
  vehicleModel: string;
  licensePlate: string;
  destination: string;
  trackingUrl?: string;
  rawSharedText?: string;
  source: 'share_sheet' | 'notification' | 'manual';
}

// Portuguese and European car brands common in TVDE fleets
const CAR_BRANDS = [
  'Renault',
  'Peugeot',
  'Toyota',
  'Dacia',
  'Citroën',
  'Citroen',
  'Volkswagen',
  'VW',
  'Skoda',
  'Škoda',
  'Seat',
  'Fiat',
  'Ford',
  'Hyundai',
  'Kia',
  'Nissan',
  'Mercedes-Benz',
  'Mercedes',
  'BMW',
  'Opel',
  'Tesla',
  'BYD',
  'MG',
  'Honda',
  'Mazda',
  'Volvo',
  'Audi',
  'Lexus',
  'Mitsubishi',
  'Suzuki',
  'Smart',
  'Mini',
  'Jeep',
  'Cupra',
  'Polestar',
];

const CAR_COLORS = [
  'preto',
  'preta',
  'branco',
  'branca',
  'cinzento',
  'cinzenta',
  'cinza',
  'prata',
  'prateado',
  'azul',
  'vermelho',
  'vermelha',
  'verde',
  'bege',
  'dourado',
  'castanho',
  'amarelo',
  'black',
  'white',
  'grey',
  'gray',
  'silver',
  'blue',
  'red',
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

export function detectPlatform(text: string, hintPackage?: string): TvdePlatform {
  const pkg = (hintPackage || '').toLowerCase();
  const lower = text.toLowerCase();

  if (pkg.includes('ubercab') || lower.includes('uber.com') || /\buber\b/i.test(text)) {
    return 'Uber';
  }
  if (
    pkg.includes('mtakso') ||
    lower.includes('bolt.eu') ||
    lower.includes('taxify') ||
    /\bbolt\b/i.test(text)
  ) {
    return 'Bolt';
  }
  if (pkg.includes('taxi.android') || lower.includes('freenow') || lower.includes('free now')) {
    return 'FreeNow';
  }
  return 'Táxi / TVDE';
}

export function extractLicensePlate(text: string): string {
  if (!text) return '';

  // 1. Explicit label match: "Matrícula: AA-00-BB" or "(AA-00-BB)"
  const explicitMatch = text.match(
    /(?:matr[íi]cula|placa|plate|registo)[:\s]+([A-Z0-9]{2}[-\s]?[A-Z0-9]{2}[-\s]?[A-Z0-9]{2})/i
  );
  if (explicitMatch && explicitMatch[1]) {
    return formatNormalizedPlate(explicitMatch[1]);
  }

  // 2. Standard Portuguese license plate patterns:
  // AA-00-AA, 00-AA-00, 00-00-AA, AA-00-00 (with dashes or spaces)
  const ptPatterns = [
    /\b([A-Z]{2}[-\s]\d{2}[-\s][A-Z]{2})\b/i,
    /\b(\d{2}[-\s][A-Z]{2}[-\s]\d{2})\b/i,
    /\b(\d{2}[-\s]\d{2}[-\s][A-Z]{2})\b/i,
    /\b([A-Z]{2}[-\s]\d{2}[-\s]\d{2})\b/i,
    // Compact 6-char inside parentheses or brackets e.g. (AA12BB) or [12AB34]
    /[(\[]([A-Z]{2}\d{2}[A-Z]{2}|\d{2}[A-Z]{2}\d{2}|\d{2}\d{2}[A-Z]{2})[)\]]/i,
  ];

  for (const regex of ptPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return formatNormalizedPlate(match[1]);
    }
  }

  return '';
}

function formatNormalizedPlate(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 6) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  }
  return raw.trim().toUpperCase();
}

export function extractVehicleModel(text: string): string {
  if (!text) return '';

  // 1. Check explicit label: "Viatura: Renault Megane Cinzento"
  const explicit = text.match(/(?:viatura|ve[íi]culo|carro|vehicle)[:\s]+([^\n|•,;()]+)/i);
  if (explicit && explicit[1]) {
    return explicit[1].trim();
  }

  // 2. Match known car brand + 1 to 3 model words + optional color
  const brandsPattern = CAR_BRANDS.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const brandRegex = new RegExp(
    `\\b(${brandsPattern})\\s+([A-Za-z0-9À-ú-]+(?:\\s+[A-Za-z0-9À-ú-]+){0,2})`,
    'i'
  );
  const match = text.match(brandRegex);
  if (match) {
    let result = `${match[1]} ${match[2]}`.trim();
    // Strip trailing stop words if accidentally captured
    result = result.replace(/\s+(com|de|na|no|em|para|matr[íi]cula|chegou|est[áa])$/i, '').trim();

    // Check if there is a color nearby in text if not already in result
    const lowerResult = result.toLowerCase();
    const hasColor = CAR_COLORS.some((c) => lowerResult.includes(c));
    if (!hasColor) {
      for (const color of CAR_COLORS) {
        const colorRegex = new RegExp(`\\b(${color})\\b`, 'i');
        const cMatch = text.match(colorRegex);
        if (cMatch) {
          const capColor = cMatch[1].charAt(0).toUpperCase() + cMatch[1].slice(1).toLowerCase();
          result = `${result} (${capColor})`;
          break;
        }
      }
    }
    return result;
  }

  return '';
}

export function extractDriverName(text: string): string {
  if (!text) return '';

  const patterns = [
    /(?:motorista|condutor|condutora|driver)[:\s]+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú.]+)?)/,
    /(?:viagem com|ride with|trip with|a caminho com)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú.]+)?)/i,
    /\b([A-ZÀ-Ú][a-zà-ú]+)\s+(?:est[áa] a chegar|chegou|est[áa] a caminho|aceitou a sua viagem|is arriving|has arrived)/,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const forbidden = ['uber', 'bolt', 'viagem', 'motorista', 'carro', 'seu', 'sua', 'para'];
      if (!forbidden.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  return '';
}

export function extractDestination(text: string): string {
  if (!text) return '';

  const patterns = [
    /(?:destino|destination)[:\s]+([^\n|•]+?)(?:\s+https?:|\s*$)/i,
    /(?:viagem para|a caminho de|rumo a|heading to|trip to)\s+([A-ZÀ-Ú0-9][^\n|•]+?)(?:\s+https?:|\.|\s*$)/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].trim();
      if (cleaned.length > 2 && cleaned.length < 90 && !cleaned.startsWith('http')) {
        return cleaned;
      }
    }
  }

  return '';
}

export function extractTrackingUrl(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (!match) return undefined;
  // Strip trailing punctuation
  return match[0].replace(/[.,;!?)]+$/, '');
}

export function extractTvdeDataFromText(
  rawText: string,
  source: 'share_sheet' | 'notification' | 'manual' = 'share_sheet',
  hintPackage?: string
): ParsedTvdeDraft {
  const cleanText = decodeHtmlEntities(rawText || '').trim();
  return {
    platform: detectPlatform(cleanText, hintPackage),
    driverName: extractDriverName(cleanText),
    vehicleModel: extractVehicleModel(cleanText),
    licensePlate: extractLicensePlate(cleanText),
    destination: extractDestination(cleanText),
    trackingUrl: extractTrackingUrl(cleanText),
    rawSharedText: cleanText,
    source,
  };
}

/**
 * Fetches the public Uber / Bolt tracking page in the background and scrapes
 * OpenGraph tags and embedded JSON state for driver, vehicle, license plate and destination.
 */
export async function scrapePublicTripPage(url: string): Promise<Partial<ParsedTvdeDraft>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return {};

    const html = await response.text();
    if (!html) return {};

    const metaSnippets: string[] = [];

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      metaSnippets.push(decodeHtmlEntities(titleMatch[1].trim()));
    }

    // Extract OpenGraph and standard meta tags
    const metaRegex = /<meta[^>]+(?:property|name)=["'](?:og:title|og:description|description|twitter:title|twitter:description)["'][^>]+content=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = metaRegex.exec(html)) !== null) {
      if (m[1]) metaSnippets.push(decodeHtmlEntities(m[1]));
    }

    // Also reverse order attribute content="..." property="og:..."
    const metaRevRegex = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:title|og:description|description|twitter:title|twitter:description)["']/gi;
    while ((m = metaRevRegex.exec(html)) !== null) {
      if (m[1]) metaSnippets.push(decodeHtmlEntities(m[1]));
    }

    const combinedMeta = metaSnippets.join(' | ');
    const fromMeta = extractTvdeDataFromText(combinedMeta);

    // Inspect embedded JSON keys in SSR state if present
    const jsonLicense =
      html.match(/"(?:licensePlate|vehicleLicensePlate|reg_number|plateNumber|license_plate)"\s*:\s*"([^"]+)"/i)?.[1] || '';
    const jsonDriver =
      html.match(/"(?:driverName|driver_name|firstName|driverFirstName)"\s*:\s*"([^"]+)"/i)?.[1] || '';
    const jsonMake = html.match(/"(?:vehicleMake|make)"\s*:\s*"([^"]+)"/i)?.[1] || '';
    const jsonModel = html.match(/"(?:vehicleModel|model|carModel|car_model)"\s*:\s*"([^"]+)"/i)?.[1] || '';
    const jsonColor = html.match(/"(?:vehicleColor|color|carColor)"\s*:\s*"([^"]+)"/i)?.[1] || '';
    const jsonDest =
      html.match(/"(?:destinationAddress|dropoffAddress|destination_address)"\s*:\s*"([^"]+)"/i)?.[1] || '';

    const assembledVehicle = [jsonMake, jsonModel, jsonColor ? `(${jsonColor})` : '']
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      driverName: fromMeta.driverName || decodeHtmlEntities(jsonDriver),
      vehicleModel: fromMeta.vehicleModel || decodeHtmlEntities(assembledVehicle),
      licensePlate:
        fromMeta.licensePlate || (jsonLicense ? formatNormalizedPlate(jsonLicense) : ''),
      destination: fromMeta.destination || decodeHtmlEntities(jsonDest),
    };
  } catch {
    clearTimeout(timeout);
    return {};
  }
}

export async function parseAndEnrichTvdeTrip(
  rawText: string,
  source: 'share_sheet' | 'notification' | 'manual' = 'share_sheet',
  hintPackage?: string
): Promise<ParsedTvdeDraft> {
  const localDraft = extractTvdeDataFromText(rawText, source, hintPackage);

  if (localDraft.trackingUrl) {
    const scraped = await scrapePublicTripPage(localDraft.trackingUrl);
    return {
      ...localDraft,
      driverName: localDraft.driverName || scraped.driverName || '',
      vehicleModel: localDraft.vehicleModel || scraped.vehicleModel || '',
      licensePlate: localDraft.licensePlate || scraped.licensePlate || '',
      destination: localDraft.destination || scraped.destination || '',
    };
  }

  return localDraft;
}

export async function loadActiveTvdeTrip(): Promise<TvdeTripSession | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TVDE_TRIP_KEY);
    if (!raw) return null;
    const parsed: TvdeTripSession = JSON.parse(raw);
    // Auto-expire trips older than 6 hours
    if (Date.now() - parsed.startedAt > 6 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(ACTIVE_TVDE_TRIP_KEY);
      return null;
    }
    return parsed.status === 'active' ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveActiveTvdeTrip(trip: TvdeTripSession | null): Promise<void> {
  try {
    if (!trip) {
      await AsyncStorage.removeItem(ACTIVE_TVDE_TRIP_KEY);
    } else {
      await AsyncStorage.setItem(ACTIVE_TVDE_TRIP_KEY, JSON.stringify(trip));
    }
  } catch {
    // Ignore storage error
  }
}

export function formatTvdeShareMessage(
  trip: TvdeTripSession,
  currentLat?: number,
  currentLon?: number
): string {
  const lines = [
    `*ACOMPANHAMENTO DE VIAGEM TVDE (${trip.platform.toUpperCase()})*`,
    `Estou em deslocação com proteção Sentinela ativa:`,
    `• Viatura: ${trip.vehicleModel || 'Não especificada'}`,
    `• Matrícula: ${trip.licensePlate || 'Não especificada'}`,
    `• Motorista: ${trip.driverName || 'Não especificado'}`,
  ];

  if (trip.destination) {
    lines.push(`• Destino: ${trip.destination}`);
  }
  if (trip.trackingUrl) {
    lines.push(`• Link oficial da viagem: ${trip.trackingUrl}`);
  }
  if (typeof currentLat === 'number' && typeof currentLon === 'number') {
    lines.push(`• Posição GPS atual: ${getGoogleMapsUrl(currentLat, currentLon)}`);
  }

  return lines.join('\n');
}

export function formatTvdeSOSContext(trip: TvdeTripSession): string {
  const parts = [
    `VIATURA TVDE (${trip.platform})`,
    trip.licensePlate ? `Matrícula: ${trip.licensePlate}` : '',
    trip.vehicleModel ? `Viatura: ${trip.vehicleModel}` : '',
    trip.driverName ? `Motorista: ${trip.driverName}` : '',
    trip.destination ? `Destino: ${trip.destination}` : '',
    trip.trackingUrl ? `Rastreio: ${trip.trackingUrl}` : '',
  ].filter(Boolean);

  return parts.join(' | ');
}

// ---------------------------------------------------------------------------
// Native Bridge Wrappers (Android Share Sheet & NotificationListenerService)
// ---------------------------------------------------------------------------

export async function checkPendingSharedTrip(): Promise<{ text: string; subject: string } | null> {
  if (Platform.OS !== 'android' || !TvdeBridgeModule?.getPendingSharedTrip) {
    return null;
  }
  try {
    return await TvdeBridgeModule.getPendingSharedTrip();
  } catch {
    return null;
  }
}

export async function checkPendingNotificationTrip(): Promise<{
  packageName: string;
  title: string;
  text: string;
  bigText: string;
  timestamp: number;
} | null> {
  if (Platform.OS !== 'android' || !TvdeBridgeModule?.getPendingNotificationTrip) {
    return null;
  }
  try {
    return await TvdeBridgeModule.getPendingNotificationTrip();
  } catch {
    return null;
  }
}

export async function isTvdeNotificationListenerEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !TvdeBridgeModule?.isNotificationListenerEnabled) {
    return false;
  }
  try {
    return await TvdeBridgeModule.isNotificationListenerEnabled();
  } catch {
    return false;
  }
}

export async function openTvdeNotificationListenerSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !TvdeBridgeModule?.openNotificationListenerSettings) {
    return false;
  }
  try {
    return await TvdeBridgeModule.openNotificationListenerSettings();
  } catch {
    return false;
  }
}

export function subscribeToTvdeNativeEvents(handlers: {
  onSharedTrip: (payload: { text: string; subject: string }) => void;
  onNotificationTrip: (payload: {
    packageName: string;
    title: string;
    text: string;
    bigText: string;
    timestamp: number;
  }) => void;
}): () => void {
  if (Platform.OS !== 'android' || !TvdeBridgeModule) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(TvdeBridgeModule);
  const subShare = emitter.addListener('TvdeSharedTripEvent', (event: any) => {
    handlers.onSharedTrip(event);
  });
  const subNotif = emitter.addListener('TvdeNotificationTripEvent', (event: any) => {
    handlers.onNotificationTrip(event);
  });

  return () => {
    subShare.remove();
    subNotif.remove();
  };
}
