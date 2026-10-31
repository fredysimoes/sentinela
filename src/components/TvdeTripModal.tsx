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
            <Ionicons name="car-sport-outline" size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Acompanhamento TVDE</Text>
            <Text style={styles.headerSubtitle}>
              Uber, Bolt e Táxi • Proteção de Percurso e Viatura
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#94A3B8" />
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
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.autoCapturedText}>
              Dados captados através da Folha de Partilha do Android ({platform}). Verifique e confirme o início da proteção.
            </Text>
          </View>
        )}

        {sourceBadge === 'notification' && (
          <View style={styles.autoCapturedBanner}>
            <Ionicons name="notifications" size={18} color="#38BDF8" />
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
            placeholderTextColor="#64748B"
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
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Ionicons name="sparkles" size={15} color="#0F172A" />
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
            placeholderTextColor="#64748B"
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
          placeholderTextColor="#64748B"
          value={vehicleModel}
          onChangeText={setVehicleModel}
          maxLength={60}
        />

        {/* Driver Name */}
        <Text style={styles.sectionLabel}>NOME DO MOTORISTA</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: António Silva"
          placeholderTextColor="#64748B"
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
          placeholderTextColor="#64748B"
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
            <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Enviar por WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smsShareBtn}
            onPress={() => handleShareWithContact('sms')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={17} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Enviar por SMS</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.activateBtn}
          onPress={handleActivateProtection}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="shield-car" size={22} color="#0F172A" />
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
              <Ionicons name="warning" size={18} color="#FFFFFF" />
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
              <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
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
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 92 : 90,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    backgroundColor: '#f5f4ee',
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
    borderRadius: 0,
    backgroundColor: '#ffff00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    backgroundColor: '#f5f4ee',
  },
  autoCapturedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffff00',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 12,
    marginBottom: 14,
  },
  autoCapturedText: {
    flex: 1,
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  integrationBox: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    padding: 14,
    borderWidth: 3,
    borderColor: '#000000',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
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
    borderTopWidth: 2,
    borderTopColor: '#000000',
  },
  integrationStatusDotActive: {
    width: 10,
    height: 10,
    borderRadius: 0,
    backgroundColor: '#ff0000',
    marginTop: 5,
  },
  integrationTitle: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  integrationDesc: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  enableListenerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#ffff00',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 0,
    marginTop: 8,
  },
  enableListenerBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
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
    color: '#ff0000',
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
    backgroundColor: '#ffff00',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 0,
  },
  extractBtnText: {
    color: '#000000',
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
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
  },
  platformChipActive: {
    backgroundColor: '#ffff00',
    borderColor: '#000000',
  },
  platformChipText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  platformChipTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    height: 48,
  },
  plateBlueStrip: {
    width: 34,
    height: '100%',
    backgroundColor: '#0000ff',
    borderRightWidth: 2,
    borderRightColor: '#000000',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
  },
  plateCountryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  plateInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: '#000000',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#000000',
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
    backgroundColor: '#ffff00',
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 11,
    borderRadius: 0,
  },
  smsShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#000000',
    paddingVertical: 11,
    borderRadius: 0,
  },
  shareBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff0000',
    paddingVertical: 15,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    marginTop: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  activateBtnText: {
    color: '#ffffff',
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
    backgroundColor: '#ff0000',
    paddingVertical: 13,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
  },
  sosTripBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  endTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffff00',
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 12,
    borderRadius: 0,
  },
  endTripBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
