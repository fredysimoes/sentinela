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
import { M3Colors, M3Shapes, M3Elevation, M3Motion } from '../theme/m3';
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
    const speed = transportMode === 'driving' ? 500 : 75; // meters per minute
    const mins = Math.max(1, Math.round(dist / speed));
    const timeText = formatDuration(mins);
    return `${distText} • ~${timeText}`;
  };

  const getItemIcon = (type: AddressSuggestion['type']) => {
    switch (type) {
      case 'police':
        return { name: 'shield-sharp', color: '#3B82F6' };
      case 'pharmacy':
        return { name: 'medical', color: '#10B981' };
      case 'address':
        return { name: 'home-outline', color: '#06B6D4' };
      case 'street':
        return { name: 'navigate-circle', color: '#38BDF8' };
      default:
        return { name: 'location', color: '#F59E0B' };
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Google M3 Floating Search Capsule */}
      <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
        {/* Leading Sentinela Logo Badge */}
        <View style={styles.brandBadge}>
          <Ionicons name="shield-half" size={18} color="#10B981" />
          <View style={styles.liveDot} />
        </View>

        {/* Input */}
        <TextInput
          style={styles.input}
          placeholder={
            transportMode === 'driving'
              ? 'Destino de carro seguro...'
              : 'Para onde vai em segurança?'
          }
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          returnKeyType="search"
          autoCorrect={false}
        />

        {/* Clear Button */}
        {query.length > 0 && (
          <M3Pressable onPress={handleClear} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={19} color={M3Colors.onSurfaceVariant} />
          </M3Pressable>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <ActivityIndicator size="small" color="#10B981" style={styles.iconBtn} />
        )}

        {/* Transport Mode Toggle Button (Walk vs Drive vs Accessible Walk) */}
        <M3Pressable
          style={[
            styles.modeToggleBtn,
            transportMode === 'driving' && styles.modeToggleBtnDriving,
            transportMode === 'walking' && accessibleRouteOnly && styles.modeToggleBtnAccessible,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onTransportModeChange(transportMode === 'walking' ? 'driving' : 'walking');
          }}
        >
          {transportMode === 'driving' ? (
            <Ionicons name="car-sport" size={16} color="#06140E" />
          ) : accessibleRouteOnly ? (
            <MaterialCommunityIcons name="wheelchair" size={17} color="#06B6D4" />
          ) : (
            <Ionicons name="walk" size={16} color="#10B981" />
          )}
        </M3Pressable>

        {/* SOS Emergency Contacts Access Button */}
        {onOpenSOSContacts && (
          <M3Pressable
            style={styles.contactsActionBtn}
            onPress={onOpenSOSContacts}
          >
            <Ionicons name="call-outline" size={16} color="#CBD5E1" />
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
            <Ionicons name="options-outline" size={17} color="#CBD5E1" />
          </M3Pressable>
        )}
      </View>

      {/* Autocomplete Suggestions Dropdown (Material Motion Container Transform) */}
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
            <Text style={styles.dropdownHeaderText}>SUGESTÕES DE DESTINO</Text>
            <TouchableOpacity onPress={() => setSuggestions([])} style={{ padding: 4 }}>
              <Ionicons name="close" size={16} color={M3Colors.onSurfaceVariant} />
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
                  <View style={[styles.itemPinWrap, { backgroundColor: `${iconInfo.color}1A` }]}>
                    <Ionicons name={iconInfo.name as any} size={18} color={iconInfo.color} />
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

                  <Ionicons name="chevron-forward" size={16} color={M3Colors.outline} />
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
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
    zIndex: 9999,
    position: 'relative',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 20, 27, 0.96)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingLeft: 10,
    paddingRight: 8,
    height: 50,
    ...M3Elevation.level3,
    gap: 8,
  },
  searchBoxFocused: {
    borderColor: '#10B981',
    backgroundColor: '#141922',
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  input: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  iconBtn: {
    padding: 6,
  },
  modeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0E1217',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeToggleBtnDriving: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
  },
  modeToggleBtnAccessible: {
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
    borderColor: '#06B6D4',
  },
  contactsActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0E1217',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  contactsCountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: M3Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactsCountText: {
    color: M3Colors.onPrimary,
    fontSize: 9,
    fontWeight: '800',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.extraLarge,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    maxHeight: 280,
    overflow: 'hidden',
    ...M3Elevation.level4,
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
    paddingVertical: 9,
    backgroundColor: M3Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
  },
  dropdownHeaderText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(68, 71, 78, 0.4)',
    gap: 12,
  },
  itemPinWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: M3Colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },
  etaPill: {
    backgroundColor: M3Colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: M3Shapes.full,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  etaText: {
    color: M3Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
