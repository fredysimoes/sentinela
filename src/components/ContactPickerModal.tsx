import React, { useState, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeviceContactItem } from '../services/contactPicker';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';

interface ContactPickerModalProps {
  visible: boolean;
  contacts: DeviceContactItem[];
  isLoading: boolean;
  onClose: () => void;
  onSelectContact: (contact: DeviceContactItem) => void;
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({
  visible,
  contacts,
  isLoading,
  onClose,
  onSelectContact,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.replace(/\s+/g, '').includes(query.replace(/\s+/g, ''))
    );
  }, [contacts, searchQuery]);

  const handleSelect = (contact: DeviceContactItem) => {
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    onSelectContact(contact);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Selecionar Contacto</Text>
              <Text style={styles.subtitle}>
                {isLoading
                  ? 'A ler a sua lista de contactos...'
                  : `${filteredContacts.length} contactos encontrados`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar por nome ou número..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Contact List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.loadingText}>A aceder aos contactos do dispositivo...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={40} color="#475569" />
                  <Text style={styles.emptyText}>
                    {searchQuery.trim()
                      ? 'Nenhum contacto encontrado para a pesquisa.'
                      : 'Não foram encontrados contactos no dispositivo.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const initial = item.name.charAt(0).toUpperCase() || '?';
                return (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.phoneRow}>
                        <Ionicons name="call-outline" size={12} color="#38BDF8" />
                        <Text style={styles.contactPhone}>{item.phone}</Text>
                      </View>
                    </View>
                    <Ionicons name="add" size={20} color="#38BDF8" />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E222A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '86%',
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: '#2D323F',
    paddingTop: 16,
    ...M3Elevation.level4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D323F',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#282E3C',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171A21',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D323F',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171A21',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262B36',
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#282E3C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  avatarInitial: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  contactPhone: {
    color: '#94A3B8',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
