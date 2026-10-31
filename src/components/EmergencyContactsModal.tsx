import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmergencyContact } from '../types';
import Haptics from '../utils/haptics';
import { loadDeviceContactsList, DeviceContactItem } from '../services/contactPicker';
import { ContactPickerModal } from './ContactPickerModal';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';
import { M3BottomSheetWrapper } from './M3MotionWrapper';

interface EmergencyContactsModalProps {
  visible: boolean;
  onClose: () => void;
  contacts: EmergencyContact[];
  onSaveContacts: (contacts: EmergencyContact[]) => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  visible,
  onClose,
  contacts,
  onSaveContacts,
}) => {
  const [list, setList] = useState<EmergencyContact[]>(contacts);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContactItem[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  const handleAddContact = () => {
    if (!newName.trim() || !newPhone.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = [
      ...list,
      {
        id: `contact-${Date.now()}`,
        name: newName.trim(),
        phone: newPhone.trim(),
        relation: newRelation.trim() || 'Contacto de Confiança',
      },
    ];

    setList(updated);
    onSaveContacts(updated);
    setNewName('');
    setNewPhone('');
    setNewRelation('');
    setShowAddForm(false);
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = list.filter((c) => c.id !== id);
    setList(updated);
    onSaveContacts(updated);
  };

  const handleOpenDeviceContactPicker = async () => {
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
      relation: 'Contacto Pessoal',
    };

    const updated = [newContact, ...list.filter((c) => c.phone !== picked.phone)];
    setList(updated);
    onSaveContacts(updated);
  };

  return (
    <>
      <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="call-outline" size={20} color="#10B981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Contactos de Emergência</Text>
            <Text style={styles.headerSubtitle}>
              Quem receberá o seu SOS por WhatsApp e SMS
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact List */}
        {list.map((contact) => (
          <View key={contact.id} style={styles.contactItem}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={18} color="#383139" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
              <Text style={styles.contactRelation}>{contact.relation}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemove(contact.id)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={18} color="#f6a3ca" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Contact Actions */}
        {!showAddForm ? (
          <View style={styles.actionButtonsStack}>
            <TouchableOpacity
              style={styles.importContactsBtn}
              onPress={handleOpenDeviceContactPicker}
              activeOpacity={0.85}
            >
              <Ionicons name="people" size={20} color="#383139" />
              <Text style={styles.importContactsText}>Importar dos Contactos do Telemóvel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addToggleBtn}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#383139" />
              <Text style={styles.addToggleText}>Adicionar Manualmente</Text>
            </TouchableOpacity>
          </View>
            ) : (
              <View style={styles.addForm}>
                <Text style={styles.formTitle}>NOVO CONTACTO</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nome (ex: Maria / Pai / Amigo)"
                  placeholderTextColor="#7D7582"
                  value={newName}
                  onChangeText={setNewName}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Número de Telemóvel (ex: +351 912 345 678)"
                  placeholderTextColor="#7D7582"
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Grau / Relação (ex: Mãe, Vizinho, Parceiro)"
                  placeholderTextColor="#7D7582"
                  value={newRelation}
                  onChangeText={setNewRelation}
                />

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelAddBtn}
                    onPress={() => setShowAddForm(false)}
                  >
                    <Text style={styles.cancelAddText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmAddBtn}
                    onPress={handleAddContact}
                  >
                    <Text style={styles.confirmAddText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
    </M3BottomSheetWrapper>

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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
  },
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 120 : 115,
    borderTopWidth: 2,
    borderTopColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollContent: {
    paddingBottom: 40,
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
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#f6a3ca',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#383139',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7D7582',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    padding: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 24,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#383139',
  },
  contactPhone: {
    fontSize: 13,
    color: '#48404b',
    marginTop: 1,
    fontWeight: '800',
  },
  contactRelation: {
    fontSize: 11,
    color: '#7D7582',
    marginTop: 1,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
  },
  actionButtonsStack: {
    gap: 10,
    marginTop: 6,
  },
  importContactsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  importContactsText: {
    color: '#383139',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ded0f9',
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  addToggleText: {
    color: '#383139',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
  },
  addForm: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginTop: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#383139',
    marginBottom: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f1f2fa',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelAddBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelAddText: {
    color: '#383139',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  confirmAddBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  confirmAddText: {
    color: '#383139',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
  },
});
