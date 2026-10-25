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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { EmergencyContact } from '../types';

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

            {/* Add Contact Form Toggle */}
            {!showAddForm ? (
              <TouchableOpacity
                style={styles.addToggleBtn}
                onPress={() => setShowAddForm(true)}
              >
                <Ionicons name="add-circle" size={20} color="#38BDF8" />
                <Text style={styles.addToggleText}>Adicionar Novo Contacto</Text>
              </TouchableOpacity>
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
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  contactPhone: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 1,
  },
  contactRelation: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderStyle: 'dashed',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  addToggleText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 14,
  },
  addForm: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
  },
  formTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
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
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  cancelAddText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  confirmAddBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    borderRadius: 8,
  },
  confirmAddText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13,
  },
});
