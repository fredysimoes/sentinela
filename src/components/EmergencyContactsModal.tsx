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
              <Ionicons name="person" size={18} color="#38BDF8" />
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
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
              <Ionicons name="people" size={20} color="#080A0C" />
              <Text style={styles.importContactsText}>Importar dos Contactos do Telemóvel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addToggleBtn}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#080A0C" />
              <Text style={styles.addToggleText}>Adicionar Manualmente</Text>
            </TouchableOpacity>
          </View>
            ) : (
              <View style={styles.addForm}>
                <Text style={styles.formTitle}>NOVO CONTACTO</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nome (ex: Maria / Pai / Amigo)"
                  placeholderTextColor="#64748B"
                  value={newName}
                  onChangeText={setNewName}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Número de Telemóvel (ex: +351 912 345 678)"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Grau / Relação (ex: Mãe, Vizinho, Parceiro)"
                  placeholderTextColor="#64748B"
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetContainer: {
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 120 : 115,
    borderTopWidth: 4,
    borderTopColor: '#000000',
    ...M3Elevation.level4,
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
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    backgroundColor: '#f5f4ee',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#000000',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 0,
    marginBottom: 10,
    borderWidth: 2.5,
    borderColor: '#000000',
    gap: 12,
    ...M3Elevation.level1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffff00',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
  },
  contactPhone: {
    fontSize: 13,
    color: '#ff0000',
    marginTop: 1,
    fontWeight: '800',
  },
  contactRelation: {
    fontSize: 11,
    color: '#000000',
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
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    ...M3Elevation.level2,
  },
  importContactsText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffff00',
    height: 48,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 8,
    ...M3Elevation.level2,
  },
  addToggleText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
    textTransform: 'uppercase',
  },
  addForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 14,
    borderWidth: 3,
    borderColor: '#000000',
    marginTop: 8,
    ...M3Elevation.level2,
  },
  formTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f5f4ee',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#000000',
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
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  cancelAddText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  confirmAddBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ff0000',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  confirmAddText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
  },
});
