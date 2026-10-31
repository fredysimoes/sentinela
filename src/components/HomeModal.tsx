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
                  <Ionicons name="home" size={28} color="#0F172A" />
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
                    <Ionicons name="navigate-outline" size={15} color="#38BDF8" />
                    <Text style={styles.estimateValue}>{formatDistance(distanceToHome)} de si</Text>
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

              {/* Main Navigate Home Button */}
              {onNavigateHome && (
                <TouchableOpacity
                  style={styles.navigateHomeBtn}
                  onPress={handleNavigate}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate" size={20} color="#0F172A" />
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
                  <Ionicons name="create-outline" size={16} color="#38BDF8" />
                  <Text style={styles.secondaryActionText}>Alterar Morada</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={handleRemoveHome}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={[styles.secondaryActionText, { color: '#EF4444' }]}>
                    Remover Casa
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Privacy Guarantee Banner */}
              <View style={styles.privacyCard}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
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
                <Ionicons name="lock-closed" size={16} color="#38BDF8" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
    borderTopWidth: 1,
    borderColor: M3Colors.outlineVariant,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    maxHeight: '88%',
    ...M3Elevation.level4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: M3Shapes.medium,
    backgroundColor: M3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 6,
  },
  content: {
    padding: 20,
  },
  homeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: 16,
    borderRadius: M3Shapes.large,
    borderWidth: 1,
    borderColor: M3Colors.primary,
    gap: 14,
    marginBottom: 12,
  },
  homePinCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: M3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeCardTitle: {
    color: M3Colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  homeCardAddress: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
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
    backgroundColor: M3Colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: M3Shapes.small,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  estimateValue: {
    color: M3Colors.onSurface,
    fontSize: 11,
    fontWeight: '600',
  },
  navigateHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M3Colors.primaryContainer,
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    gap: 8,
    ...M3Elevation.level2,
    marginBottom: 12,
  },
  navigateHomeBtnText: {
    color: M3Colors.onPrimaryContainer,
    fontSize: 15,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  secondaryActionText: {
    color: M3Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.secondaryContainer,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: M3Shapes.large,
    gap: 12,
    borderWidth: 1,
    borderColor: M3Colors.secondary,
    ...M3Elevation.level2,
    marginBottom: 16,
  },
  currentLocBtnTitle: {
    color: M3Colors.onSecondaryContainer,
    fontSize: 14,
    fontWeight: '700',
  },
  currentLocBtnSub: {
    color: M3Colors.onSecondaryContainer,
    opacity: 0.85,
    fontSize: 11,
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
    height: 1,
    backgroundColor: M3Colors.outlineVariant,
  },
  dividerText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.extraLarge,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    paddingHorizontal: 16,
    height: 50,
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: M3Colors.onSurface,
    fontSize: 14,
    fontWeight: '400',
  },
  suggestionsListContainer: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.large,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    overflow: 'hidden',
    marginBottom: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(68, 71, 78, 0.4)',
    gap: 10,
  },
  suggestionTitle: {
    color: M3Colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionSubtitle: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 1,
  },
  cancelEditBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  cancelEditText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginTop: 14,
  },
  privacyCardText: {
    flex: 1,
    color: '#A6F4C5',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
});
