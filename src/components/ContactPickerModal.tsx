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
            <Ionicons name="search" size={18} color="#7D7582" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar por nome ou número..."
              placeholderTextColor="#7D7582"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#7D7582" />
              </TouchableOpacity>
            )}
          </View>

          {/* Contact List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f6a3ca" />
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
                  <Ionicons name="person-outline" size={40} color="#7D7582" />
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
                        <Ionicons name="call-outline" size={12} color="#7D7582" />
                        <Text style={styles.contactPhone}>{item.phone}</Text>
                      </View>
                    </View>
                    <Ionicons name="add" size={20} color="#383139" />
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
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    height: '86%',
    maxHeight: '90%',
    paddingTop: 16,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    backgroundColor: '#fffdf7',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#383139',
    textTransform: 'uppercase',
  },
  subtitle: {
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
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
    color: '#7D7582',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarInitial: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '900',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  contactPhone: {
    color: '#48404b',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#7D7582',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
