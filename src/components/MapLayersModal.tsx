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
  ].filter(Boolean).length;

  const allLayersActive = activeLayersCount === 6;

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
      id: 'stcp',
      name: 'Autocarros STCP',
      subtitle: 'Porto Urbano em direto',
      icon: 'bus-side',
      color: '#0284C7',
      active: showStcpBusesOnMap,
      onToggle: onToggleStcpBuses || (() => {}),
    },
    {
      id: 'unir',
      name: 'Autocarros UNIR',
      subtitle: 'Área Metropolitana em direto',
      icon: 'bus',
      color: '#0891B2',
      active: showUnirBusesOnMap,
      onToggle: onToggleUnirBuses || (() => {}),
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
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
                      {isActive && <Ionicons name="checkmark" size={12} color="#080A0C" />}
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
                color={selectedFilter === null ? '#080A0C' : '#94A3B8'}
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
    backgroundColor: '#0D1117',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    maxHeight: '86%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...M3Elevation.level4,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: M3Shapes.full,
  },
  quickActionPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
  },
  quickActionText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionTextActive: {
    color: '#080A0C',
    fontWeight: '800',
  },
  resetFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: M3Shapes.full,
  },
  resetFilterText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  incidentCounter: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  layersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  layerCard: {
    width: '48.5%',
    backgroundColor: '#131922',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
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
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  layerSub: {
    color: '#94A3B8',
    fontSize: 11,
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
    backgroundColor: '#131922',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: M3Shapes.full,
  },
  hazardChipActiveAll: {
    backgroundColor: '#F8FAFC',
    borderColor: '#FFFFFF',
  },
  hazardChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  hazardChipTextActiveDark: {
    color: '#080A0C',
    fontWeight: '800',
  },
  hazardChipTextActiveWhite: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  footerWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#0D1117',
  },
  doneBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...M3Elevation.level2,
  },
  doneBtnText: {
    color: '#080A0C',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
