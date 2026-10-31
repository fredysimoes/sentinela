import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MaterialSymbolIcon, MaterialSymbolName } from './MaterialSymbolIcon';
import Haptics from '../utils/haptics';
import { Incident, IncidentCategory } from '../types';
import { CATEGORIES } from '../constants/categories';
import { isProtestInfiltratorVerified } from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { M3BottomSheetWrapper, M3Pressable } from './M3MotionWrapper';

interface MapLayersModalProps {
  visible: boolean;
  onClose: () => void;
  // Infrastructure Layers Toggles (Polícia, Farmácias, Hospitais, Wheelmap)
  showPoliceOnMap: boolean;
  onTogglePolice: () => void;
  showPharmaciesOnMap: boolean;
  onTogglePharmacies: () => void;
  showHospitalsOnMap: boolean;
  onToggleHospitals: () => void;
  showWheelmapOnMap: boolean;
  onToggleWheelmap: () => void;
  showStcpBusesOnMap?: boolean;
  onToggleStcpBuses?: () => void;
  showUnirBusesOnMap?: boolean;
  onToggleUnirBuses?: () => void;
  showCarrisBusesOnMap?: boolean;
  onToggleCarrisBuses?: () => void;
  showCarrisMetroBusesOnMap?: boolean;
  onToggleCarrisMetroBuses?: () => void;
  showCpTrainsOnMap?: boolean;
  onToggleCpTrains?: () => void;
  showMetroStationsOnMap?: boolean;
  onToggleMetroStations?: () => void;
  onActivateAllLayers: () => void;
  onDeactivateAllLayers: () => void;
  // Hazard / Incidents Filter
  selectedFilter: IncidentCategory | null;
  onSelectFilter: (category: IncidentCategory | null) => void;
  incidents: Incident[];
  protestMode?: boolean;
}

export const MapLayersModal: React.FC<MapLayersModalProps> = ({
  visible,
  onClose,
  showPoliceOnMap,
  onTogglePolice,
  showPharmaciesOnMap,
  onTogglePharmacies,
  showHospitalsOnMap,
  onToggleHospitals,
  showWheelmapOnMap,
  onToggleWheelmap,
  showStcpBusesOnMap = false,
  onToggleStcpBuses,
  showUnirBusesOnMap = false,
  onToggleUnirBuses,
  showCarrisBusesOnMap = false,
  onToggleCarrisBuses,
  showCarrisMetroBusesOnMap = false,
  onToggleCarrisMetroBuses,
  showCpTrainsOnMap = false,
  onToggleCpTrains,
  showMetroStationsOnMap = false,
  onToggleMetroStations,
  onActivateAllLayers,
  onDeactivateAllLayers,
  selectedFilter,
  onSelectFilter,
  incidents,
  protestMode = false,
}) => {
  const activeLayersCount = [
    showPoliceOnMap,
    showPharmaciesOnMap,
    showHospitalsOnMap,
    showWheelmapOnMap,
    showStcpBusesOnMap,
    showUnirBusesOnMap,
    showCarrisBusesOnMap,
    showCarrisMetroBusesOnMap,
    showCpTrainsOnMap,
  ].filter(Boolean).length;

  const allLayersActive = activeLayersCount === 9;

  const INFRASTRUCTURE_LAYERS: {
    id: string;
    name: string;
    subtitle: string;
    symbol?: MaterialSymbolName;
    icon?: string;
    color: string;
    active: boolean;
    onToggle: () => void;
  }[] = [
    {
      id: 'metro_porto',
      name: 'Metro do Porto',
      subtitle: '85 Estações e Linhas A, B, C, D, E, F',
      icon: 'subway-variant',
      color: '#0284C7',
      active: showMetroStationsOnMap,
      onToggle: onToggleMetroStations || (() => {}),
    },
    {
      id: 'cp_trains',
      name: 'Comboios CP',
      subtitle: 'Alfa Pendular, IC, Urbanos e Estações em direto',
      icon: 'train',
      color: '#00824B',
      active: showCpTrainsOnMap,
      onToggle: onToggleCpTrains || (() => {}),
    },
    {
      id: 'stcp',
      name: 'Autocarros STCP',
      subtitle: 'Porto Urbano e Paragens em direto',
      icon: 'bus-side',
      color: '#0284C7',
      active: showStcpBusesOnMap,
      onToggle: onToggleStcpBuses || (() => {}),
    },
    {
      id: 'unir',
      name: 'Autocarros UNIR',
      subtitle: 'Porto Metropolitano e Paragens em direto',
      icon: 'bus',
      color: '#0891B2',
      active: showUnirBusesOnMap,
      onToggle: onToggleUnirBuses || (() => {}),
    },
    {
      id: 'carris',
      name: 'Carris Lisboa',
      subtitle: 'Lisboa Urbana e Paragens em direto',
      icon: 'bus-side',
      color: '#EAB308',
      active: showCarrisBusesOnMap,
      onToggle: onToggleCarrisBuses || (() => {}),
    },
    {
      id: 'carris_metro',
      name: 'Carris Metropolitana',
      subtitle: 'Grande Lisboa e Paragens em direto',
      icon: 'bus',
      color: '#F59E0B',
      active: showCarrisMetroBusesOnMap,
      onToggle: onToggleCarrisMetroBuses || (() => {}),
    },
    {
      id: 'pharmacy',
      name: 'Farmácias',
      subtitle: 'Farmácias 24h e serviço de turno',
      symbol: 'health_cross',
      color: '#10B981',
      active: showPharmaciesOnMap,
      onToggle: onTogglePharmacies,
    },
    {
      id: 'police',
      name: 'Polícia (PSP/GNR/PJ)',
      subtitle: 'Esquadras e postos policiais',
      symbol: 'local_police',
      color: '#38BDF8',
      active: showPoliceOnMap,
      onToggle: onTogglePolice,
    },
    {
      id: 'hospital',
      name: 'Hospitais',
      subtitle: 'Urgências e centros hospitalares',
      symbol: 'emergency',
      color: '#0EA5E9',
      active: showHospitalsOnMap,
      onToggle: onToggleHospitals,
    },
    {
      id: 'wheelmap',
      name: 'Acessibilidade (Wheelmap)',
      subtitle: 'Locais verificados c/ rampa e elevador',
      symbol: 'accessible',
      color: '#10B981',
      active: showWheelmapOnMap,
      onToggle: onToggleWheelmap,
    },
  ];

  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose}>
      <View style={styles.sheetContainer}>
        {/* Drag Handle */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="options-outline" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Filtros do Mapa</Text>
              <Text style={styles.headerSubtitle}>
                {activeLayersCount} de 4 filtros ativos no mapa
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              Haptics.selectionAsync();
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Layer Switch Actions */}
          <View style={styles.quickActionsBar}>
            <TouchableOpacity
              style={[
                styles.quickActionPill,
                allLayersActive && styles.quickActionPillActive,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                if (allLayersActive) {
                  onDeactivateAllLayers();
                } else {
                  onActivateAllLayers();
                }
              }}
            >
              <Ionicons
                name={allLayersActive ? 'checkmark-circle' : 'refresh-outline'}
                size={14}
                color={allLayersActive ? '#080A0C' : '#CBD5E1'}
              />
              <Text
                style={[
                  styles.quickActionText,
                  allLayersActive && styles.quickActionTextActive,
                ]}
              >
                {allLayersActive ? 'Todos os Filtros Ativos' : 'Ativar Todos os Filtros'}
              </Text>
            </TouchableOpacity>

            {selectedFilter !== null && (
              <TouchableOpacity
                style={styles.resetFilterPill}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelectFilter(null);
                }}
              >
                <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                <Text style={styles.resetFilterText}>Limpar Filtro de Perigo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Section 1: Infrastructure Layers */}
          <Text style={styles.sectionTitle}>PONTOS DE APOIO E ACESSIBILIDADE</Text>
          <View style={styles.layersGrid}>
            {INFRASTRUCTURE_LAYERS.map((layer) => {
              const isActive = layer.active;
              return (
                <TouchableOpacity
                  key={layer.id}
                  style={[
                    styles.layerCard,
                    isActive && {
                      borderColor: layer.color,
                      borderWidth: 2,
                      backgroundColor: '#FFFFFF',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.selectionAsync();
                    layer.onToggle();
                  }}
                >
                  <View style={styles.layerCardTop}>
                    <View
                      style={[
                        styles.layerIconWrap,
                        {
                          backgroundColor: `${layer.color}1E`,
                          borderColor: `${layer.color}40`,
                        },
                      ]}
                    >
                      {layer.symbol ? (
                        <MaterialSymbolIcon
                          name={layer.symbol}
                          size={19}
                          color={layer.color}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={layer.icon as any}
                          size={18}
                          color={layer.color}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.toggleDot,
                        isActive && { backgroundColor: layer.color, borderColor: layer.color },
                      ]}
                    >
                      {isActive && <Ionicons name="checkmark" size={12} color="#383139" />}
                    </View>
                  </View>

                  <Text style={styles.layerName} numberOfLines={1}>
                    {layer.name}
                  </Text>
                  <Text style={styles.layerSub} numberOfLines={1}>
                    {layer.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section 2: Hazard / Incident Filters */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>FILTRAR OCORRÊNCIAS COMUNITÁRIAS</Text>
            {incidents.length > 0 && (
              <Text style={styles.incidentCounter}>
                {incidents.length} {incidents.length === 1 ? 'alerta' : 'alertas'}
              </Text>
            )}
          </View>

          <View style={styles.hazardChipsWrap}>
            {/* All Incidents Chip */}
            <TouchableOpacity
              style={[
                styles.hazardChip,
                selectedFilter === null && styles.hazardChipActiveAll,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectFilter(null);
              }}
            >
              <Ionicons
                name="layers-outline"
                size={14}
                color={selectedFilter === null ? '#383139' : '#7D7582'}
              />
              <Text
                style={[
                  styles.hazardChipText,
                  selectedFilter === null && styles.hazardChipTextActiveDark,
                ]}
              >
                Todas as Ocorrências ({incidents.length})
              </Text>
            </TouchableOpacity>

            {/* Individual Hazard Categories */}
            {(Object.keys(CATEGORIES) as IncidentCategory[])
              .filter(
                (catKey) =>
                  catKey !== 'protest_infiltrator' ||
                  Boolean(protestMode) ||
                  incidents.some(
                    (i) =>
                      i.category === 'protest_infiltrator' &&
                      isProtestInfiltratorVerified(i, incidents, 300, 3)
                  )
              )
              .map((catKey) => {
                const cat = CATEGORIES[catKey];
                const isSelected = selectedFilter === catKey;
                const count = incidents.filter(
                  (i) =>
                    i.category === catKey &&
                    (i.category !== 'protest_infiltrator' ||
                      isProtestInfiltratorVerified(i, incidents, 300, 3))
                ).length;

                return (
                  <TouchableOpacity
                    key={catKey}
                    style={[
                      styles.hazardChip,
                      isSelected && {
                        backgroundColor: cat.color,
                        borderColor: cat.color,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onSelectFilter(isSelected ? null : catKey);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={(cat.mciIcon || 'alert-circle') as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : cat.color}
                    />
                    <Text
                      style={[
                        styles.hazardChipText,
                        isSelected && styles.hazardChipTextActiveWhite,
                      ]}
                    >
                      {cat.label} {count > 0 ? `(${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </ScrollView>

        {/* Footer Concluir Button */}
        <View style={styles.footerWrap}>
          <M3Pressable
            scaleOnPress={0.97}
            style={styles.doneBtn}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
            }}
          >
            <Text style={styles.doneBtnText}>Concluir e Ver no Mapa</Text>
          </M3Pressable>
        </View>
      </View>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 10,
    maxHeight: '86%',
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d6cfcf',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    color: '#383139',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    color: '#7D7582',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionPillActive: {
    backgroundColor: '#f9e7a8',
    borderColor: '#ffffff',
    borderWidth: 1.5,
  },
  quickActionText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quickActionTextActive: {
    color: '#383139',
    fontWeight: '900',
  },
  resetFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  resetFilterText: {
    color: '#f6a3ca',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  incidentCounter: {
    color: '#7D7582',
    fontSize: 11,
    fontWeight: '800',
  },
  layersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  layerCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  layerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  layerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#f1f2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerName: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  layerSub: {
    color: '#7D7582',
    fontSize: 11,
    fontWeight: '600',
  },
  hazardChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hazardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  hazardChipActiveAll: {
    backgroundColor: '#f9e7a8',
    borderColor: '#ffffff',
  },
  hazardChipText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  hazardChipTextActiveDark: {
    color: '#383139',
    fontWeight: '900',
  },
  hazardChipTextActiveWhite: {
    color: '#383139',
    fontWeight: '900',
  },
  footerWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#f1f2fa',
    backgroundColor: '#fffdf7',
  },
  doneBtn: {
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  doneBtnText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
