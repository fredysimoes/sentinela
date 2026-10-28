import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { EmergencyContact, SOSAlert, UserLocation } from '../types';
import { createAndDispatchSOS, shareSOSToWhatsApp, shareSOSToSMS, createImSafeMessage } from '../services/sos';
import { TvdeTripSession, formatTvdeSOSContext } from '../services/tvdeService';
import { loadDeviceContactsList, DeviceContactItem } from '../services/contactPicker';
import { ContactPickerModal } from './ContactPickerModal';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';
import { M3Dialog } from './M3MotionWrapper';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  currentLocation: UserLocation | null;
  emergencyContacts: EmergencyContact[];
  onSOSCreated: (alert: SOSAlert) => void;
  onUpdateContacts?: (contacts: EmergencyContact[]) => void;
  onSOSResolved?: (alertId?: string) => void;
  activeTvdeTrip?: TvdeTripSession | null;
  currentUserProfile?: { id?: string; fullName?: string; name?: string } | null;
}

export const SOSModal: React.FC<SOSModalProps> = ({
  visible,
  onClose,
  currentLocation,
  emergencyContacts,
  onSOSCreated,
  onUpdateContacts,
  onSOSResolved,
  activeTvdeTrip,
  currentUserProfile,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isDispatched, setIsDispatched] = useState(false);
  const [createdAlert, setCreatedAlert] = useState<SOSAlert | null>(null);
  const [shareText, setShareText] = useState('');
  const [showImSafeView, setShowImSafeView] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContactItem[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  const personalContacts = emergencyContacts.filter((c) => c.phone !== '112');

  const handleImportDeviceContact = async () => {
    setIsLoadingContacts(true);
    setShowDevicePicker(true);
    const loaded = await loadDeviceContactsList();
    setDeviceContacts(loaded);
    setIsLoadingContacts(false);
  };

  const handleSelectDeviceContact = (picked: DeviceContactItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newContact: EmergencyContact = {
      id: `contact-${Date.now()}`,
      name: picked.name,
      phone: picked.phone,
      relation: 'Contacto de Emergência',
    };

    const updated = [newContact, ...emergencyContacts.filter((c) => c.phone !== picked.phone)];
    if (onUpdateContacts) {
      onUpdateContacts(updated);
    }
  };

  // Start 5-second countdown whenever modal opens
  useEffect(() => {
    if (visible && !isDispatched) {
      setCountdown(5);
      setShowImSafeView(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (!visible) {
      setCountdown(null);
      setIsDispatched(false);
      setCreatedAlert(null);
      setShowImSafeView(false);
    }
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleConfirmSOS();
    }
  }, [countdown]);

  const handleConfirmSOS = async () => {
    setCountdown(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const lat = currentLocation?.latitude ?? 38.7223;
    const lon = currentLocation?.longitude ?? -9.1393;

    const result = await createAndDispatchSOS({
      userId: currentUserProfile?.id,
      userName: currentUserProfile?.fullName || currentUserProfile?.name,
      latitude: lat,
      longitude: lon,
      message: activeTvdeTrip ? formatTvdeSOSContext(activeTvdeTrip) : undefined,
    });

    setCreatedAlert(result.alert);
    setShareText(result.shareMessage);
    setIsDispatched(true);
    onSOSCreated(result.alert);
  };

  const handleCancelCountdown = () => {
    Haptics.selectionAsync();
    setCountdown(null);
    onClose();
  };

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleSendWhatsAppToPhone = (phone?: string) => {
    const targetPhone = phone || personalContacts[0]?.phone;
    if (!targetPhone) {
      Alert.alert(
        'Sem Contacto Definido',
        'Ainda não tem nenhum número de emergência associado. Deseja escolher um contacto da sua lista telefónica agora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Escolher Contacto', onPress: handleImportDeviceContact },
        ]
      );
      return;
    }
    shareSOSToWhatsApp(targetPhone, shareText);
  };

  const handleSendSMSToPhone = (phone?: string) => {
    const targetPhone = phone || personalContacts[0]?.phone;
    if (!targetPhone) {
      Alert.alert(
        'Sem Contacto Definido',
        'Ainda não tem nenhum número de emergência associado. Deseja escolher um contacto da sua lista telefónica agora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Escolher Contacto', onPress: handleImportDeviceContact },
        ]
      );
      return;
    }
    shareSOSToSMS(targetPhone, shareText);
  };

  const handleMarkSafe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (createdAlert && onSOSResolved) {
      onSOSResolved(createdAlert.id);
    } else if (onSOSResolved) {
      onSOSResolved();
    }
    setCreatedAlert(null);
    setIsDispatched(false);
    setCountdown(null);
    setShowImSafeView(false);
    onClose();
  };

  const handleOpenImSafe = () => {
    Haptics.selectionAsync();
    setCountdown(null);
    setShowImSafeView(true);
  };

  const handleSendImSafeWhatsApp = (phone?: string) => {
    const lat = currentLocation?.latitude ?? 38.7223;
    const lon = currentLocation?.longitude ?? -9.1393;
    const msg = createImSafeMessage(lat, lon);
    const targetPhone = phone || personalContacts[0]?.phone;
    if (!targetPhone) {
      Alert.alert(
        'Sem Contacto Definido',
        'Ainda não tem nenhum número de emergência associado. Deseja escolher um contacto da sua lista telefónica agora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Escolher Contacto', onPress: handleImportDeviceContact },
        ]
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    shareSOSToWhatsApp(targetPhone, msg);
  };

  const handleSendImSafeSMS = (phone?: string) => {
    const lat = currentLocation?.latitude ?? 38.7223;
    const lon = currentLocation?.longitude ?? -9.1393;
    const msg = createImSafeMessage(lat, lon);
    const targetPhone = phone || personalContacts[0]?.phone;
    if (!targetPhone) {
      Alert.alert(
        'Sem Contacto Definido',
        'Ainda não tem nenhum número de emergência associado. Deseja escolher um contacto da sua lista telefónica agora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Escolher Contacto', onPress: handleImportDeviceContact },
        ]
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    shareSOSToSMS(targetPhone, msg);
  };

  return (
    <>
      <M3Dialog visible={visible} onClose={onClose} backdropClose={false}>
      <View style={styles.card}>
          {showImSafeView ? (
            // I'M SAFE STATE
            <View style={styles.imSafeBox}>
              <View style={styles.alertHeader}>
                <View style={[styles.sirenIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.imSafeTitle}>Avisar que Estou Bem</Text>
                  <Text style={styles.imSafeSubtitle}>
                    Partilhe a sua localização e confirme que está em segurança
                  </Text>
                </View>
              </View>

              <View style={styles.coordCardSafe}>
                <Ionicons name="location" size={16} color="#10B981" />
                <Text style={styles.coordTextSafe}>
                  GPS: {(currentLocation?.latitude ?? 38.7223).toFixed(4)}, {(currentLocation?.longitude ?? -9.1393).toFixed(4)}
                </Text>
              </View>

              <View style={styles.actionsGrid}>
                {/* WhatsApp */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.imSafeWhatsAppBtn]}
                  onPress={() => handleSendImSafeWhatsApp()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
                  <View>
                    <Text style={styles.actionBtnTitle}>Enviar "Estou Bem"</Text>
                    <Text style={styles.actionBtnSub}>
                      {personalContacts.length > 0
                        ? `Para ${personalContacts[0].name}`
                        : 'Via WhatsApp'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* SMS */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.imSafeSMSBtn]}
                  onPress={() => handleSendImSafeSMS()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
                  <View>
                    <Text style={styles.actionBtnTitle}>Enviar por SMS</Text>
                    <Text style={styles.actionBtnSub}>
                      {personalContacts.length > 0
                        ? `Para ${personalContacts[0].name}`
                        : 'Sem necessidade de dados'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Personal Emergency Contacts Section */}
              <View style={styles.contactsSection}>
                <View style={styles.contactsSectionHeader}>
                  <Text style={styles.contactsSectionTitle}>ESCOLHER CONTACTO ESPECÍFICO</Text>
                  <TouchableOpacity
                    onPress={handleImportDeviceContact}
                    style={styles.addContactSmallBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add" size={13} color="#38BDF8" />
                    <Text style={styles.addContactSmallText}>+ Contacto</Text>
                  </TouchableOpacity>
                </View>

                {personalContacts.length > 0 ? (
                  personalContacts.map((contact) => (
                    <View key={contact.id} style={styles.contactSOSCard}>
                      <View style={[styles.contactAvatar, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Ionicons name="person" size={16} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactSOSName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        <Text style={styles.contactSOSPhone}>{contact.phone}</Text>
                      </View>
                      <View style={styles.contactActionsRow}>
                        <TouchableOpacity
                          style={[styles.miniActionBtn, styles.miniWhatsAppBtn]}
                          onPress={() => handleSendImSafeWhatsApp(contact.phone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                          <Text style={styles.miniBtnText}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniActionBtn, styles.miniSMSBtn]}
                          onPress={() => handleSendImSafeSMS(contact.phone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble" size={12} color="#FFFFFF" />
                          <Text style={styles.miniBtnText}>SMS</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <TouchableOpacity
                    style={styles.noContactsWarning}
                    onPress={handleImportDeviceContact}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="people" size={22} color="#38BDF8" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noContactsTitle}>Adicionar Contacto da Lista</Text>
                      <Text style={styles.noContactsSub}>
                        Para enviar mensagem rápida aos seus familiares
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Close / Return */}
              <TouchableOpacity
                style={styles.closeImSafeBtn}
                onPress={() => {
                  if (createdAlert && onSOSResolved) {
                    onSOSResolved(createdAlert.id);
                  }
                  setShowImSafeView(false);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                <Text style={styles.closeImSafeBtnText}>Concluir & Fechar</Text>
              </TouchableOpacity>
            </View>
          ) : countdown !== null && countdown > 0 ? (
            // COUNTDOWN STATE
            <View style={styles.countdownBox}>
              <View style={styles.iconPulseCircle}>
                <Ionicons name="warning" size={48} color="#EF4444" />
              </View>

              <Text style={styles.countdownTitle}>A Disparar Alerta SOS</Text>
              <Text style={styles.countdownNotice}>
                A enviar notificação de socorro para outros utilizadores na área e contactos em:
              </Text>

              <View style={styles.timerCircle}>
                <Text style={styles.timerNumber}>{countdown}</Text>
              </View>

              {/* I'M SAFE BUTTON (Direct safe status notification) */}
              <TouchableOpacity
                style={styles.imSafeCountdownBtn}
                onPress={handleOpenImSafe}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={styles.imSafeCountdownBtnText}>Estou Bem (Avisar Contactos)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelCountdown}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.cancelBtnText}>Cancelar SOS (Falso Alarme)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.immediateBtn}
                onPress={handleConfirmSOS}
                activeOpacity={0.8}
              >
                <Text style={styles.immediateBtnText}>Disparar Imediatamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // DISPATCHED ACTIVE SOS STATE
            <View style={styles.dispatchedBox}>
              <View style={styles.alertHeader}>
                <View style={styles.sirenIcon}>
                  <Ionicons name="megaphone" size={32} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dispatchedTitle}>SOS TRANSMITIDO!</Text>
                  <Text style={styles.dispatchedSubtitle}>
                    Notificação enviada a quem tem o Sentinela na sua área
                  </Text>
                </View>
              </View>

              <View style={styles.coordCard}>
                <Ionicons name="pin" size={16} color="#EF4444" />
                <Text style={styles.coordText}>
                  Localização: {createdAlert?.latitude.toFixed(4)}, {createdAlert?.longitude.toFixed(4)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsGrid}>
                {/* 112 Call */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.call112Btn]}
                  onPress={handleCall112}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={22} color="#FFFFFF" />
                  <View>
                    <Text style={styles.actionBtnTitle}>Ligar 112</Text>
                    <Text style={styles.actionBtnSub}>Emergência Nacional</Text>
                  </View>
                </TouchableOpacity>

                {/* WhatsApp with GPS link */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.whatsappBtn]}
                  onPress={() => handleSendWhatsAppToPhone()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
                  <View>
                    <Text style={styles.actionBtnTitle}>Enviar WhatsApp</Text>
                    <Text style={styles.actionBtnSub}>
                      {personalContacts.length > 0
                        ? `Para ${personalContacts[0].name}`
                        : 'Escolher da lista telefónica'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Direct SMS */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.smsBtn]}
                  onPress={() => handleSendSMSToPhone()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
                  <View>
                    <Text style={styles.actionBtnTitle}>Enviar por SMS</Text>
                    <Text style={styles.actionBtnSub}>
                      {personalContacts.length > 0
                        ? `Para ${personalContacts[0].name}`
                        : 'Sem necessidade de dados'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* I'm Safe option in dispatched state */}
              <TouchableOpacity
                style={styles.imSafeDispatchedBtn}
                onPress={handleOpenImSafe}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={styles.imSafeDispatchedBtnText}>Enviar "Estou Bem" aos Contactos</Text>
              </TouchableOpacity>

              {/* Personal Emergency Contacts Section */}
              <View style={styles.contactsSection}>
                <View style={styles.contactsSectionHeader}>
                  <Text style={styles.contactsSectionTitle}>CONTACTOS DE EMERGÊNCIA</Text>
                  <TouchableOpacity
                    onPress={handleImportDeviceContact}
                    style={styles.addContactSmallBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add" size={13} color="#38BDF8" />
                    <Text style={styles.addContactSmallText}>+ Importar Contacto</Text>
                  </TouchableOpacity>
                </View>

                {personalContacts.length > 0 ? (
                  personalContacts.map((contact) => (
                    <View key={contact.id} style={styles.contactSOSCard}>
                      <View style={styles.contactAvatar}>
                        <Ionicons name="person" size={16} color="#38BDF8" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contactSOSName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        <Text style={styles.contactSOSPhone}>{contact.phone}</Text>
                      </View>
                      <View style={styles.contactActionsRow}>
                        <TouchableOpacity
                          style={[styles.miniActionBtn, styles.miniWhatsAppBtn]}
                          onPress={() => handleSendWhatsAppToPhone(contact.phone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                          <Text style={styles.miniBtnText}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniActionBtn, styles.miniSMSBtn]}
                          onPress={() => handleSendSMSToPhone(contact.phone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble" size={13} color="#FFFFFF" />
                          <Text style={styles.miniBtnText}>SMS</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <TouchableOpacity
                    style={styles.noContactsWarning}
                    onPress={handleImportDeviceContact}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="people" size={22} color="#38BDF8" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noContactsTitle}>Adicionar Contacto da Lista Telefónica</Text>
                      <Text style={styles.noContactsSub}>
                        Para enviar o alerta diretamente aos seus familiares
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dismiss / Resolved -> Removes SOS from the map */}
              <TouchableOpacity
                style={styles.safeBtn}
                onPress={handleMarkSafe}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={styles.safeBtnText}>Já Estou em Segurança (Remover SOS)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </M3Dialog>

      <ContactPickerModal
        visible={showDevicePicker}
        contacts={deviceContacts}
        isLoading={isLoadingContacts}
        onClose={() => setShowDevicePicker(false)}
        onSelectContact={handleSelectDeviceContact}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.extraLarge,
    padding: 24,
    borderWidth: 1.5,
    borderColor: M3Colors.error,
    ...M3Elevation.level4,
  },
  countdownBox: {
    alignItems: 'center',
  },
  iconPulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(242, 184, 181, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: M3Colors.onSurface,
    textAlign: 'center',
  },
  countdownNotice: {
    fontSize: 13,
    color: M3Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18,
  },
  timerCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: M3Colors.sosBright,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    marginBottom: 20,
  },
  timerNumber: {
    fontSize: 38,
    fontWeight: '900',
    color: M3Colors.sosBright,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    width: '100%',
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    gap: 8,
  },
  cancelBtnText: {
    color: M3Colors.onSurface,
    fontWeight: '700',
    fontSize: 14,
  },
  immediateBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  immediateBtnText: {
    color: M3Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  dispatchedBox: {
    width: '100%',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sirenIcon: {
    width: 50,
    height: 50,
    borderRadius: M3Shapes.large,
    backgroundColor: M3Colors.sosBright,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dispatchedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: M3Colors.error,
    letterSpacing: 0.5,
  },
  dispatchedSubtitle: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  coordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: M3Shapes.medium,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  coordText: {
    color: M3Colors.onSurface,
    fontSize: 13,
    fontWeight: '500',
  },
  actionsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: M3Shapes.large,
    gap: 14,
  },
  call112Btn: {
    backgroundColor: M3Colors.sosBright,
  },
  whatsappBtn: {
    backgroundColor: '#15803D',
  },
  smsBtn: {
    backgroundColor: M3Colors.primaryContainer,
  },
  actionBtnTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
  },
  safeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: M3Colors.success,
    paddingVertical: 13,
    borderRadius: M3Shapes.full,
    gap: 8,
  },
  safeBtnText: {
    color: M3Colors.success,
    fontWeight: '700',
    fontSize: 14,
  },
  contactsSection: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.large,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  contactsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  addContactSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: M3Shapes.full,
    backgroundColor: M3Colors.primaryContainer,
  },
  addContactSmallText: {
    color: M3Colors.onPrimaryContainer,
    fontSize: 11,
    fontWeight: '700',
  },
  contactSOSCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainer,
    padding: 10,
    borderRadius: M3Shapes.medium,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  contactAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: M3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactSOSName: {
    color: M3Colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  contactSOSPhone: {
    color: M3Colors.primary,
    fontSize: 11,
    marginTop: 1,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: M3Shapes.full,
  },
  miniWhatsAppBtn: {
    backgroundColor: '#15803D',
  },
  miniSMSBtn: {
    backgroundColor: M3Colors.primaryContainer,
  },
  miniBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  noContactsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: M3Colors.surfaceContainer,
    borderRadius: M3Shapes.medium,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  noContactsTitle: {
    color: M3Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  noContactsSub: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  imSafeBox: {
    width: '100%',
  },
  imSafeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  imSafeSubtitle: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  coordCardSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: M3Shapes.small,
    marginBottom: 16,
  },
  coordTextSafe: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  imSafeWhatsAppBtn: {
    backgroundColor: '#16A34A',
  },
  imSafeSMSBtn: {
    backgroundColor: '#0284C7',
  },
  closeImSafeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: M3Shapes.full,
    gap: 8,
    marginTop: 8,
  },
  closeImSafeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  imSafeCountdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    width: '100%',
    paddingVertical: 12,
    borderRadius: M3Shapes.full,
    gap: 8,
    marginBottom: 12,
  },
  imSafeCountdownBtnText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  imSafeDispatchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    width: '100%',
    paddingVertical: 12,
    borderRadius: M3Shapes.full,
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  imSafeDispatchedBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
});
