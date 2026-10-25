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
import { calculateDistanceMeters } from '../utils/geo';
import { formatDuration, formatDistance } from '../services/routingService';

interface SearchBarProps {
  userLocation?: { latitude: number; longitude: number } | null;
  transportMode: TransportMode;
  onTransportModeChange: (mode: TransportMode) => void;
  onSelectDestination: (name: string, coord: RouteCoordinate, mode: TransportMode) => void;
  onQuickRouteToPolice: () => void;
  onQuickRouteToPharmacy: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  userLocation,
  transportMode,
  onTransportModeChange,
  onSelectDestination,
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

  const getSuggestionEta = (itemLat: number, itemLon: number): string | null => {
    if (!userLocation) return null;
    const dist = calculateDistanceMeters(
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
        <Ionicons name="search" size={20} color="#38BDF8" style={styles.searchIcon} />

        <TextInput
          style={styles.input}
          placeholder={
            transportMode === 'driving'
              ? 'Destino de carro (ex: Aliados, Foz, Boavista...)'
              : 'Destino a pé em segurança (rua, local...)'
          }
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          returnKeyType="search"
          autoCorrect={false}
        />

        {isLoading ? (
          <ActivityIndicator size="small" color="#38BDF8" style={styles.clearBtn} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick Access Shortcuts (when not searching) */}
      {!isFocused && query.length === 0 && (
        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutChip}
            onPress={onQuickRouteToPolice}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-sharp" size={14} color="#3B82F6" />
            <Text style={styles.shortcutText}>Esquadra Mais Próxima</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutChip}
            onPress={onQuickRouteToPharmacy}
            activeOpacity={0.8}
          >
            <Ionicons name="medical" size={14} color="#10B981" />
            <Text style={styles.shortcutText}>Farmácia Aberta</Text>
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
            renderItem={({ item }) => {
              const iconInfo = getItemIcon(item.type);
              const eta = getSuggestionEta(item.latitude, item.longitude);

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
    backgroundColor: '#0F172A',
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
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  modeTabActiveWalking: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  modeTabActiveDriving: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  modeTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabTextActiveWalking: {
    color: '#0F172A',
    fontWeight: '800',
  },
  modeTabTextActiveDriving: {
    color: '#0F172A',
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  searchBoxFocused: {
    borderColor: '#38BDF8',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
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
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  shortcutText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  dropdown: {
    position: 'absolute',
    top: 96,
    left: 14,
    right: 14,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    maxHeight: 280,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dropdownHeaderText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownHeaderSub: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
    gap: 10,
  },
  itemPinWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  itemSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  etaPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  etaText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
});
