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
            <Ionicons name="car-sport" size={20} color="#38BDF8" />
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

          {Platform.OS === 'android' && (
            <View style={[styles.integrationRow, styles.integrationRowDivider]}>
              <View
                style={[
                  styles.integrationStatusDotActive,
                  !listenerEnabled && { backgroundColor: '#F59E0B' },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.integrationTitle}>
                  Deteção Automática por Notificação:{' '}
                  <Text style={{ color: listenerEnabled ? '#10B981' : '#F59E0B' }}>
                    {listenerEnabled ? 'Ativa' : 'Desativada'}
                  </Text>
                </Text>
                <Text style={styles.integrationDesc}>
                  Deteta automaticamente quando o motorista aceita ou inicia a viagem na Uber e Bolt sem ter de sair da aplicação.
                </Text>
                {!listenerEnabled && (
                  <TouchableOpacity
                    style={styles.enableListenerBtn}
                    onPress={handleOpenNotificationSettings}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="settings-outline" size={14} color="#0F172A" />
                    <Text style={styles.enableListenerBtnText}>
                      Autorizar Leitura de Notificações TVDE
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
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
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    ...M3Elevation.level4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: M3Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  autoCapturedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  autoCapturedText: {
    flex: 1,
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  integrationBox: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    marginBottom: 14,
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
    borderTopColor: M3Colors.outlineVariant,
  },
  integrationStatusDotActive: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginTop: 5,
  },
  integrationTitle: {
    color: M3Colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  integrationDesc: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
  },
  enableListenerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: M3Shapes.full,
    marginTop: 8,
  },
  enableListenerBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  useHomeLink: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
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
    backgroundColor: '#38BDF8',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },
  extractBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  platformsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: M3Shapes.full,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  platformChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  platformChipText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
  },
  platformChipTextActive: {
    color: '#0F172A',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
    height: 48,
  },
  plateBlueStrip: {
    width: 34,
    height: '100%',
    backgroundColor: '#1D4ED8',
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
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: M3Colors.onSurface,
    fontSize: 14,
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
    backgroundColor: '#15803D',
    paddingVertical: 11,
    borderRadius: M3Shapes.full,
  },
  smsShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#334155',
    paddingVertical: 11,
    borderRadius: M3Shapes.full,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 15,
    borderRadius: M3Shapes.full,
    marginTop: 14,
    ...M3Elevation.level2,
  },
  activateBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
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
    backgroundColor: '#DC2626',
    paddingVertical: 13,
    borderRadius: M3Shapes.full,
  },
  sosTripBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  endTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 12,
    borderRadius: M3Shapes.full,
  },
  endTripBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
});
