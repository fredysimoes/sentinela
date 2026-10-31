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
                <Ionicons name="briefcase" size={26} color="#0F172A" />
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
                  <Ionicons name="navigate-outline" size={15} color="#38BDF8" />
                  <Text style={styles.estimateValue}>{formatDistance(distanceToWork)} de si</Text>
                </View>

                {walkMins !== null && (
                  <View style={styles.estimatePill}>
                    <Ionicons name="walk" size={15} color="#10B981" />
                    <Text style={styles.estimateValue}>~{formatDuration(walkMins)} a pé</Text>
                  </View>
                )}

                {driveMins !== null && (
                  <View style={styles.estimatePill}>
                    <Ionicons name="car-sport" size={15} color="#F59E0B" />
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
                <Ionicons name="navigate" size={20} color="#0F172A" />
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
                <Ionicons name="create-outline" size={16} color="#38BDF8" />
                <Text style={styles.secondaryActionText}>Alterar Morada</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={handleRemoveWork}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={[styles.secondaryActionText, { color: '#EF4444' }]}>
                  Remover
                </Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Guarantee Banner */}
            <View style={styles.privacyCard}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.privacyCardText}>
                Privacidade 100% Local: Esta morada é guardada estritamente no telemóvel e nunca é enviada para a nuvem.
              </Text>
            </View>
          </View>
        ) : (
          // Set / Edit Work Screen
          <View style={styles.content}>
            <View style={[styles.privacyCard, { marginBottom: 14 }]}>
              <Ionicons name="lock-closed" size={16} color="#38BDF8" />
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
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#f5f4ee',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
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
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#ffff00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
  },
  content: {
    gap: 12,
  },
  workCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    padding: 16,
    gap: 14,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  workPinCircle: {
    width: 46,
    height: 46,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ff0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  workCardAddress: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
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
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  estimateValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  navigateWorkBtn: {
    backgroundColor: '#ff0000',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  navigateWorkBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 10,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    padding: 10,
    gap: 8,
  },
  privacyCardText: {
    fontSize: 11,
    color: '#000000',
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffff00',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    padding: 14,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  currentLocBtnTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  currentLocBtnSub: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '600',
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
    height: 2,
    backgroundColor: '#000000',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  suggestionsListContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  suggestionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#000000',
    marginTop: 2,
  },
  cancelEditBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#e8e8e8',
  },
  cancelEditText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
