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
  onSimulateRoute?: (chosenRoute: PedestrianRoute) => void;
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
  onSimulateRoute,
  onUpdateEndpoints,
}) => {
  if (!safeRoute) return null;

  const [selectedRouteId, setSelectedRouteId] = useState<string>(safeRoute.id);
  const [showDetailedSteps, setShowDetailedSteps] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | null>(null);
  const [originText, setOriginText] = useState(originName);
  const [destText, setDestText] = useState(destinationName);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const originInputRef = useRef<any>(null);
  const destInputRef = useRef<any>(null);
  const swapRotateAnim = useRef(new Animated.Value(0)).current;
  const swapCount = useRef(0);

  // Synchronize internal text inputs with external props
  useEffect(() => {
    setSelectedRouteId(safeRoute.id);
  }, [safeRoute.id]);

  useEffect(() => {
    setOriginText(originName);
  }, [originName]);

  useEffect(() => {
    setDestText(destinationName);
  }, [destinationName]);

  // Real-time suggestions when typing in either Search Bar A or Search Bar B
  const activeQuery = activeInput === 'origin' ? originText : destText;

  useEffect(() => {
    if (!activeInput) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = (activeQuery || '').trim();
    if (trimmed.length < 2 || trimmed === 'A minha localização') {
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
  }, [activeQuery, activeInput]);

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

  const handleSimulate = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    if (onSimulateRoute) {
      onSimulateRoute(selectedRoute);
    }
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

    const newOriginName = destText || destinationName;
    const newDestName = originText || originName;

    setOriginText(newOriginName);
    setDestText(newDestName);

    const newOrigin: RouteEndpoint = {
      name: newOriginName,
      coord: destinationCoord,
    };

    const newDest: RouteEndpoint = {
      name: newDestName,
      coord: currentOriginCoord,
    };

    onUpdateEndpoints(newOrigin, newDest);
  };

  // Select a preset or search suggestion for the active search bar (A or B)
  const handleSelectEndpoint = (name: string, coord: RouteCoordinate) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();

    const currentOriginCoord = originCoord || (userLocation ? {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    } : { latitude: 38.7223, longitude: -9.1393 });

    const currentDestCoord = destinationCoord || { latitude: 38.7223, longitude: -9.1393 };

    if (activeInput === 'origin') {
      setOriginText(name);
      onUpdateEndpoints?.(
        { name, coord },
        { name: destText || destinationName, coord: currentDestCoord }
      );
    } else if (activeInput === 'destination') {
      setDestText(name);
      onUpdateEndpoints?.(
        { name: originText || originName, coord: currentOriginCoord },
        { name, coord }
      );
    }

    setActiveInput(null);
    setSuggestions([]);
  };

  // Explicitly reset Point A or Point B to device GPS "A minha localização"
  const handleResetToMyLocation = (target: 'origin' | 'destination' = 'origin') => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setActiveInput(null);
    setSuggestions([]);

    const myCoord = userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : { latitude: 38.7223, longitude: -9.1393 };

    if (target === 'origin') {
      setOriginText('A minha localização');
      const currentDestCoord = destinationCoord || { latitude: 38.7223, longitude: -9.1393 };
      onUpdateEndpoints?.(
        { name: 'A minha localização', coord: myCoord },
        { name: destText || destinationName, coord: currentDestCoord }
      );
    } else {
      setDestText('A minha localização');
      const currentOriginCoord = originCoord || (userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      } : { latitude: 38.7223, longitude: -9.1393 });
      onUpdateEndpoints?.(
        { name: originText || originName, coord: currentOriginCoord },
        { name: 'A minha localização', coord: myCoord }
      );
    }
  };

  const isDriving = (safeRoute.mode || currentMode) === 'driving';

  return (
    <M3BottomSheetWrapper
      visible={visible}
      onClose={onClose}
      style={[
        styles.sheetContainer,
        !isExpanded && activeInput === null && styles.sheetContainerCompact,
        (isExpanded || activeInput !== null) && styles.sheetContainerExpanded,
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
            {originText || originName} ➔ {destText || destinationName}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <M3Pressable
            onPress={() => {
              Haptics.impactAsync(ImpactFeedbackStyle.Light);
              setIsExpanded(!isExpanded);
            }}
            style={styles.expandBtn}
          >
            <Ionicons
              name={isExpanded ? 'contract' : 'expand'}
              size={18}
              color="#94A3B8"
            />
          </M3Pressable>

          <M3Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#94A3B8" />
          </M3Pressable>
        </View>
      </View>

      {/* TWO SEPARATE SEARCH BARS: ONE FOR POINT A AND ONE FOR POINT B */}
      <View style={styles.searchBarsCard}>
        <View style={styles.searchBarsColumn}>
          {/* SEARCH BAR A (Ponto de Partida) */}
          <View style={styles.searchBarRow}>
            <View style={styles.pointAIconBadge}>
              <Text style={styles.pointLetterText}>A</Text>
            </View>
            <View
              style={[
                styles.searchBarBox,
                activeInput === 'origin' && styles.searchBarBoxFocused,
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={activeInput === 'origin' ? '#38BDF8' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <TextInput
                ref={originInputRef}
                style={styles.searchBarInput}
                value={originText}
                onChangeText={(text) => {
                  if (activeInput !== 'origin') setActiveInput('origin');
                  setOriginText(text);
                }}
                onFocus={() => {
                  setActiveInput('origin');
                }}
                onBlur={() => {
                  if (!originText.trim()) {
                    handleResetToMyLocation('origin');
                  }
                }}
                placeholder="Pesquisar ponto de partida A..."
                placeholderTextColor="#64748B"
                returnKeyType="search"
                selectTextOnFocus
                autoCorrect={false}
              />
              {originText.length > 0 && (
                <TouchableOpacity
                  style={styles.searchBarClearBtn}
                  onPress={() => {
                    setOriginText('');
                    setActiveInput('origin');
                    originInputRef.current?.focus();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* SEARCH BAR B (Ponto de Chegada) */}
          <View style={styles.searchBarRow}>
            <View style={styles.pointBIconBadge}>
              <Text style={styles.pointLetterText}>B</Text>
            </View>
            <View
              style={[
                styles.searchBarBox,
                activeInput === 'destination' && styles.searchBarBoxFocused,
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={activeInput === 'destination' ? '#38BDF8' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <TextInput
                ref={destInputRef}
                style={styles.searchBarInput}
                value={destText}
                onChangeText={(text) => {
                  if (activeInput !== 'destination') setActiveInput('destination');
                  setDestText(text);
                }}
                onFocus={() => {
                  setActiveInput('destination');
                }}
                onBlur={() => {
                  if (!destText.trim()) {
                    setDestText(destinationName);
                  }
                }}
                placeholder="Pesquisar destino de chegada B..."
                placeholderTextColor="#64748B"
                returnKeyType="search"
                selectTextOnFocus
                autoCorrect={false}
              />
              {destText.length > 0 && (
                <TouchableOpacity
                  style={styles.searchBarClearBtn}
                  onPress={() => {
                    setDestText('');
                    setActiveInput('destination');
                    destInputRef.current?.focus();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
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

      {/* Quick shortcut to restore user GPS location as Point A if modified */}
      {originText !== 'A minha localização' && activeInput === null && (
        <TouchableOpacity
          style={styles.resetToMyLocationBar}
          onPress={() => handleResetToMyLocation('origin')}
          activeOpacity={0.75}
        >
          <View style={styles.resetToMyLocationIcon}>
            <Ionicons name="locate" size={14} color="#38BDF8" />
          </View>
          <Text style={styles.resetToMyLocationText} numberOfLines={1}>
            Ponto A modificado. Toque para usar "A minha localização"
          </Text>
          <Ionicons name="refresh" size={14} color="#38BDF8" />
        </TouchableOpacity>
      )}

      {/* SUGGESTIONS OVERLAY (ONLY SHOWN WHEN AN INPUT IS FOCUSED/TYPING) */}
      {activeInput !== null ? (
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionsHeaderBar}>
            <View style={styles.quickPresetsRow}>
              {userLocation && (
                <M3Pressable
                  style={styles.presetPill}
                  onPress={() => handleResetToMyLocation(activeInput || 'origin')}
                >
                  <Ionicons name="locate" size={13} color="#38BDF8" />
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
                  <Ionicons name="home" size={13} color="#10B981" />
                  <Text style={styles.presetPillText}>Casa</Text>
                </M3Pressable>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeSuggestionsBtn}
              onPress={() => {
                Keyboard.dismiss();
                setActiveInput(null);
                setSuggestions([]);
                if (activeInput === 'origin' && !originText.trim()) {
                  handleResetToMyLocation('origin');
                } else if (activeInput === 'destination' && !destText.trim()) {
                  setDestText(destinationName);
                }
              }}
            >
              <Text style={styles.closeSuggestionsBtnText}>Desistir</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={styles.loadingText}>A pesquisar em Portugal...</Text>
            </View>
          )}

          {/* Suggestions List */}
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Quick action cards when no query is typed or query is too short */}
            {(activeQuery || '').trim().length < 2 && (
              <View style={styles.quickOptionsCard}>
                <Text style={styles.quickOptionsHeader}>Opções Rápidas de Localização</Text>

                {userLocation && (
                  <TouchableOpacity
                    style={styles.quickOptionRow}
                    onPress={() => handleResetToMyLocation(activeInput || 'origin')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.quickOptionIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                      <Ionicons name="locate" size={18} color="#38BDF8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quickOptionTitle}>Usar a Minha Localização Atual</Text>
                      <Text style={styles.quickOptionSubtitle}>
                        GPS: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#64748B" />
                  </TouchableOpacity>
                )}

                {homeAddress && (
                  <TouchableOpacity
                    style={styles.quickOptionRow}
                    onPress={() =>
                      handleSelectEndpoint(homeAddress.label || 'Casa', {
                        latitude: homeAddress.latitude,
                        longitude: homeAddress.longitude,
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={[styles.quickOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="home" size={18} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quickOptionTitle}>Casa</Text>
                      <Text style={styles.quickOptionSubtitle}>{homeAddress.label || 'Morada guardada'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#64748B" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.quickOptionRow}
                  onPress={() => {
                    Keyboard.dismiss();
                    setActiveInput(null);
                    setSuggestions([]);
                    if (activeInput === 'origin' && !originText.trim()) {
                      handleResetToMyLocation('origin');
                    } else if (activeInput === 'destination' && !destText.trim()) {
                      setDestText(destinationName);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickOptionIcon, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                    <Ionicons name="arrow-back" size={18} color="#94A3B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickOptionTitle}>Desistir da Pesquisa</Text>
                    <Text style={styles.quickOptionSubtitle}>Fechar e manter rota atual</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

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

            {suggestions.length === 0 && !isSearching && (activeQuery || '').trim().length >= 2 && (
              <View style={styles.emptyResultsBox}>
                <Ionicons name="alert-circle-outline" size={22} color="#64748B" />
                <Text style={styles.emptyResultsText}>
                  Nenhum resultado encontrado para "{(activeQuery || '').trim()}".
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

                {/* Collapsible Step-by-Step Route Details */}
                {selectedRoute.steps && selectedRoute.steps.length > 0 && (
                  <View style={styles.stepsAccordionContainer}>
                    <TouchableOpacity
                      style={styles.stepsAccordionHeader}
                      onPress={() => {
                        Haptics.impactAsync(ImpactFeedbackStyle.Light);
                        if (!showDetailedSteps && !isExpanded) {
                          setIsExpanded(true);
                        }
                        setShowDetailedSteps(!showDetailedSteps);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.stepsAccordionTitleRow}>
                        <Ionicons name="map-outline" size={16} color="#38BDF8" />
                        <Text style={styles.stepsAccordionTitle}>
                          Ver Itinerário Passo a Passo ({selectedRoute.steps.length} indicações)
                        </Text>
                      </View>
                      <Ionicons
                        name={showDetailedSteps ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>

                    {showDetailedSteps && (
                      <View style={styles.stepsAccordionContent}>
                        {selectedRoute.steps.map((st, i) => (
                          <View key={`preview-step-${i}`} style={styles.previewStepRow}>
                            <View style={styles.previewStepBullet}>
                              <Text style={styles.previewStepBulletText}>{i + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.previewStepText}>{st.instruction}</Text>
                              {st.distanceMeters > 0 && (
                                <Text style={styles.previewStepSubText}>
                                  {formatDistance(st.distanceMeters)}
                                  {st.streetName ? ` • ${st.streetName}` : ''}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.footer}>
                <View style={styles.footerButtonsRow}>
                  <M3Pressable
                    style={[
                      styles.startBtn,
                      selectedRoute.isSafe ? styles.startBtnSafe : styles.startBtnWarn,
                      onSimulateRoute ? { flex: 1.6 } : { flex: 1 },
                    ]}
                    onPress={handleStart}
                  >
                    <Ionicons
                      name={selectedRoute.isSafe ? 'navigate' : 'navigate-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.startBtnText} numberOfLines={1}>
                      {selectedRoute.isSafe
                        ? `Iniciar (${selectedRoute.formattedDuration || `${selectedRoute.durationMinutes} min`})`
                        : 'Iniciar Percurso'}
                    </Text>
                  </M3Pressable>

                  {onSimulateRoute && (
                    <TouchableOpacity
                      style={styles.simulateBtn}
                      onPress={handleSimulate}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="game-controller" size={18} color="#38BDF8" />
                      <Text style={styles.simulateBtnText}>Simular</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
    maxHeight: '94%',
    height: '92%',
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    ...M3Elevation.level4,
  },
  sheetContainerCompact: {
    maxHeight: '62%',
    height: '58%',
  },
  sheetContainerExpanded: {
    maxHeight: '94%',
    height: '92%',
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  closeBtn: {
    padding: 6,
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

  // Two Search Bars Card (Point A & Point B)
  searchBarsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E222A',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2D323F',
    padding: 10,
    gap: 8,
  },
  searchBarsColumn: {
    flex: 1,
    gap: 8,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13161C',
    borderWidth: 1.5,
    borderColor: '#2A303C',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
  },
  searchBarBoxFocused: {
    backgroundColor: '#171B24',
    borderColor: '#38BDF8',
  },
  searchBarInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 0,
    height: '100%',
  },
  searchBarClearBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointAIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointBIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointLetterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  swapBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#262B36',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#373E4F',
  },

  // Shortcut bar to restore user location as Point A
  resetToMyLocationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    gap: 8,
  },
  resetToMyLocationIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetToMyLocationText: {
    flex: 1,
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },

  // Suggestions container (Dropdown shown when active)
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    flex: 1,
  },
  suggestionsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  closeSuggestionsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  closeSuggestionsBtnText: {
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
  quickOptionsCard: {
    backgroundColor: '#1E222A',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D323F',
    gap: 8,
  },
  quickOptionsHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  quickOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252A34',
  },
  quickOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickOptionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  quickOptionSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 8,
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
  footerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 14,
    fontWeight: '700',
  },
  simulateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    gap: 6,
  },
  simulateBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },

  // Steps Accordion
  stepsAccordionContainer: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#1E222A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D323F',
    overflow: 'hidden',
  },
  stepsAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stepsAccordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stepsAccordionTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  stepsAccordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D323F',
  },
  previewStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#262B36',
    gap: 10,
  },
  previewStepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#282E3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  previewStepBulletText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  previewStepText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  previewStepSubText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
});
