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
import * as Contacts from 'expo-contacts';
import Haptics from '../utils/haptics';
import { EmergencyContact, SOSAlert, UserLocation } from '../types';
import { createAndDispatchSOS, shareSOSToWhatsApp, shareSOSToSMS } from '../services/sos';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  currentLocation: UserLocation | null;
  emergencyContacts: EmergencyContact[];
  onSOSCreated: (alert: SOSAlert) => void;
  onUpdateContacts?: (contacts: EmergencyContact[]) => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({
  visible,
  onClose,
  currentLocation,
  emergencyContacts,
  onSOSCreated,
  onUpdateContacts,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isDispatched, setIsDispatched] = useState(false);
  const [createdAlert, setCreatedAlert] = useState<SOSAlert | null>(null);
  const [shareText, setShareText] = useState('');

  const personalContacts = emergencyContacts.filter((c) => c.phone !== '112');

  const handleImportDeviceContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão de Contactos',
          'O Sentinela necessita de aceder aos seus contactos para selecionar os números de emergência para onde enviar SMS e WhatsApp em caso de SOS.'
        );
        return;
      }

      const picked = await Contacts.presentContactPickerAsync();
      if (!picked) return;

      const phoneNumbers = picked.phoneNumbers || [];
      if (phoneNumbers.length === 0 || !phoneNumbers[0]?.number) {
        Alert.alert(
          'Contacto Sem Telefone',
          'O contacto selecionado não tem nenhum número de telefone associado.'
        );
        return;
      }

      const rawName =
        picked.name ||
        [picked.firstName, picked.lastName].filter(Boolean).join(' ') ||
        'Contacto de Confiança';
      const rawPhone = phoneNumbers[0].number;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newContact: EmergencyContact = {
        id: `contact-${Date.now()}`,
        name: rawName.trim(),
        phone: rawPhone.trim(),
        relation: 'Contacto de Emergência',
      };

      const updated = [newContact, ...emergencyContacts.filter((c) => c.phone !== rawPhone)];
      if (onUpdateContacts) {
        onUpdateContacts(updated);
      }
    } catch (err) {
      console.warn('Erro ao aceder aos contactos do telemóvel:', err);
      Alert.alert('Contactos', 'Não foi possível aceder à lista de contactos do telemóvel.');
    }
  };

  // Start 5-second countdown whenever modal opens
  useEffect(() => {
    if (visible && !isDispatched) {
      setCountdown(5);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (!visible) {
      setCountdown(null);
      setIsDispatched(false);
      setCreatedAlert(null);
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
      latitude: lat,
      longitude: lon,
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

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {countdown !== null && countdown > 0 ? (
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

              {/* Dismiss / Resolved */}
              <TouchableOpacity
                style={styles.safeBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={styles.safeBtnText}>Já Estou em Segurança / Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
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
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  countdownBox: {
    alignItems: 'center',
  },
  iconPulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  countdownTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  countdownNotice: {
    fontSize: 13,
    color: '#94A3B8',
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
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    marginBottom: 20,
  },
  timerNumber: {
    fontSize: 38,
    fontWeight: '900',
    color: '#EF4444',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  immediateBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
  immediateBtnText: {
    color: '#EF4444',
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
    borderRadius: 25,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dispatchedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  dispatchedSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
  coordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  coordText: {
    color: '#E2E8F0',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 14,
  },
  call112Btn: {
    backgroundColor: '#DC2626',
  },
  whatsappBtn: {
    backgroundColor: '#16A34A',
  },
  smsBtn: {
    backgroundColor: '#2563EB',
  },
  actionBtnTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
  },
  safeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  safeBtnText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 14,
  },
  contactsSection: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactsSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  addContactSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  addContactSmallText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  contactSOSCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactSOSName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  contactSOSPhone: {
    color: '#38BDF8',
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniWhatsAppBtn: {
    backgroundColor: '#16A34A',
  },
  miniSMSBtn: {
    backgroundColor: '#2563EB',
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
    padding: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  noContactsTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  noContactsSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
});
