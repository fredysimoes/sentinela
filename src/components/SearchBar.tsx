import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { searchAddressSuggestions, AddressSuggestion } from '../services/geocodingService';
import { RouteCoordinate, TransportMode } from '../types/navigation';
import { calculateDistanceMeters } from '../utils/geo';
import { formatDuration, formatDistance } from '../services/routingService';
import { M3Colors, M3Shapes, M3Elevation, M3Typography, M3Motion } from '../theme/m3';
import { M3Pressable } from './M3MotionWrapper';

interface SearchBarProps {
  userLocation?: { latitude: number; longitude: number } | null;
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
  onSelectDestination: (name: string, coord: RouteCoordinate, mode: TransportMode) => void;
  onOpenSOSContacts?: () => void;
  onOpenSentinels?: () => void;
  onOpenSettings?: () => void;
  emergencyContactsCount?: number;
  sentinelsCount?: number;
  accessibleRouteOnly?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  userLocation,
  transportMode,
  onTransportModeChange,
  onSelectDestination,
  onOpenSOSContacts,
  onOpenSentinels,
  onOpenSettings,
  emergencyContactsCount = 0,
  sentinelsCount = 0,
  accessibleRouteOnly = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Material Design Motion: Dropdown Container Transform
  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownTranslateY = useRef(new Animated.Value(-10)).current;

  const showSuggestions = suggestions.length > 0 && (isFocused || query.trim().length >= 2);

  useEffect(() => {
    if (showSuggestions) {
      Animated.parallel([
        Animated.timing(dropdownOpacity, {
          toValue: 1,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.emphasizedDecelerate,
          useNativeDriver: true,
        }),
        Animated.timing(dropdownTranslateY, {
          toValue: 0,
          duration: M3Motion.durations.medium2,
          easing: M3Motion.easings.emphasizedDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      dropdownOpacity.setValue(0);
      dropdownTranslateY.setValue(-10);
    }
  }, [showSuggestions]);

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

  const handleSelect = (item: AddressSuggestion) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setQuery(item.title);
    setSuggestions([]);
    setIsFocused(false);
    onSelectDestination(
      item.title,
      {
        latitude: item.latitude,
        longitude: item.longitude,
      },
      transportMode
    );
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const getSuggestionEta = (itemLat: number, itemLon: number, distanceMeters?: number): string | null => {
    if (!userLocation) return null;
    const dist =
      distanceMeters ??
      calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        itemLat,
        itemLon
      );
    const distText = formatDistance(dist);
    const speed = transportMode === 'driving' ? 500 : transportMode === 'transit' ? 250 : 75; // meters per minute
    const mins = Math.max(1, Math.round(dist / speed));
    const timeText = formatDuration(mins);
    return `${distText} • ~${timeText}`;
  };

  const getItemIcon = (type: AddressSuggestion['type']) => {
    switch (type) {
      case 'police':
        return { name: 'shield-sharp', color: '#3B82F6', isMci: false };
      case 'pharmacy':
        return { name: 'medical', color: '#10B981', isMci: false };
      case 'address':
        return { name: 'home-outline', color: '#06B6D4', isMci: false };
      case 'school':
        return { name: 'school-outline', color: '#8B5CF6', isMci: false };
      case 'heritage':
        return { name: 'castle', color: '#D97706', isMci: true };
      case 'wheelmap':
        return { name: 'wheelchair', color: '#10B981', isMci: true };
      case 'road':
        return { name: 'highway', color: '#38BDF8', isMci: true };
      case 'street':
        return { name: 'navigate-circle', color: '#38BDF8', isMci: false };
      default:
        return { name: 'location', color: '#F59E0B', isMci: false };
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Claymorphism Floating Search Capsule */}
      <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
        {/* Leading Sentinela Logo Badge */}
        <View style={styles.brandBadge}>
          <Ionicons name="shield-half" size={18} color="#383139" />
          <View style={styles.liveDot} />
        </View>

        {/* Input */}
        <TextInput
          style={styles.input}
          placeholder={
            transportMode === 'driving'
              ? 'Destino de carro seguro...'
              : transportMode === 'transit'
              ? 'Destino de transportes públicos...'
              : 'Para onde vai em segurança?'
          }
          placeholderTextColor="#7D7582"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          returnKeyType="search"
          autoCorrect={false}
        />

        {/* Clear Button */}
        {query.length > 0 && (
          <M3Pressable onPress={handleClear} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={19} color="#7D7582" />
          </M3Pressable>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <ActivityIndicator size="small" color="#f6a3ca" style={styles.iconBtn} />
        )}

        {/* Transport Mode Toggle Button (Walk vs Transit vs Drive vs Accessible Walk) */}
        <M3Pressable
          style={[
            styles.modeToggleBtn,
            transportMode === 'driving' && styles.modeToggleBtnDriving,
            transportMode === 'transit' && styles.modeToggleBtnTransit,
            transportMode === 'walking' && accessibleRouteOnly && styles.modeToggleBtnAccessible,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            const nextMode: TransportMode =
              transportMode === 'walking'
                ? 'transit'
                : transportMode === 'transit'
                ? 'driving'
                : 'walking';
            onTransportModeChange(nextMode);
          }}
        >
          {transportMode === 'driving' ? (
            <Ionicons name="car-sport" size={16} color="#383139" />
          ) : transportMode === 'transit' ? (
            <MaterialCommunityIcons name="bus" size={17} color="#383139" />
          ) : accessibleRouteOnly ? (
            <MaterialCommunityIcons name="wheelchair" size={17} color="#383139" />
          ) : (
            <Ionicons name="walk" size={16} color="#383139" />
          )}
        </M3Pressable>

        {/* SOS Emergency Contacts Access Button */}
        {onOpenSOSContacts && (
          <M3Pressable
            style={styles.contactsActionBtn}
            onPress={onOpenSOSContacts}
          >
            <Ionicons name="call-outline" size={16} color="#383139" />
            {emergencyContactsCount > 0 && (
              <View style={styles.contactsCountBadge}>
                <Text style={styles.contactsCountText}>{emergencyContactsCount}</Text>
              </View>
            )}
          </M3Pressable>
        )}

        {/* Proximity & Settings Button */}
        {onOpenSettings && (
          <M3Pressable
            style={styles.contactsActionBtn}
            onPress={onOpenSettings}
          >
            <Ionicons name="options-outline" size={17} color="#383139" />
          </M3Pressable>
        )}
      </View>

      {/* Autocomplete Suggestions Dropdown */}
      {showSuggestions && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              opacity: dropdownOpacity,
              transform: [{ translateY: dropdownTranslateY }],
            },
          ]}
        >
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>Sugestões de Destino</Text>
            <TouchableOpacity onPress={() => setSuggestions([])} style={{ padding: 4 }}>
              <Ionicons name="close" size={16} color="#383139" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled={true}
            style={styles.dropdownList}
            contentContainerStyle={styles.dropdownListContent}
            renderItem={({ item }) => {
              const iconInfo = getItemIcon(item.type);
              const eta = getSuggestionEta(item.latitude, item.longitude, item.distanceMeters);

              return (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.itemPinWrap, { backgroundColor: '#ded0f9' }]}>
                    {iconInfo.isMci ? (
                      <MaterialCommunityIcons name={iconInfo.name as any} size={18} color="#383139" />
                    ) : (
                      <Ionicons name={iconInfo.name as any} size={18} color="#383139" />
                    )}
                  </View>

                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>

                  {eta && (
                    <View style={styles.etaPill}>
                      <Text style={styles.etaText}>{eta}</Text>
                    </View>
                  )}

                  <Ionicons name="chevron-forward" size={16} color="#7D7582" />
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    zIndex: 9999,
    position: 'relative',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffdf7',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingLeft: 12,
    paddingRight: 8,
    height: 56,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  searchBoxFocused: {
    borderColor: '#f6a3ca',
    backgroundColor: '#fffdf7',
    borderWidth: 2,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#f6a3ca',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#c0efdc',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  input: {
    flex: 1,
    color: '#383139',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.15,
    paddingVertical: 0,
  },
  iconBtn: {
    padding: 6,
  },
  modeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeToggleBtnDriving: {
    backgroundColor: '#f9e7a8',
    borderColor: '#ffffff',
  },
  modeToggleBtnTransit: {
    backgroundColor: '#ded0f9',
    borderColor: '#ffffff',
  },
  modeToggleBtnAccessible: {
    backgroundColor: '#c5e5fb',
    borderColor: '#ffffff',
  },
  contactsActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    position: 'relative',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  contactsCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#ffffff',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactsCountText: {
    color: '#383139',
    fontSize: 9,
    fontWeight: '800',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#fffdf7',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ffffff',
    maxHeight: 280,
    overflow: 'hidden',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownList: {
    maxHeight: 220,
  },
  dropdownListContent: {
    flexGrow: 1,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ded0f9',
    borderBottomWidth: 1.5,
    borderBottomColor: '#ffffff',
  },
  dropdownHeaderText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 49, 57, 0.06)',
    gap: 12,
  },
  itemPinWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: '#48404b',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  etaPill: {
    backgroundColor: '#f9e7a8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  etaText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '800',
  },
});
