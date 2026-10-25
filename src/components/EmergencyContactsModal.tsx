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
import * as Contacts from 'expo-contacts';
import Haptics from '../utils/haptics';
import { EmergencyContact } from '../types';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';

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
        relation: 'Contacto Pessoal',
      };

      const updated = [newContact, ...list];
      setList(updated);
      onSaveContacts(updated);
    } catch (err) {
      console.warn('Erro ao aceder aos contactos do telemóvel:', err);
      Alert.alert(
        'Contactos',
        'Não foi possível abrir a lista de contactos nativa. Pode adicionar o número manualmente.'
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Contactos de Emergência</Text>
              <Text style={styles.headerSubtitle}>
                Quem receberá o seu SOS por WhatsApp e SMS
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                  onPress={handleImportDeviceContact}
                  activeOpacity={0.85}
                >
                  <Ionicons name="people" size={20} color="#0F172A" />
                  <Text style={styles.importContactsText}>Importar dos Contactos do Telemóvel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addToggleBtn}
                  onPress={() => setShowAddForm(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#38BDF8" />
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetContainer: {
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
    maxHeight: '85%',
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
  headerTitle: {
    fontSize: 19,
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
  content: {
    padding: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: M3Shapes.large,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: M3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  contactPhone: {
    fontSize: 13,
    color: M3Colors.primary,
    marginTop: 1,
  },
  contactRelation: {
    fontSize: 11,
    color: M3Colors.onSurfaceVariant,
    marginTop: 1,
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
    backgroundColor: M3Colors.primaryContainer,
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    gap: 8,
    ...M3Elevation.level2,
  },
  importContactsText: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 14,
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    paddingVertical: 12,
    borderRadius: M3Shapes.full,
    gap: 8,
  },
  addToggleText: {
    color: M3Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  addForm: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.large,
    padding: 14,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    marginTop: 8,
  },
  formTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: M3Colors.onSurface,
    fontSize: 14,
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
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.full,
  },
  cancelAddText: {
    color: M3Colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 13,
  },
  confirmAddBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: M3Colors.primaryContainer,
    borderRadius: M3Shapes.full,
  },
  confirmAddText: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 13,
  },
});
