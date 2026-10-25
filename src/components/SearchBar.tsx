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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { searchAddressSuggestions, AddressSuggestion } from '../services/geocodingService';
import { RouteCoordinate, TransportMode } from '../types/navigation';
import { HomeAddress } from '../types';
import { calculateDistanceMeters } from '../utils/geo';
import { formatDuration, formatDistance } from '../services/routingService';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';

interface SearchBarProps {
  userLocation?: { latitude: number; longitude: number } | null;
  transportMode: TransportMode;
  homeAddress?: HomeAddress | null;
  onTransportModeChange: (mode: TransportMode) => void;
  onSelectDestination: (name: string, coord: RouteCoordinate, mode: TransportMode) => void;
  onQuickRouteToHome?: () => void;
  onQuickRouteToPolice: () => void;
  onQuickRouteToPharmacy: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  userLocation,
  transportMode,
  homeAddress,
  onTransportModeChange,
  onSelectDestination,
  onQuickRouteToHome,
  onQuickRouteToPolice,
  onQuickRouteToPharmacy,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      case 'street':
        return { name: 'navigate-circle', color: '#38BDF8' };
      default:
        return { name: 'location', color: '#F59E0B' };
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Transport Mode Switcher: A Pé vs De Carro */}
      <View style={styles.modeSelectorRow}>
        <TouchableOpacity
          style={[
            styles.modeTab,
            transportMode === 'walking' && styles.modeTabActiveWalking,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onTransportModeChange('walking');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="walk"
            size={16}
            color={transportMode === 'walking' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[
              styles.modeTabText,
              transportMode === 'walking' && styles.modeTabTextActiveWalking,
            ]}
          >
            A Pé (Pedestre)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeTab,
            transportMode === 'driving' && styles.modeTabActiveDriving,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onTransportModeChange('driving');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="car-sport"
            size={16}
            color={transportMode === 'driving' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[
              styles.modeTabText,
              transportMode === 'driving' && styles.modeTabTextActiveDriving,
            ]}
          >
            De Carro (Automóvel)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Box */}
      <View style={[styles.searchBox, isFocused && styles.searchBoxFocused]}>
        <Ionicons name="search" size={20} color={M3Colors.primary} style={styles.searchIcon} />

        <TextInput
          style={styles.input}
          placeholder={
            transportMode === 'driving'
              ? 'Destino de carro (ex: Aliados, Foz, Boavista...)'
              : 'Destino a pé em segurança (rua, local...)'
          }
          placeholderTextColor={M3Colors.outline}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          returnKeyType="search"
          autoCorrect={false}
        />

        {isLoading ? (
          <ActivityIndicator size="small" color={M3Colors.primary} style={styles.clearBtn} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={M3Colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick Access Shortcuts (when not searching) */}
      {!isFocused && query.length === 0 && (
        <View style={styles.shortcutsRow}>
          {/* Casa Shortcut */}
          <TouchableOpacity
            style={[
              styles.shortcutChip,
              homeAddress && styles.shortcutChipActiveHome,
            ]}
            onPress={onQuickRouteToHome}
            activeOpacity={0.8}
          >
            <Ionicons
              name={homeAddress ? 'home' : 'home-outline'}
              size={15}
              color={homeAddress ? M3Colors.primary : M3Colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.shortcutText,
                homeAddress && styles.shortcutTextActiveHome,
              ]}
            >
              {homeAddress ? 'Casa' : '+ Casa'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutChip}
            onPress={onQuickRouteToPolice}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-sharp" size={15} color={M3Colors.primary} />
            <Text style={styles.shortcutText}>Esquadra</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutChip}
            onPress={onQuickRouteToPharmacy}
            activeOpacity={0.8}
          >
            <Ionicons name="medical" size={15} color={M3Colors.success} />
            <Text style={styles.shortcutText}>Farmácia</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Google Maps / Waze Style Autocomplete Suggestions Dropdown */}
      {suggestions.length > 0 && (isFocused || query.trim().length >= 2) && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>SUGESTÕES DE DESTINO</Text>
            <TouchableOpacity onPress={() => setSuggestions([])} style={{ padding: 2 }}>
              <Ionicons name="close" size={16} color="#94A3B8" />
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

                  <Ionicons name="chevron-forward" size={16} color="#475569" />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: M3Colors.surface,
    zIndex: 9999,
    position: 'relative',
  },
  modeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modeTab: {
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
  modeTabActiveWalking: {
    backgroundColor: M3Colors.secondaryContainer,
    borderColor: M3Colors.secondary,
  },
  modeTabActiveDriving: {
    backgroundColor: M3Colors.secondaryContainer,
    borderColor: M3Colors.secondary,
  },
  modeTabText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabTextActiveWalking: {
    color: M3Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  modeTabTextActiveDriving: {
    color: M3Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.extraLarge,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    paddingHorizontal: 16,
    height: 52,
    ...M3Elevation.level2,
  },
  searchBoxFocused: {
    borderColor: M3Colors.primary,
    backgroundColor: M3Colors.surfaceContainerHighest,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: M3Colors.onSurface,
    fontSize: 15,
    fontWeight: '400',
  },
  clearBtn: {
    padding: 6,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: M3Shapes.small,
  },
  shortcutChipActiveHome: {
    backgroundColor: M3Colors.primaryContainer,
    borderColor: M3Colors.primary,
  },
  shortcutText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutTextActiveHome: {
    color: M3Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.extraLarge,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    maxHeight: 280,
    overflow: 'hidden',
    ...M3Elevation.level3,
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
  dropdownHeaderSub: {
    color: M3Colors.primary,
    fontSize: 11,
    fontWeight: '600',
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
