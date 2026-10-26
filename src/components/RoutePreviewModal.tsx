import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { PedestrianRoute, RouteCoordinate, TransportMode } from '../types/navigation';
import { formatDistance } from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { searchAddressSuggestions, AddressSuggestion } from '../services/geocodingService';
import { M3BottomSheetWrapper, M3Pressable } from './M3MotionWrapper';

export interface RouteEndpoint {
  name: string;
  coord: RouteCoordinate;
}

interface RoutePreviewModalProps {
  visible: boolean;
  destinationName: string;
  destinationCoord?: RouteCoordinate | null;
  originName?: string;
  originCoord?: RouteCoordinate | null;
  safeRoute: PedestrianRoute | null;
  directRoute?: PedestrianRoute;
  currentMode?: TransportMode;
  userLocation?: { latitude: number; longitude: number } | null;
  homeAddress?: { latitude: number; longitude: number; label?: string } | null;
  onToggleMode?: (mode: TransportMode) => void;
  onClose: () => void;
  onStartNavigation: (chosenRoute: PedestrianRoute) => void;
  onUpdateEndpoints?: (origin: RouteEndpoint, destination: RouteEndpoint) => void;
}

export const RoutePreviewModal: React.FC<RoutePreviewModalProps> = ({
  visible,
  destinationName,
  destinationCoord,
  originName = 'A minha localização',
  originCoord,
  safeRoute,
  directRoute,
  currentMode = 'walking',
  userLocation,
  homeAddress,
  onToggleMode,
  onClose,
  onStartNavigation,
  onUpdateEndpoints,
}) => {
  if (!safeRoute) return null;

  const [selectedRouteId, setSelectedRouteId] = useState<string>(safeRoute.id);
  const [editingTarget, setEditingTarget] = useState<'origin' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const originInputRef = useRef<any>(null);
  const destInputRef = useRef<any>(null);
  const swapRotateAnim = useRef(new Animated.Value(0)).current;
  const swapCount = useRef(0);

  useEffect(() => {
    setSelectedRouteId(safeRoute.id);
  }, [safeRoute.id]);

  // Real-time suggestions when searching an endpoint
  useEffect(() => {
    if (!editingTarget) {
      setSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchAddressSuggestions(trimmed, userLocation);
      setSuggestions(results);
      setIsSearching(false);
    }, 280);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, editingTarget]);

  const selectedRoute =
    directRoute && selectedRouteId === directRoute.id ? directRoute : safeRoute;

  const handleSelectRoute = (route: PedestrianRoute) => {
    Haptics.selectionAsync();
    setSelectedRouteId(route.id);
  };

  const handleStart = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    onStartNavigation(selectedRoute);
  };

  // Swap Point A and Point B with 180deg animated rotation
  const handleSwap = () => {
    if (!onUpdateEndpoints || !destinationCoord) return;
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);

    swapCount.current += 1;
    Animated.spring(swapRotateAnim, {
      toValue: swapCount.current * 180,
      tension: 240,
      friction: 12,
      useNativeDriver: true,
    }).start();

    const currentOriginCoord = originCoord || (userLocation ? {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    } : null);

    if (!currentOriginCoord) return;

    const newOrigin: RouteEndpoint = {
      name: destinationName,
      coord: destinationCoord,
    };

    const newDest: RouteEndpoint = {
      name: originName,
      coord: currentOriginCoord,
    };

    onUpdateEndpoints(newOrigin, newDest);
  };

  const handleStartEditOrigin = () => {
    Haptics.selectionAsync();
    setEditingTarget('origin');
    setSearchQuery(originName === 'A minha localização' ? '' : originName);
    setTimeout(() => {
      originInputRef.current?.focus();
    }, 50);
  };

  const handleStartEditDest = () => {
    Haptics.selectionAsync();
    setEditingTarget('destination');
    setSearchQuery(destinationName);
    setTimeout(() => {
      destInputRef.current?.focus();
    }, 50);
  };

  // Select a preset or search suggestion for the selected endpoint
  const handleSelectEndpoint = (name: string, coord: RouteCoordinate) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();

    const currentOrigin: RouteEndpoint = {
      name: originName,
      coord: originCoord || (userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : { latitude: 38.7223, longitude: -9.1393 }),
    };

    const currentDest: RouteEndpoint = {
      name: destinationName,
      coord: destinationCoord || { latitude: 38.7223, longitude: -9.1393 },
    };

    if (editingTarget === 'origin') {
      onUpdateEndpoints?.({ name, coord }, currentDest);
    } else if (editingTarget === 'destination') {
      onUpdateEndpoints?.(currentOrigin, { name, coord });
    }

    setEditingTarget(null);
    setSearchQuery('');
    setSuggestions([]);
  };

  const isDriving = (safeRoute.mode || currentMode) === 'driving';

  return (
    <M3BottomSheetWrapper
      visible={visible}
      onClose={onClose}
      style={[
        styles.sheetContainer,
        editingTarget !== null && styles.sheetContainerExpanded,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.modeIconCircle}>
          <Ionicons
            name={isDriving ? 'car-sport' : 'walk'}
            size={22}
            color="#38BDF8"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isDriving ? 'Planeador de Rota Automóvel' : 'Planeador de Rota Pedestre'}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {originName} ➔ {destinationName}
          </Text>
        </View>

        <M3Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </M3Pressable>
      </View>

      {/* TWO-POINT ITINERARY CONTROLLER (Point A ➔ Point B) */}
      <View style={styles.itineraryCard}>
        <View style={styles.itineraryInputsCol}>
          {/* Point A: Origin */}
          <TouchableOpacity
            style={[
              styles.endpointRow,
              editingTarget === 'origin' && styles.endpointRowActive,
            ]}
            onPress={handleStartEditOrigin}
            activeOpacity={0.9}
          >
            <View style={styles.pointAIconBadge}>
              <Text style={styles.pointLetterText}>A</Text>
            </View>
            <View style={styles.endpointInputContent}>
              <Text style={styles.endpointLabel}>PONTO DE PARTIDA</Text>
              <TextInput
                ref={originInputRef}
                style={styles.endpointTextInput}
                value={editingTarget === 'origin' ? searchQuery : originName}
                onChangeText={(text) => {
                  if (editingTarget !== 'origin') setEditingTarget('origin');
                  setSearchQuery(text);
                }}
                onFocus={handleStartEditOrigin}
                placeholder="Pesquisar ponto de partida..."
                placeholderTextColor="#64748B"
                returnKeyType="search"
                selectTextOnFocus
              />
            </View>
            {editingTarget === 'origin' && searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  originInputRef.current?.focus();
                }}
                style={styles.endpointIconActionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleStartEditOrigin}
                style={styles.endpointIconActionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="pencil"
                  size={14}
                  color={editingTarget === 'origin' ? '#10B981' : '#94A3B8'}
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.itineraryDivider} />

          {/* Point B: Destination */}
          <TouchableOpacity
            style={[
              styles.endpointRow,
              editingTarget === 'destination' && styles.endpointRowActive,
            ]}
            onPress={handleStartEditDest}
            activeOpacity={0.9}
          >
            <View style={styles.pointBIconBadge}>
              <Text style={styles.pointLetterText}>B</Text>
            </View>
            <View style={styles.endpointInputContent}>
              <Text style={styles.endpointLabel}>PONTO DE CHEGADA</Text>
              <TextInput
                ref={destInputRef}
                style={styles.endpointTextInput}
                value={editingTarget === 'destination' ? searchQuery : destinationName}
                onChangeText={(text) => {
                  if (editingTarget !== 'destination') setEditingTarget('destination');
                  setSearchQuery(text);
                }}
                onFocus={handleStartEditDest}
                placeholder="Pesquisar ponto de chegada..."
                placeholderTextColor="#64748B"
                returnKeyType="search"
                selectTextOnFocus
              />
            </View>
            {editingTarget === 'destination' && searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  destInputRef.current?.focus();
                }}
                style={styles.endpointIconActionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleStartEditDest}
                style={styles.endpointIconActionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="pencil"
                  size={14}
                  color={editingTarget === 'destination' ? '#EF4444' : '#94A3B8'}
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Invert Route Button (⇄) */}
        {onUpdateEndpoints && (
          <M3Pressable
            style={styles.swapBtn}
            onPress={handleSwap}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: swapRotateAnim.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="swap-vertical" size={20} color="#38BDF8" />
            </Animated.View>
          </M3Pressable>
        )}
      </View>

      {/* INLINE SUGGESTIONS & PRESETS WHEN EDITING POINT A OR POINT B */}
      {editingTarget ? (
        <View style={styles.searchSection}>
          <View style={styles.searchTopBar}>
            <View style={styles.searchTargetIndicator}>
              <Ionicons
                name={editingTarget === 'origin' ? 'location' : 'flag'}
                size={14}
                color={editingTarget === 'origin' ? '#10B981' : '#EF4444'}
              />
              <Text style={styles.searchTargetText}>
                {editingTarget === 'origin'
                  ? 'A selecionar Ponto A (Partida)'
                  : 'A selecionar Ponto B (Chegada)'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneEditingBtn}
              onPress={() => {
                Keyboard.dismiss();
                setEditingTarget(null);
              }}
            >
              <Text style={styles.doneEditingBtnText}>Concluído</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Preset Pills */}
          <View style={styles.quickPresetsRow}>
            {userLocation && (
              <M3Pressable
                style={styles.presetPill}
                onPress={() =>
                  handleSelectEndpoint('A minha localização', {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  })
                }
              >
                <Ionicons name="locate" size={14} color="#38BDF8" />
                <Text style={styles.presetPillText}>A Minha Localização</Text>
              </M3Pressable>
            )}

            {homeAddress && (
              <M3Pressable
                style={styles.presetPill}
                onPress={() =>
                  handleSelectEndpoint(homeAddress.label || 'Casa', {
                    latitude: homeAddress.latitude,
                    longitude: homeAddress.longitude,
                  })
                }
              >
                <Ionicons name="home" size={14} color="#10B981" />
                <Text style={styles.presetPillText}>Casa</Text>
              </M3Pressable>
            )}
          </View>

          {/* Loading Indicator */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={styles.loadingText}>A procurar localizações em Portugal...</Text>
            </View>
          )}

          {/* Suggestions List */}
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionItem}
                onPress={() =>
                  handleSelectEndpoint(item.title, {
                    latitude: item.latitude,
                    longitude: item.longitude,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIconWrap}>
                  <Ionicons
                    name={
                      item.type === 'pharmacy'
                        ? 'medical'
                        : item.type === 'police'
                        ? 'shield-sharp'
                        : 'location-outline'
                    }
                    size={16}
                    color="#38BDF8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color="#64748B" />
              </TouchableOpacity>
            ))}

            {suggestions.length === 0 && !isSearching && searchQuery.trim().length >= 2 && (
              <View style={styles.emptyResultsBox}>
                <Ionicons name="alert-circle-outline" size={22} color="#64748B" />
                <Text style={styles.emptyResultsText}>
                  Nenhum resultado encontrado para "{searchQuery.trim()}".
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
            /* NORMAL ROUTE CARDS & OPTIONS */
            <>
              {/* Transport Mode Switcher */}
              {onToggleMode && (
                <View style={styles.modeSwitcherBar}>
                  <TouchableOpacity
                    style={[
                      styles.modeSwitchBtn,
                      !isDriving && styles.modeSwitchBtnActive,
                    ]}
                    onPress={() => onToggleMode('walking')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="walk"
                      size={15}
                      color={!isDriving ? '#0F172A' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.modeSwitchText,
                        !isDriving && styles.modeSwitchTextActive,
                      ]}
                    >
                      A Pé
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeSwitchBtn,
                      isDriving && styles.modeSwitchBtnActive,
                    ]}
                    onPress={() => onToggleMode('driving')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="car-sport"
                      size={15}
                      color={isDriving ? '#0F172A' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.modeSwitchText,
                        isDriving && styles.modeSwitchTextActive,
                      ]}
                    >
                      De Carro
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* SAFE ROUTE CARD */}
                <TouchableOpacity
                  style={[
                    styles.routeCard,
                    selectedRouteId === safeRoute.id && styles.routeCardSelectedSafe,
                  ]}
                  onPress={() => handleSelectRoute(safeRoute)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.safeBadge}>
                      <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                      <Text style={styles.safeBadgeText}>RECOMENDADA · ROTA SEGURA</Text>
                    </View>

                    {selectedRouteId === safeRoute.id && (
                      <Ionicons name="radio-button-on" size={20} color="#10B981" />
                    )}
                  </View>

                  <View style={styles.metricsRow}>
                    <Text style={styles.timeText}>
                      {safeRoute.formattedDuration || `${safeRoute.durationMinutes} min`}
                    </Text>
                    <Text style={styles.distText}>
                      ({safeRoute.formattedDistance || formatDistance(safeRoute.distanceMeters)})
                    </Text>
                    {safeRoute.estimatedArrival && (
                      <View style={styles.arrivalBadge}>
                        <Text style={styles.arrivalBadgeText}>
                          Chegada às {safeRoute.estimatedArrival}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.summaryText}>{safeRoute.summary}</Text>

                  {safeRoute.hazardsAvoided.length > 0 && (
                    <View style={styles.avoidedBox}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.avoidedText}>
                        Desvio protetor ativado: evita {safeRoute.hazardsAvoided.length} zona(s) de perigo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* DIRECT ROUTE CARD (if hazards present) */}
                {directRoute && (
                  <TouchableOpacity
                    style={[
                      styles.routeCard,
                      selectedRouteId === directRoute.id && styles.routeCardSelectedDirect,
                    ]}
                    onPress={() => handleSelectRoute(directRoute)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.warnBadge}>
                        <Ionicons name="warning" size={14} color="#F59E0B" />
                        <Text style={styles.warnBadgeText}>MAIS RÁPIDA (COM AVISOS)</Text>
                      </View>

                      {selectedRouteId === directRoute.id && (
                        <Ionicons name="radio-button-on" size={20} color="#F59E0B" />
                      )}
                    </View>

                    <View style={styles.metricsRow}>
                      <Text style={styles.timeText}>
                        {directRoute.formattedDuration || `${directRoute.durationMinutes} min`}
                      </Text>
                      <Text style={styles.distText}>
                        ({directRoute.formattedDistance || formatDistance(directRoute.distanceMeters)})
                      </Text>
                      {directRoute.estimatedArrival && (
                        <View style={styles.arrivalBadge}>
                          <Text style={styles.arrivalBadgeText}>
                            Chegada às {directRoute.estimatedArrival}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.summaryText}>{directRoute.summary}</Text>

                    {directRoute.hazardsOnRoute.length > 0 && (
                      <View style={styles.warningBox}>
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.warningText}>
                          Passa por zonas com reporte ativo de ocorrências
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Action Button */}
              <View style={styles.footer}>
                <M3Pressable
                  style={[
                    styles.startBtn,
                    selectedRoute.isSafe ? styles.startBtnSafe : styles.startBtnWarn,
                  ]}
                  onPress={handleStart}
                >
                  <Ionicons
                    name={selectedRoute.isSafe ? 'navigate' : 'navigate-outline'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.startBtnText}>
                    {selectedRoute.isSafe
                      ? `Iniciar Navegação (${selectedRoute.formattedDuration || `${selectedRoute.durationMinutes} min`})`
                      : 'Iniciar Percurso'}
                  </Text>
                </M3Pressable>
              </View>
            </>
          )}
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
    maxHeight: '82%',
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    ...M3Elevation.level4,
  },
  sheetContainerExpanded: {
    maxHeight: '94%',
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
    gap: 12,
  },
  modeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: M3Shapes.medium,
    backgroundColor: M3Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  headerSub: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },

  // Itinerary Card (Point A ➔ Point B)
  itineraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E222A',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D323F',
    padding: 10,
    gap: 8,
  },
  itineraryInputsCol: {
    flex: 1,
    gap: 6,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  endpointRowActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  endpointInputContent: {
    flex: 1,
    justifyContent: 'center',
  },
  endpointTextInput: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 0,
    marginTop: 1,
  },
  endpointIconActionBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointAIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointBIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointLetterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  endpointLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  endpointName: {
    fontSize: 13,
    color: '#F1F5F9',
    fontWeight: '600',
    marginTop: 1,
  },
  itineraryDivider: {
    height: 1,
    backgroundColor: '#2D323F',
    marginLeft: 32,
  },
  swapBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#262B36',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#373E4F',
  },

  // Search section
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flex: 1,
  },
  searchTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  searchTargetIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchTargetText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  doneEditingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  doneEditingBtnText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyResultsText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#242933',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: M3Shapes.full,
    borderWidth: 1,
    borderColor: '#333A48',
  },
  presetPillText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  suggestionsList: {
    maxHeight: 200,
    marginTop: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252A34',
    gap: 10,
  },
  suggestionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },

  // Mode switcher bar
  modeSwitcherBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 6,
    gap: 10,
    backgroundColor: M3Colors.surfaceContainer,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: M3Shapes.full,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  modeSwitchBtnActive: {
    backgroundColor: M3Colors.secondaryContainer,
    borderColor: M3Colors.secondary,
  },
  modeSwitchText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  modeSwitchTextActive: {
    color: M3Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  arrivalBadge: {
    backgroundColor: 'rgba(109, 213, 140, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: M3Shapes.full,
    marginLeft: 4,
  },
  arrivalBadgeText: {
    color: M3Colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  routeCard: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderRadius: M3Shapes.large,
    padding: 16,
    borderWidth: 1.5,
    borderColor: M3Colors.outlineVariant,
    marginBottom: 12,
  },
  routeCardSelectedSafe: {
    borderColor: M3Colors.success,
    backgroundColor: 'rgba(109, 213, 140, 0.08)',
  },
  routeCardSelectedDirect: {
    borderColor: M3Colors.warning,
    backgroundColor: 'rgba(255, 185, 81, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(109, 213, 140, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: M3Shapes.small,
  },
  safeBadgeText: {
    color: M3Colors.success,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 185, 81, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: M3Shapes.small,
  },
  warnBadgeText: {
    color: M3Colors.warning,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 22,
    fontWeight: '700',
    color: M3Colors.onSurface,
  },
  distText: {
    fontSize: 14,
    color: M3Colors.onSurfaceVariant,
  },
  summaryText: {
    fontSize: 13,
    color: M3Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  avoidedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(109, 213, 140, 0.12)',
    padding: 8,
    borderRadius: M3Shapes.small,
  },
  avoidedText: {
    fontSize: 11,
    color: M3Colors.success,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 184, 181, 0.12)',
    padding: 8,
    borderRadius: M3Shapes.small,
  },
  warningText: {
    fontSize: 11,
    color: M3Colors.error,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    gap: 8,
    ...M3Elevation.level2,
  },
  startBtnSafe: {
    backgroundColor: '#0284C7',
  },
  startBtnWarn: {
    backgroundColor: M3Colors.warningContainer,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
