import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { M3BottomSheetWrapper } from './M3MotionWrapper';
import {
  TvdePlatform,
  TvdeTripSession,
  ParsedTvdeDraft,
  parseAndEnrichTvdeTrip,
  isTvdeNotificationListenerEnabled,
  openTvdeNotificationListenerSettings,
  formatTvdeShareMessage,
} from '../services/tvdeService';
import { EmergencyContact, HomeAddress, UserLocation } from '../types';
import { shareSOSToWhatsApp, shareSOSToSMS } from '../services/sos';

interface TvdeTripModalProps {
  visible: boolean;
  onClose: () => void;
  activeTrip: TvdeTripSession | null;
  incomingDraft: ParsedTvdeDraft | null;
  onStartTrip: (trip: TvdeTripSession) => void;
  onEndTrip: () => void;
  onTriggerSOSWithTrip: (trip: TvdeTripSession) => void;
  userLocation: UserLocation | null;
  homeAddress: HomeAddress | null;
  emergencyContacts: EmergencyContact[];
}

const PLATFORMS: TvdePlatform[] = ['Uber', 'Bolt', 'FreeNow', 'Táxi / TVDE'];

export const TvdeTripModal: React.FC<TvdeTripModalProps> = ({
  visible,
  onClose,
  activeTrip,
  incomingDraft,
  onStartTrip,
  onEndTrip,
  onTriggerSOSWithTrip,
  userLocation,
  homeAddress,
  emergencyContacts,
}) => {
  const [platform, setPlatform] = useState<TvdePlatform>('Uber');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [driverName, setDriverName] = useState('');
  const [destination, setDestination] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [rawInputText, setRawInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [listenerEnabled, setListenerEnabled] = useState(false);
  const [sourceBadge, setSourceBadge] = useState<'share_sheet' | 'notification' | 'manual' | null>(
    null
  );

  const personalContacts = emergencyContacts.filter((c) => c.phone !== '112');

  const refreshListenerStatus = async () => {
    const enabled = await isTvdeNotificationListenerEnabled();
    setListenerEnabled(enabled);
  };

  useEffect(() => {
    if (visible) {
      refreshListenerStatus();
    }
  }, [visible]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && visible) {
        refreshListenerStatus();
      }
    });
    return () => sub.remove();
  }, [visible]);

  // Populate fields from incomingDraft or activeTrip when modal opens
  useEffect(() => {
    if (incomingDraft) {
      setPlatform(incomingDraft.platform);
      setLicensePlate(incomingDraft.licensePlate || '');
      setVehicleModel(incomingDraft.vehicleModel || '');
      setDriverName(incomingDraft.driverName || '');
      setDestination(incomingDraft.destination || homeAddress?.address || '');
      setTrackingUrl(incomingDraft.trackingUrl || '');
      setRawInputText(incomingDraft.rawSharedText || '');
      setSourceBadge(incomingDraft.source);
    } else if (activeTrip) {
      setPlatform(activeTrip.platform);
      setLicensePlate(activeTrip.licensePlate);
      setVehicleModel(activeTrip.vehicleModel);
      setDriverName(activeTrip.driverName);
      setDestination(activeTrip.destination);
      setTrackingUrl(activeTrip.trackingUrl || '');
      setRawInputText(activeTrip.rawSharedText || '');
      setSourceBadge(activeTrip.source);
    }
  }, [incomingDraft, activeTrip, visible]);

  const handleExtractFromRawText = async () => {
    if (!rawInputText.trim()) {
      Alert.alert(
        'Texto ou Link Vazio',
        'Cole o link de partilha da viagem (ex.: https://trip.uber.com/... ou https://bolt.eu/...) ou o texto da notificação para extrair os dados automaticamente.'
      );
      return;
    }

    Haptics.selectionAsync();
    setIsExtracting(true);
    try {
      const parsed = await parseAndEnrichTvdeTrip(rawInputText.trim(), 'manual');
      setPlatform(parsed.platform);
      if (parsed.licensePlate) setLicensePlate(parsed.licensePlate);
      if (parsed.vehicleModel) setVehicleModel(parsed.vehicleModel);
      if (parsed.driverName) setDriverName(parsed.driverName);
      if (parsed.destination) setDestination(parsed.destination);
      if (parsed.trackingUrl) setTrackingUrl(parsed.trackingUrl);
      setSourceBadge('manual');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleOpenNotificationSettings = async () => {
    Haptics.selectionAsync();
    await openTvdeNotificationListenerSettings();
  };

  const handleActivateProtection = () => {
    if (!licensePlate.trim() && !vehicleModel.trim() && !trackingUrl.trim()) {
      Alert.alert(
        'Dados da Viatura',
        'Indique pelo menos a matrícula, o modelo da viatura ou o link da viagem para ativar a monitorização de segurança.'
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newTrip: TvdeTripSession = {
      id: activeTrip?.id || `tvde-${Date.now()}`,
      platform,
      licensePlate: licensePlate.trim().toUpperCase(),
      vehicleModel: vehicleModel.trim(),
      driverName: driverName.trim(),
      destination: destination.trim(),
      trackingUrl: trackingUrl.trim() || undefined,
      rawSharedText: rawInputText.trim() || undefined,
      startedAt: activeTrip?.startedAt || Date.now(),
      status: 'active',
      source: sourceBadge || 'manual',
    };

    onStartTrip(newTrip);
    onClose();
  };

  const handleShareWithContact = (channel: 'whatsapp' | 'sms') => {
    Haptics.selectionAsync();
    const sessionToShare: TvdeTripSession = activeTrip || {
      id: `tvde-${Date.now()}`,
      platform,
      licensePlate: licensePlate.trim().toUpperCase(),
      vehicleModel: vehicleModel.trim(),
      driverName: driverName.trim(),
      destination: destination.trim(),
      trackingUrl: trackingUrl.trim() || undefined,
      startedAt: Date.now(),
      status: 'active',
      source: sourceBadge || 'manual',
    };

    const msg = formatTvdeShareMessage(
      sessionToShare,
      userLocation?.latitude,
      userLocation?.longitude
    );
    const targetPhone = personalContacts[0]?.phone || '';

    if (channel === 'whatsapp') {
      shareSOSToWhatsApp(targetPhone, msg);
    } else {
      shareSOSToSMS(targetPhone, msg);
    }
  };

  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="car-sport-outline" size={20} color="#383139" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Acompanhamento TVDE</Text>
            <Text style={styles.headerSubtitle}>
              Uber, Bolt e Táxi • Proteção de Percurso e Viatura
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#383139" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Source banner when auto-populated from Share Sheet or Notification */}
        {sourceBadge === 'share_sheet' && (
          <View style={styles.autoCapturedBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#383139" />
            <Text style={styles.autoCapturedText}>
              Dados captados através da Folha de Partilha do Android ({platform}). Verifique e confirme o início da proteção.
            </Text>
          </View>
        )}

        {sourceBadge === 'notification' && (
          <View style={styles.autoCapturedBanner}>
            <Ionicons name="notifications" size={18} color="#383139" />
            <Text style={styles.autoCapturedText}>
              Viagem detetada automaticamente por notificação da {platform}.
            </Text>
          </View>
        )}

        {/* Integration Methods Status Card */}
        <View style={styles.integrationBox}>
          <View style={styles.integrationRow}>
            <View style={styles.integrationStatusDotActive} />
            <View style={{ flex: 1 }}>
              <Text style={styles.integrationTitle}>
                Partilha Direta da Uber / Bolt (Ativa)
              </Text>
              <Text style={styles.integrationDesc}>
                Na Uber ou Bolt, toque em «Partilhar Viagem» e escolha o Sentinela na lista do telemóvel para preencher matrícula, viatura e motorista.
              </Text>
            </View>
          </View>


        </View>

        {/* Link or Text Extractor Box */}
        <Text style={styles.sectionLabel}>COLAR LINK OU TEXTO DA VIAGEM (OPCIONAL)</Text>
        <View style={styles.extractorRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ex: https://trip.uber.com/... ou texto da viagem"
            placeholderTextColor="#7D7582"
            value={rawInputText}
            onChangeText={setRawInputText}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.extractBtn}
            onPress={handleExtractFromRawText}
            disabled={isExtracting}
            activeOpacity={0.8}
          >
            {isExtracting ? (
              <ActivityIndicator size="small" color="#383139" />
            ) : (
              <>
                <Ionicons name="sparkles" size={15} color="#383139" />
                <Text style={styles.extractBtnText}>Extrair</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Platform Selector */}
        <Text style={styles.sectionLabel}>OPERADORA / PLATAFORMA</Text>
        <View style={styles.platformsRow}>
          {PLATFORMS.map((p) => {
            const isSelected = platform === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.platformChip, isSelected && styles.platformChipActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPlatform(p);
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[styles.platformChipText, isSelected && styles.platformChipTextActive]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* License Plate styled like Portuguese EU plate */}
        <Text style={styles.sectionLabel}>MATRÍCULA DA VIATURA</Text>
        <View style={styles.plateContainer}>
          <View style={styles.plateBlueStrip}>
            <Text style={styles.plateCountryText}>P</Text>
          </View>
          <TextInput
            style={styles.plateInput}
            placeholder="00-AA-00"
            placeholderTextColor="#7D7582"
            value={licensePlate}
            onChangeText={(txt) => setLicensePlate(txt.toUpperCase())}
            autoCapitalize="characters"
            maxLength={12}
          />
        </View>

        {/* Vehicle Model & Color */}
        <Text style={styles.sectionLabel}>MARCA, MODELO E COR DO VEÍCULO</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Peugeot 208 (Cinzento)"
          placeholderTextColor="#7D7582"
          value={vehicleModel}
          onChangeText={setVehicleModel}
          maxLength={60}
        />

        {/* Driver Name */}
        <Text style={styles.sectionLabel}>NOME DO MOTORISTA</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: António Silva"
          placeholderTextColor="#7D7582"
          value={driverName}
          onChangeText={setDriverName}
          maxLength={50}
        />

        {/* Destination */}
        <View style={styles.labelRow}>
          <Text style={styles.sectionLabel}>DESTINO DA VIAGEM</Text>
          {homeAddress && (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setDestination(homeAddress.address);
              }}
            >
              <Text style={styles.useHomeLink}>Usar Morada de Casa</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Ex: Rua Garrett, Lisboa"
          placeholderTextColor="#7D7582"
          value={destination}
          onChangeText={setDestination}
          maxLength={100}
        />

        {/* Quick Share with Emergency Contacts */}
        <View style={styles.quickShareRow}>
          <TouchableOpacity
            style={styles.whatsappShareBtn}
            onPress={() => handleShareWithContact('whatsapp')}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            <Text style={styles.shareBtnText}>Enviar por WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smsShareBtn}
            onPress={() => handleShareWithContact('sms')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={17} color="#383139" />
            <Text style={styles.shareBtnText}>Enviar por SMS</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.activateBtn}
          onPress={handleActivateProtection}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="shield-car" size={22} color="#383139" />
          <Text style={styles.activateBtnText}>
            {activeTrip ? 'Atualizar Dados da Viagem Protegida' : 'Ativar Proteção de Viagem TVDE'}
          </Text>
        </TouchableOpacity>

        {/* If a trip is currently active, show SOS and End Trip buttons */}
        {activeTrip && (
          <View style={styles.activeTripActions}>
            <TouchableOpacity
              style={styles.sosTripBtn}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                onClose();
                onTriggerSOSWithTrip(activeTrip);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="warning" size={18} color="#383139" />
              <Text style={styles.sosTripBtnText}>
                Disparar SOS com Matrícula e Dados da Viatura
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endTripBtn}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onEndTrip();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done-circle" size={18} color="#383139" />
              <Text style={styles.endTripBtnText}>Cheguei em Segurança (Terminar Viagem)</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 92 : 90,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    backgroundColor: '#fffdf7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#c0efdc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#383139',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7D7582',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    padding: 20,
    backgroundColor: '#fffdf7',
  },
  autoCapturedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9e7a8',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  autoCapturedText: {
    flex: 1,
    color: '#383139',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  integrationBox: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  integrationRowDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f2fa',
  },
  integrationStatusDotActive: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#c0efdc',
    marginTop: 5,
  },
  integrationTitle: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  integrationDesc: {
    color: '#7D7582',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  enableListenerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  enableListenerBtnText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#383139',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  useHomeLink: {
    color: '#f6a3ca',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  extractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  extractBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  platformsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  platformChipActive: {
    backgroundColor: '#ded0f9',
    borderColor: '#ffffff',
  },
  platformChipText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  platformChipTextActive: {
    color: '#383139',
    fontWeight: '900',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    overflow: 'hidden',
    height: 48,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  plateBlueStrip: {
    width: 34,
    height: '100%',
    backgroundColor: '#003399',
    borderRightWidth: 1.5,
    borderRightColor: '#ffffff',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
  },
  plateCountryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  plateInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: '#383139',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2,
  },
  input: {
    backgroundColor: '#f1f2fa',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
  },
  quickShareRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  whatsappShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  smsShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  shareBtnText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f6a3ca',
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginTop: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  activateBtnText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeTripActions: {
    marginTop: 14,
    gap: 10,
  },
  sosTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f6a3ca',
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  sosTripBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  endTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c0efdc',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 13,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  endTripBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
