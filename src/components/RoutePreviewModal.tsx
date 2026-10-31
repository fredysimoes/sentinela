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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { PedestrianRoute, RouteCoordinate, TransportMode } from '../types/navigation';
import { formatDistance } from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { searchAddressSuggestions, AddressSuggestion } from '../services/geocodingService';
import { M3BottomSheetWrapper, M3DragHandle, M3Pressable } from './M3MotionWrapper';

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
  alternativeRoutes?: PedestrianRoute[];
  currentMode?: TransportMode;
  userLocation?: { latitude: number; longitude: number } | null;
  homeAddress?: { latitude: number; longitude: number; label?: string } | null;
  accessibleRouteOnly?: boolean;
  onToggleAccessibilityRoute?: (enabled: boolean) => void;
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
  alternativeRoutes,
  currentMode = 'walking',
  userLocation,
  homeAddress,
  accessibleRouteOnly = false,
  onToggleAccessibilityRoute,
  onToggleMode,
  onClose,
  onStartNavigation,
  onSimulateRoute,
  onUpdateEndpoints,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(safeRoute?.id || '');
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
    if (safeRoute?.id) {
      setSelectedRouteId(safeRoute.id);
    }
  }, [safeRoute?.id]);

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

  if (!safeRoute) return null;

  const allAvailableRoutes: PedestrianRoute[] = [
    safeRoute,
    ...(directRoute && directRoute.id !== safeRoute.id ? [directRoute] : []),
    ...(alternativeRoutes || []).filter(
      (r) => r.id !== safeRoute.id && (!directRoute || r.id !== directRoute.id)
    ),
  ];

  const selectedRoute =
    allAvailableRoutes.find((r) => r.id === selectedRouteId) || safeRoute;

  const handleSelectRoute = (route: PedestrianRoute) => {
    Haptics.selectionAsync();
    setSelectedRouteId(route.id);
  };

  const handleStart = () => {
    if (!selectedRoute) return;
    Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    onStartNavigation(selectedRoute);
  };

  const handleSimulate = () => {
    if (!selectedRoute) return;
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

  const activeMode = safeRoute.mode || currentMode;
  const isDriving = activeMode === 'driving';
  const isTransit = activeMode === 'transit';

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
      {/* M3 Official Drag Handle */}
      <M3DragHandle />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.modeIconCircle}>
          {isDriving ? (
            <Ionicons name="car-sport" size={22} color="#38BDF8" />
          ) : isTransit ? (
            <MaterialCommunityIcons name="bus-side" size={22} color="#38BDF8" />
          ) : (
            <Ionicons name="walk" size={22} color="#38BDF8" />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isDriving
              ? 'Planeador de Rota Automóvel'
              : isTransit
              ? 'Planeador de Transportes Públicos'
              : 'Planeador de Rota Pedestre'}
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
                      item.type === 'address'
                        ? 'home-outline'
                        : item.type === 'street'
                        ? 'navigate-circle-outline'
                        : item.type === 'road'
                        ? 'speedometer-outline'
                        : item.type === 'pharmacy'
                        ? 'medical'
                        : item.type === 'police'
                        ? 'shield-sharp'
                        : item.type === 'school'
                        ? 'school-outline'
                        : 'location-outline'
                    }
                    size={16}
                    color={
                      item.type === 'address'
                        ? '#06B6D4'
                        : item.type === 'street' || item.type === 'road'
                        ? '#38BDF8'
                        : item.type === 'pharmacy'
                        ? '#10B981'
                        : item.type === 'police'
                        ? '#3B82F6'
                        : item.type === 'school'
                        ? '#8B5CF6'
                        : '#F59E0B'
                    }
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
                      activeMode === 'walking' && styles.modeSwitchBtnActive,
                    ]}
                    onPress={() => onToggleMode('walking')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="walk"
                      size={15}
                      color={activeMode === 'walking' ? '#080A0C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeSwitchText,
                        activeMode === 'walking' && styles.modeSwitchTextActive,
                      ]}
                    >
                      A Pé
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeSwitchBtn,
                      activeMode === 'transit' && styles.modeSwitchBtnActive,
                    ]}
                    onPress={() => onToggleMode('transit')}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="bus-side"
                      size={16}
                      color={activeMode === 'transit' ? '#0284C7' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeSwitchText,
                        activeMode === 'transit' && styles.modeSwitchTextActive,
                      ]}
                    >
                      Transportes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeSwitchBtn,
                      activeMode === 'driving' && styles.modeSwitchBtnActive,
                    ]}
                    onPress={() => onToggleMode('driving')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="car-sport"
                      size={15}
                      color={activeMode === 'driving' ? '#080A0C' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeSwitchText,
                        activeMode === 'driving' && styles.modeSwitchTextActive,
                      ]}
                    >
                      De Carro
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Accessibility / Reduced Mobility Route Toggle */}
              {onToggleAccessibilityRoute && !isDriving && (
                <TouchableOpacity
                  style={[
                    styles.accessibilityRouteToggleBtn,
                    accessibleRouteOnly && styles.accessibilityRouteToggleBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
                    onToggleAccessibilityRoute(!accessibleRouteOnly);
                  }}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.accessToggleIconCircle,
                      accessibleRouteOnly && styles.accessToggleIconCircleActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="wheelchair"
                      size={20}
                      color={accessibleRouteOnly ? '#0284C7' : '#64748B'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.accessToggleTitle,
                        accessibleRouteOnly && styles.accessToggleTitleActive,
                      ]}
                    >
                      Percurso com Acessibilidade
                    </Text>
                    <Text style={styles.accessToggleSub}>
                      {accessibleRouteOnly
                        ? 'A contornar escadas, calçadas danificadas e obras registadas.'
                        : 'Toque para evitar degraus e obstáculos para mobilidade reduzida.'}
                    </Text>
                  </View>
                  <Ionicons
                    name={accessibleRouteOnly ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={accessibleRouteOnly ? '#0284C7' : '#94A3B8'}
                  />
                </TouchableOpacity>
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
                    <View style={[styles.safeBadge, isTransit && styles.transitBadge]}>
                      <Ionicons
                        name={
                          isTransit
                            ? 'bus'
                            : safeRoute.name.includes('Acessível')
                            ? 'shield-checkmark'
                            : 'shield-checkmark'
                        }
                        size={14}
                        color={isTransit ? '#38BDF8' : '#10B981'}
                      />
                      <Text style={[styles.safeBadgeText, isTransit && styles.transitBadgeText]}>
                        {isTransit
                          ? 'RECOMENDADA · TRANSPORTES PÚBLICOS'
                          : safeRoute.name.includes('Acessível')
                          ? 'RECOMENDADA · ROTA ACESSÍVEL'
                          : 'RECOMENDADA · ROTA SEGURA'}
                      </Text>
                    </View>

                    {selectedRouteId === safeRoute.id && (
                      <Ionicons
                        name="radio-button-on"
                        size={20}
                        color={isTransit ? '#38BDF8' : '#10B981'}
                      />
                    )}
                  </View>

                  <View style={styles.metricsRow}>
                    <Text style={[styles.timeText, isTransit && { color: '#38BDF8' }]}>
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

                  {safeRoute.transitLines && safeRoute.transitLines.length > 0 && (
                    <View style={styles.transitLinesPillsRow}>
                      {safeRoute.transitLines.map((tLine, idx) => (
                        <React.Fragment key={`safe-transit-pill-${idx}`}>
                          {idx > 0 && (
                            <Ionicons
                              name="arrow-forward"
                              size={12}
                              color="#64748B"
                              style={{ marginHorizontal: 2 }}
                            />
                          )}
                          <View style={styles.transitLinePill}>
                            <MaterialCommunityIcons
                              name="bus-side"
                              size={12}
                              color="#FFFFFF"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.transitLinePillText}>{tLine}</Text>
                          </View>
                        </React.Fragment>
                      ))}
                    </View>
                  )}

                  <Text style={styles.summaryText}>{safeRoute.summary}</Text>

                  {safeRoute.hazardsAvoided.length > 0 && (
                    <View style={styles.avoidedBox}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.avoidedText}>
                        {safeRoute.name.includes('Acessível')
                          ? `Desvio acessível ativado: contorna ${safeRoute.hazardsAvoided.length} barreira(s) de mobilidade`
                          : `Desvio protetor ativado: evita ${safeRoute.hazardsAvoided.length} zona(s) de perigo`}
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
                        <Text style={styles.warnBadgeText}>
                          {directRoute.name.includes('Barreiras') || safeRoute.name.includes('Acessível')
                            ? 'DIRETA (COM DEGRAUS/BARREIRAS)'
                            : 'MAIS RÁPIDA (COM AVISOS)'}
                        </Text>
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
                          {safeRoute.name.includes('Acessível')
                            ? `Contém ${directRoute.hazardsOnRoute.length} barreira(s) ou degraus reportados nesta via`
                            : 'Passa por zonas com reporte ativo de ocorrências'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* ALTERNATIVE ROUTES (e.g. 2nd/3rd Transit Options) */}
                {alternativeRoutes &&
                  alternativeRoutes
                    .filter((r) => r.id !== safeRoute.id && (!directRoute || r.id !== directRoute.id))
                    .map((altRoute, altIdx) => {
                      const isAltSelected = selectedRouteId === altRoute.id;
                      return (
                        <TouchableOpacity
                          key={`alt-route-${altRoute.id || altIdx}`}
                          style={[
                            styles.routeCard,
                            isAltSelected && styles.routeCardSelectedTransitAlt,
                          ]}
                          onPress={() => handleSelectRoute(altRoute)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.cardHeader}>
                            <View style={[styles.safeBadge, styles.transitAltBadge]}>
                              <Ionicons name="bus" size={14} color="#06B6D4" />
                              <Text style={[styles.safeBadgeText, styles.transitAltBadgeText]}>
                                {altRoute.transitLegsCount && altRoute.transitLegsCount <= 1
                                  ? 'DIRETA · SEM TRANSBORDOS'
                                  : `OPÇÃO ALTERNATIVA ${altIdx + 2}`}
                              </Text>
                            </View>

                            {isAltSelected && (
                              <Ionicons name="radio-button-on" size={20} color="#06B6D4" />
                            )}
                          </View>

                          <View style={styles.metricsRow}>
                            <Text style={[styles.timeText, { color: '#06B6D4' }]}>
                              {altRoute.formattedDuration || `${altRoute.durationMinutes} min`}
                            </Text>
                            <Text style={styles.distText}>
                              ({altRoute.formattedDistance || formatDistance(altRoute.distanceMeters)})
                            </Text>
                            {altRoute.estimatedArrival && (
                              <View style={styles.arrivalBadge}>
                                <Text style={styles.arrivalBadgeText}>
                                  Chegada às {altRoute.estimatedArrival}
                                </Text>
                              </View>
                            )}
                          </View>

                          {altRoute.transitLines && altRoute.transitLines.length > 0 && (
                            <View style={styles.transitLinesPillsRow}>
                              {altRoute.transitLines.map((tLine, idx) => (
                                <React.Fragment key={`alt-transit-pill-${altIdx}-${idx}`}>
                                  {idx > 0 && (
                                    <Ionicons
                                      name="arrow-forward"
                                      size={12}
                                      color="#64748B"
                                      style={{ marginHorizontal: 2 }}
                                    />
                                  )}
                                  <View style={styles.transitLinePill}>
                                    <MaterialCommunityIcons
                                      name="bus-side"
                                      size={12}
                                      color="#FFFFFF"
                                      style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.transitLinePillText}>{tLine}</Text>
                                  </View>
                                </React.Fragment>
                              ))}
                            </View>
                          )}

                          <Text style={styles.summaryText}>{altRoute.summary}</Text>
                        </TouchableOpacity>
                      );
                    })}

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
                        {selectedRoute.steps.map((st, i) => {
                          const isTransitStep = !!st.transitInfo || st.maneuverType === 'transit';
                          const tInfo = st.transitInfo;
                          const vehicleIcon =
                            tInfo?.vehicleType === 'subway'
                              ? 'subway'
                              : tInfo?.vehicleType === 'train'
                              ? 'train'
                              : tInfo?.vehicleType === 'tram'
                              ? 'tram'
                              : 'bus';

                          return (
                            <View
                              key={`preview-step-${i}`}
                              style={[
                                styles.previewStepRow,
                                isTransitStep && styles.previewStepRowTransit,
                              ]}
                            >
                              <View
                                style={[
                                  styles.previewStepBullet,
                                  isTransitStep && styles.previewStepBulletTransit,
                                  isTransitStep && tInfo?.color
                                    ? { backgroundColor: tInfo.color }
                                    : null,
                                ]}
                              >
                                {isTransitStep ? (
                                  <MaterialCommunityIcons
                                    name={vehicleIcon as any}
                                    size={13}
                                    color={tInfo?.textColor || '#FFFFFF'}
                                  />
                                ) : (
                                  <Text style={styles.previewStepBulletText}>{i + 1}</Text>
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                {isTransitStep && tInfo ? (
                                  <View style={styles.transitStepHeader}>
                                    <View
                                      style={[
                                        styles.transitStepLineBadge,
                                        tInfo.color ? { backgroundColor: tInfo.color } : null,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.transitStepLineBadgeText,
                                          tInfo.textColor ? { color: tInfo.textColor } : null,
                                        ]}
                                      >
                                        {tInfo.lineShortName || tInfo.lineName || 'Linha'}
                                      </Text>
                                    </View>
                                    {tInfo.operator && (
                                      <Text style={styles.transitStepOperatorText}>
                                        {tInfo.operator}
                                      </Text>
                                    )}
                                  </View>
                                ) : null}

                                <Text style={styles.previewStepText}>{st.instruction}</Text>

                                {/* Crachá de Transbordo de Veículo */}
                                {st.isTransfer ? (
                                  <View style={styles.transferBadgeStep}>
                                    <Ionicons name="swap-horizontal" size={13} color="#F59E0B" />
                                    <Text style={styles.transferBadgeStepText}>
                                      {st.transferInstruction || (st.transferStopName ? `Transbordo em ${st.transferStopName}` : 'Transbordo de Veículo')}
                                    </Text>
                                  </View>
                                ) : null}

                                {/* Crachá de Tempo Real e Espera na Paragem */}
                                {isTransitStep && tInfo && (tInfo.realtimeArrivalMinutes !== undefined || tInfo.waitingMinutes !== undefined) ? (
                                  <View style={styles.realtimeArrivalWaitBadge}>
                                    <MaterialCommunityIcons name="clock-fast" size={13} color="#38BDF8" />
                                    <Text style={styles.realtimeArrivalWaitText}>
                                      Chega em {tInfo.realtimeArrivalMinutes} min
                                      {tInfo.waitingMinutes && tInfo.waitingMinutes > 0 ? ` (espera: ~${tInfo.waitingMinutes} min)` : ''}
                                    </Text>
                                    {tInfo.delayMinutes !== undefined && (
                                      <View style={[styles.microDelayBadge, tInfo.delayMinutes > 2 ? styles.microDelayWarn : styles.microDelayOk]}>
                                        <Text style={styles.microDelayText}>
                                          {tInfo.delayMinutes > 2 ? `+${Math.round(tInfo.delayMinutes)}m atraso` : 'A horas'}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                ) : null}

                                {/* Alerta de Desvio Protetor no Troço Pedonal */}
                                {!isTransitStep && st.instruction.includes('Desvio seguro a pé') ? (
                                  <View style={styles.walkingDetourBadge}>
                                    <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                                    <Text style={styles.walkingDetourBadgeText}>
                                      Desvio pedonal ativado: contorna ocorrências até à paragem
                                    </Text>
                                  </View>
                                ) : null}

                                {isTransitStep && tInfo && (tInfo.departureStop || tInfo.arrivalStop) ? (
                                  <View style={styles.transitStopsDetailsBox}>
                                    {tInfo.departureStop && (
                                      <View style={styles.transitStopPointRow}>
                                        <View style={[styles.stopDot, { borderColor: '#10B981' }]} />
                                        <Text style={styles.transitStopPointText}>
                                          Embarque: <Text style={{ color: '#F8FAFC' }}>{tInfo.departureStop}</Text>
                                        </Text>
                                      </View>
                                    )}
                                    {tInfo.numStops && tInfo.numStops > 0 ? (
                                      <View style={styles.transitStopStopsCountRow}>
                                        <View style={styles.stopVerticalLine} />
                                        <Text style={styles.transitStopStopsCountText}>
                                          {tInfo.numStops} paragens intermédias
                                        </Text>
                                      </View>
                                    ) : null}
                                    {tInfo.arrivalStop && (
                                      <View style={styles.transitStopPointRow}>
                                        <View style={[styles.stopDot, { borderColor: '#EF4444' }]} />
                                        <Text style={styles.transitStopPointText}>
                                          Desembarque: <Text style={{ color: '#F8FAFC' }}>{tInfo.arrivalStop}</Text>
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                ) : null}

                                {st.distanceMeters > 0 && (
                                  <Text style={styles.previewStepSubText}>
                                    {formatDistance(st.distanceMeters)}
                                    {st.durationSeconds > 0
                                      ? ` • ~${Math.max(1, Math.round(st.durationSeconds / 60))} min`
                                      : ''}
                                    {st.streetName && !isTransitStep ? ` • ${st.streetName}` : ''}
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
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
                      onSimulateRoute ? { flex: 1.6 } : { flex: 1 },
                    ]}
                    onPress={handleStart}
                  >
                    <Ionicons
                      name="navigate"
                      size={18}
                      color="#080A0C"
                    />
                    <Text
                      style={styles.startBtnText}
                      numberOfLines={1}
                    >
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
                      <Ionicons name="game-controller" size={18} color="#0284C7" />
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: 'transparent',
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...M3Elevation.level1,
  },
  modeSwitchBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0284C7',
    borderWidth: 2.5,
    ...M3Elevation.level3,
  },
  modeSwitchText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  modeSwitchTextActive: {
    color: '#080A0C',
    fontWeight: '800',
  },
  accessibilityRouteToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
    ...M3Elevation.level2,
  },
  accessibilityRouteToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0284C7',
    borderWidth: 2.5,
  },
  accessToggleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessToggleIconCircleActive: {
    backgroundColor: '#E0F2FE',
  },
  accessToggleTitle: {
    color: '#080A0C',
    fontSize: 14,
    fontWeight: '700',
  },
  accessToggleTitleActive: {
    color: '#080A0C',
    fontWeight: '800',
  },
  accessToggleSub: {
    color: '#475569',
    fontSize: 11.5,
    lineHeight: 15,
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 92,
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
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
    ...M3Elevation.level3,
  },
  startBtnSafe: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  startBtnWarn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F59E0B',
  },
  startBtnText: {
    color: '#080A0C',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  simulateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
    ...M3Elevation.level2,
  },
  simulateBtnText: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: '800',
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
  // Transit-specific preview styles
  transitBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  transitBadgeText: {
    color: '#38BDF8',
  },
  routeCardSelectedTransitAlt: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  transitAltBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  transitAltBadgeText: {
    color: '#06B6D4',
  },
  transferBadgeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  transferBadgeStepText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  transitLinesPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
  },
  transitLinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  transitLinePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  previewStepRowTransit: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 4,
    borderBottomWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  previewStepBulletTransit: {
    backgroundColor: '#0284C7',
  },
  transitStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  transitStepLineBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transitStepLineBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  transitStepOperatorText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  transitStopsDetailsBox: {
    marginTop: 6,
    marginBottom: 6,
    paddingLeft: 4,
  },
  transitStopPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#0F172A',
  },
  transitStopPointText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  transitStopStopsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  stopVerticalLine: {
    width: 2,
    height: 14,
    backgroundColor: '#334155',
    marginLeft: 3,
    marginRight: 11,
  },
  transitStopStopsCountText: {
    color: '#64748B',
    fontSize: 10,
    fontStyle: 'italic',
  },
  realtimeArrivalWaitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  realtimeArrivalWaitText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  microDelayBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  microDelayOk: {
    backgroundColor: '#059669',
  },
  microDelayWarn: {
    backgroundColor: '#D97706',
  },
  microDelayText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  walkingDetourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  walkingDetourBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
});
