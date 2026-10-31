import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { WorkAddress, UserLocation } from '../types';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import { formatDuration } from '../services/routingService';
import { searchAddressSuggestions, reverseGeocodeCoordinate, AddressSuggestion } from '../services/geocodingService';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3BottomSheetWrapper, M3DragHandle } from './M3MotionWrapper';

interface WorkModalProps {
  visible: boolean;
  onClose: () => void;
  currentWork: WorkAddress | null;
  userLocation: UserLocation | null;
  onSaveWork: (work: WorkAddress | null) => void;
  onNavigateWork?: (work: WorkAddress) => void;
}

export const WorkModal: React.FC<WorkModalProps> = ({
  visible,
  onClose,
  currentWork,
  userLocation,
  onSaveWork,
  onNavigateWork,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setIsEditing(false);
      setQuery('');
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchAddressSuggestions(trimmed, userLocation);
      setSuggestions(results);
      setIsLoading(false);
    }, 280);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, userLocation?.latitude, userLocation?.longitude]);

  // Use current GPS location as Work
  const handleUseCurrentLocation = async () => {
    if (!userLocation) {
      Alert.alert('Localização', 'A aguardar sinal GPS do telemóvel...');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLocating(true);
    try {
      const geo = await reverseGeocodeCoordinate(userLocation.latitude, userLocation.longitude);
      const newWork: WorkAddress = {
        title: 'Trabalho',
        address: `${geo.title}${geo.subtitle ? ' · ' + geo.subtitle : ''}`,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaveWork(newWork);
      setIsEditing(false);
      Alert.alert('Trabalho Guardado', 'A sua localização atual foi gravada como local de trabalho!');
    } catch {
      Alert.alert('Erro', 'Não foi possível determinar a morada atual.');
    } finally {
      setIsLocating(false);
    }
  };

  // Select suggestion as Work
  const handleSelectSuggestion = (item: AddressSuggestion) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newWork: WorkAddress = {
      title: 'Trabalho',
      address: `${item.title}${item.subtitle ? ' · ' + item.subtitle : ''}`,
      latitude: item.latitude,
      longitude: item.longitude,
    };

    onSaveWork(newWork);
    setIsEditing(false);
    setQuery('');
    setSuggestions([]);
    Alert.alert('Trabalho Guardado', `Morada de trabalho guardada com sucesso:\n${newWork.address}`);
  };

  // Remove Work
  const handleRemoveWork = () => {
    Alert.alert(
      'Remover Trabalho',
      'Tem a certeza que deseja remover o local de trabalho guardado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onSaveWork(null);
            setIsEditing(false);
          },
        },
      ]
    );
  };

  const distanceToWork = currentWork && userLocation
    ? calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        currentWork.latitude,
        currentWork.longitude
      )
    : null;

  const walkMins = distanceToWork ? Math.max(1, Math.round(distanceToWork / 75)) : null;
  const driveMins = distanceToWork ? Math.max(1, Math.round((distanceToWork / 500) + 1)) : null;

  const handleNavigate = () => {
    if (!currentWork || !onNavigateWork) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onClose();
    onNavigateWork(currentWork);
  };

  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      <View style={styles.sheetContent}>
        {/* M3 Official Drag Handle */}
        <M3DragHandle />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.workIconCircle}>
              <Ionicons name="briefcase" size={20} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.headerTitle}>O Meu Trabalho</Text>
              <Text style={styles.headerSubtitle}>
                Inicie um trajeto rápido para o trabalho com 1 clique
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Existing Work Screen */}
        {currentWork && !isEditing ? (
          <View style={styles.content}>
            <View style={styles.workCard}>
              <View style={styles.workPinCircle}>
                <Ionicons name="briefcase" size={24} color="#383139" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workCardTitle}>{currentWork.title}</Text>
                <Text style={styles.workCardAddress} numberOfLines={2}>
                  {currentWork.address}
                </Text>
              </View>
            </View>

            {distanceToWork !== null && (
              <View style={styles.estimatesRow}>
                <View style={styles.estimatePill}>
                  <Ionicons name="navigate-outline" size={15} color="#383139" />
                  <Text style={styles.estimateValue}>{formatDistance(distanceToWork)} de si</Text>
                </View>

                {walkMins !== null && (
                  <View style={styles.estimatePill}>
                    <Ionicons name="walk" size={15} color="#383139" />
                    <Text style={styles.estimateValue}>~{formatDuration(walkMins)} a pé</Text>
                  </View>
                )}

                {driveMins !== null && (
                  <View style={styles.estimatePill}>
                    <Ionicons name="car-sport" size={15} color="#383139" />
                    <Text style={styles.estimateValue}>~{formatDuration(driveMins)} de carro</Text>
                  </View>
                )}
              </View>
            )}

            {/* Main Navigate Work Button */}
            {onNavigateWork && (
              <TouchableOpacity
                style={styles.navigateWorkBtn}
                onPress={handleNavigate}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={18} color="#383139" />
                <Text style={styles.navigateWorkBtnText}>Ir Para o Trabalho</Text>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => setIsEditing(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color="#383139" />
                <Text style={styles.secondaryActionText}>Alterar Morada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={handleRemoveWork}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#383139" />
                <Text style={styles.secondaryActionText}>
                  Remover
                </Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Guarantee Banner */}
            <View style={styles.privacyCard}>
              <Ionicons name="shield-checkmark" size={16} color="#383139" />
              <Text style={styles.privacyCardText}>
                Privacidade 100% Local: Esta morada é guardada estritamente no telemóvel e nunca é enviada para a nuvem.
              </Text>
            </View>
          </View>
        ) : (
          // Set / Edit Work Screen
          <View style={styles.content}>
            <View style={[styles.privacyCard, { marginBottom: 14 }]}>
              <Ionicons name="lock-closed" size={16} color="#383139" />
              <Text style={styles.privacyCardText}>
                Privacidade Garantida: O endereço do seu trabalho é armazenado de forma privada no dispositivo para cálculo de rotas.
              </Text>
            </View>

            {/* Option A: Use Current Location */}
            <TouchableOpacity
              style={styles.currentLocBtn}
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
              activeOpacity={0.85}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Ionicons name="locate" size={20} color="#0F172A" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.currentLocBtnTitle}>
                  {isLocating ? 'A obter morada...' : 'Definir com a Minha Localização Atual'}
                </Text>
                <Text style={styles.currentLocBtnSub}>
                  Guarda as coordenadas GPS de agora como local de trabalho
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU PESQUISE A MORADA</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Option B: Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#F59E0B" />
              <TextInput
                style={styles.input}
                placeholder="Rua, avenida ou nome da empresa/local..."
                placeholderTextColor="#64748B"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {isLoading && <ActivityIndicator size="small" color="#F59E0B" />}
            </View>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsListContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="always"
                  style={{ maxHeight: 200 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-sharp" size={18} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {currentWork && (
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelEditText}>Cancelar Alteração</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: '#fffdf7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
    paddingBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ded0f9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#383139',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#48404b',
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    gap: 12,
  },
  workCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 28,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  workPinCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#c0efdc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#383139',
  },
  workCardAddress: {
    fontSize: 12,
    color: '#48404b',
    fontWeight: '500',
    marginTop: 4,
  },
  estimatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  estimatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  estimateValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#383139',
  },
  navigateWorkBtn: {
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  navigateWorkBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#383139',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ded0f9',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#383139',
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    padding: 12,
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyCardText: {
    fontSize: 11,
    color: '#48404b',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0efdc',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    padding: 14,
    gap: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  currentLocBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#383139',
  },
  currentLocBtnSub: {
    fontSize: 11,
    color: '#48404b',
    fontWeight: '500',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(56, 49, 57, 0.1)',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7D7582',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#383139',
  },
  suggestionsListContainer: {
    backgroundColor: '#fffdf7',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 49, 57, 0.06)',
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#383139',
  },
  suggestionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#48404b',
    marginTop: 2,
  },
  cancelEditBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#fffdf7',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelEditText: {
    fontSize: 13,
    color: '#383139',
    fontWeight: '700',
  },
});
