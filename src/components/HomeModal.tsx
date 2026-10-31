import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { HomeAddress, UserLocation } from '../types';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import { formatDuration } from '../services/routingService';
import { searchAddressSuggestions, reverseGeocodeCoordinate, AddressSuggestion } from '../services/geocodingService';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';
import { M3BottomSheetWrapper, M3DragHandle } from './M3MotionWrapper';

interface HomeModalProps {
  visible: boolean;
  onClose: () => void;
  currentHome: HomeAddress | null;
  userLocation: UserLocation | null;
  onSaveHome: (home: HomeAddress | null) => void;
  onNavigateHome?: (home: HomeAddress) => void;
}

export const HomeModal: React.FC<HomeModalProps> = ({
  visible,
  onClose,
  currentHome,
  userLocation,
  onSaveHome,
  onNavigateHome,
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

  // Use current GPS location as Home
  const handleUseCurrentLocation = async () => {
    if (!userLocation) {
      Alert.alert('Localização', 'A aguardar sinal GPS do telemóvel...');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLocating(true);
    try {
      const geo = await reverseGeocodeCoordinate(userLocation.latitude, userLocation.longitude);
      const newHome: HomeAddress = {
        title: 'Casa',
        address: `${geo.title}${geo.subtitle ? ' · ' + geo.subtitle : ''}`,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaveHome(newHome);
      setIsEditing(false);
      Alert.alert('Casa Guardada', 'A sua localização atual foi gravada como morada de casa!');
    } catch {
      Alert.alert('Erro', 'Não foi possível determinar a morada atual.');
    } finally {
      setIsLocating(false);
    }
  };

  // Select suggestion as Home
  const handleSelectSuggestion = (item: AddressSuggestion) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newHome: HomeAddress = {
      title: 'Casa',
      address: `${item.title}${item.subtitle ? ' · ' + item.subtitle : ''}`,
      latitude: item.latitude,
      longitude: item.longitude,
    };

    onSaveHome(newHome);
    setIsEditing(false);
    setQuery('');
    setSuggestions([]);
    Alert.alert('Casa Guardada', `Morada de casa guardada com sucesso:\n${newHome.address}`);
  };

  // Remove Home
  const handleRemoveHome = () => {
    Alert.alert(
      'Remover Casa',
      'Tem a certeza que deseja remover a morada de casa guardada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onSaveHome(null);
            setIsEditing(false);
          },
        },
      ]
    );
  };

  // Calculate distance & ETA to home
  const distanceToHome = currentHome && userLocation
    ? calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        currentHome.latitude,
        currentHome.longitude
      )
    : null;

  const walkMins = distanceToHome ? Math.max(1, Math.round(distanceToHome / 75)) : null;
  const driveMins = distanceToHome ? Math.max(1, Math.round((distanceToHome / 500) + 1)) : null;

  const handleNavigate = () => {
    if (!currentHome || !onNavigateHome) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onClose();
    onNavigateHome(currentHome);
  };

  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      {/* M3 Official Drag Handle */}
      <M3DragHandle />

      {/* Header */}
      <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.homeIconCircle}>
                <Ionicons name="home" size={20} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>A Minha Casa</Text>
                <Text style={styles.headerSubtitle}>
                  Inicie um trajeto seguro para casa com 1 clique
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Existing Home Screen */}
          {currentHome && !isEditing ? (
            <View style={styles.content}>
              <View style={styles.homeCard}>
                <View style={styles.homePinCircle}>
                  <Ionicons name="home" size={24} color="#383139" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.homeCardTitle}>{currentHome.title}</Text>
                  <Text style={styles.homeCardAddress} numberOfLines={2}>
                    {currentHome.address}
                  </Text>
                </View>
              </View>

              {distanceToHome !== null && (
                <View style={styles.estimatesRow}>
                  <View style={styles.estimatePill}>
                    <Ionicons name="navigate-outline" size={15} color="#383139" />
                    <Text style={styles.estimateValue}>{formatDistance(distanceToHome)} de si</Text>
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

              {/* Main Navigate Home Button */}
              {onNavigateHome && (
                <TouchableOpacity
                  style={styles.navigateHomeBtn}
                  onPress={handleNavigate}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={18} color="#383139" />
                  <Text style={styles.navigateHomeBtnText}>Ir Para Casa em Segurança</Text>
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
                  onPress={handleRemoveHome}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#383139" />
                  <Text style={styles.secondaryActionText}>
                    Remover Casa
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Privacy Guarantee Banner */}
              <View style={styles.privacyCard}>
                <Ionicons name="shield-checkmark" size={16} color="#383139" />
                <Text style={styles.privacyCardText}>
                  Privacidade 100% Local: Esta morada é armazenada exclusivamente na memória encriptada do seu telemóvel e nunca é enviada para a nuvem nem para terceiros.
                </Text>
              </View>
            </View>
          ) : (
            // Set / Edit Home Screen
            <View style={styles.content}>
              {/* Privacy Notice Banner */}
              <View style={[styles.privacyCard, { marginBottom: 14 }]}>
                <Ionicons name="lock-closed" size={16} color="#383139" />
                <Text style={styles.privacyCardText}>
                  Privacidade Garantida: A sua morada fica gravada apenas no telemóvel para cálculo de rotas seguras e nunca sai do seu dispositivo.
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
                    Guarda as suas coordenadas GPS de agora como casa
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
                <Ionicons name="search" size={18} color="#38BDF8" />
                <TextInput
                  style={styles.input}
                  placeholder="Rua, avenida ou local de casa..."
                  placeholderTextColor="#64748B"
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                />
                {isLoading && <ActivityIndicator size="small" color="#38BDF8" />}
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
                        <Ionicons name="location-sharp" size={18} color="#38BDF8" />
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

              {currentHome && isEditing && (
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelEditText}>Voltar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    maxHeight: '88%',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
    backgroundColor: '#fffdf7',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#f9e7a8',
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
    padding: 20,
  },
  homeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    padding: 16,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ffffff',
    gap: 14,
    marginBottom: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  homePinCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#f6a3ca',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeCardTitle: {
    color: '#383139',
    fontSize: 16,
    fontWeight: '800',
  },
  homeCardAddress: {
    color: '#48404b',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 16,
  },
  estimatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  estimatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffdf7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  estimateValue: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '800',
  },
  navigateHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6a3ca',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  navigateHomeBtnText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '800',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    gap: 10,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ded0f9',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryActionText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '700',
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0efdc',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    gap: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  currentLocBtnTitle: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '800',
  },
  currentLocBtnSub: {
    color: '#48404b',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(56, 49, 57, 0.1)',
  },
  dividerText: {
    color: '#7D7582',
    fontSize: 10,
    fontWeight: '800',
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
    height: 50,
    gap: 8,
    marginBottom: 10,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    color: '#383139',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsListContainer: {
    backgroundColor: '#fffdf7',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 49, 57, 0.06)',
    gap: 10,
  },
  suggestionTitle: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionSubtitle: {
    color: '#48404b',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  cancelEditBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
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
    color: '#383139',
    fontSize: 13,
    fontWeight: '700',
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginTop: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyCardText: {
    flex: 1,
    color: '#48404b',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
});
