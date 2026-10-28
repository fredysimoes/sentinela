import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { Incident, IncidentCategory, UserLocation } from '../types';
import { CATEGORIES } from '../constants/categories';
import { countNearbyInfiltratorSignals } from '../utils/geo';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';
import { M3BottomSheetWrapper } from './M3MotionWrapper';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (incident: Omit<Incident, 'id' | 'createdAt' | 'confirmations' | 'dismissals'>) => void;
  currentLocation: UserLocation | null;
  targetCoordinate: { latitude: number; longitude: number } | null;
  initialCategory?: IncidentCategory;
  onStartStalking?: () => void;
  protestMode?: boolean;
  incidents?: Incident[];
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
  currentLocation,
  targetCoordinate,
  initialCategory = 'dark_area',
  onStartStalking,
  protestMode = false,
  incidents = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const reportCoord = targetCoordinate || {
    latitude: currentLocation?.latitude ?? 38.7223,
    longitude: currentLocation?.longitude ?? -9.1393,
  };

  // Count active infiltrator signals within 300 meters
  const nearbyInfiltratorSignals = useMemo(() => {
    return countNearbyInfiltratorSignals(reportCoord, incidents, 300);
  }, [reportCoord, incidents]);

  useEffect(() => {
    if (visible && initialCategory) {
      if (initialCategory === 'protest_infiltrator' && !protestMode) {
        setSelectedCategory('dark_area');
      } else {
        setSelectedCategory(initialCategory);
      }
    }
  }, [visible, initialCategory, protestMode]);

  useEffect(() => {
    if (selectedCategory === 'protest_infiltrator' && !protestMode) {
      setSelectedCategory('dark_area');
    }
  }, [protestMode, selectedCategory]);

  const handleSelectCategory = (cat: IncidentCategory) => {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
  };

  const handleSubmit = () => {
    const meta = CATEGORIES[selectedCategory] || CATEGORIES.suspicious;
    const finalTitle = title.trim() || meta.label;

    const doSubmit = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSubmit({
        category: selectedCategory,
        title: finalTitle,
        description: description.trim() || meta.description,
        latitude: reportCoord.latitude,
        longitude: reportCoord.longitude,
        severity: meta.severity,
      });

      if (selectedCategory === 'protest_infiltrator') {
        const nextTotal = nearbyInfiltratorSignals + 1;
        if (nextTotal >= 2) {
          Alert.alert(
            'Alerta Triangular Confirmado no Mapa',
            `Com a sua sinalização foi atingida a verificação comunitária (${nextTotal} sinalizações trianguladas num raio de 300m). O marcador de possíveis infiltrados está agora visível no mapa no epicentro mais aproximado.`
          );
        } else {
          Alert.alert(
            'Sinalização Registada (Aguardar Verificação)',
            `A sua sinalização foi registada (1 de 2 necessárias num raio de 300m). Por precaução e para evitar falso alarmismo, o marcador só ficará visível no mapa assim que mais 1 manifestante sinalizar nesta zona.`
          );
        }
      }

      setTitle('');
      setDescription('');
      onClose();
    };

    // Caution confirmation specifically for infiltrator reports
    if (selectedCategory === 'protest_infiltrator') {
      Alert.alert(
        'Aviso de Cautela e Visibilidade',
        'A sinalização de possíveis infiltrados deve ser usada com máxima cautela. Este marcador só aparecerá visível no mapa após 2 ou mais pessoas reportarem na mesma zona (300m), triangulando a posição exata. Confirma que presenciou atitudes provocatórias?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar e Sinalizar',
            style: 'destructive',
            onPress: doSubmit,
          },
        ]
      );
      return;
    }

    doSubmit();
  };

  const meta = CATEGORIES[selectedCategory] || CATEGORIES.suspicious;

  // Filter general categories grid: when Protest Mode is active, include protest_infiltrator in the grid as well
  const availableCategories = (Object.keys(CATEGORIES) as IncidentCategory[]).filter(
    (catKey) => catKey !== 'protest_infiltrator' || protestMode
  );

  return (
    <M3BottomSheetWrapper
      visible={visible}
      onClose={onClose}
      style={styles.sheetContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name="warning-outline" size={20} color="#FBBF24" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Sinalizar no Mapa</Text>
            <Text style={styles.headerSubtitle}>
              Ajude outros pedestres a caminhar em segurança
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Dedicated Private Stalking Alert Action */}
        {onStartStalking && (
          <TouchableOpacity
            style={styles.stalkingAlertCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onClose();
              onStartStalking();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.stalkingIconCircle}>
              <Ionicons name="eye" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.stalkingTitleRow}>
                <Text style={styles.stalkingTitle}>Estou a ser seguido(a)</Text>
                <View style={styles.privateBadge}>
                  <Ionicons name="lock-closed" size={10} color="#10B981" style={{ marginRight: 3 }} />
                  <Text style={styles.privateBadgeText}>Privado</Text>
                </View>
              </View>
              <Text style={styles.stalkingSub}>
                Ativar gravação discreta e rastro ao vivo apenas para os seus Sentinelas.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}

        {/* Protest Mode - Infiltrator Danger Action Button (Always available when Protest Mode is active) */}
        {protestMode && (
          <TouchableOpacity
            style={[
              styles.infiltratorAlertCard,
              selectedCategory === 'protest_infiltrator' && styles.infiltratorAlertCardActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleSelectCategory('protest_infiltrator');
              if (!title) {
                setTitle('Possíveis Infiltrados na Manifestação');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.infiltratorIconCircle}>
              <Ionicons name="eye-off" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.infiltratorTitleRow}>
                <Text style={styles.infiltratorTitle}>Possíveis Infiltrados</Text>
                <View style={styles.infiltratorBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#EF4444" style={{ marginRight: 3 }} />
                  <Text style={styles.infiltratorBadgeText}>Modo Protesto</Text>
                </View>
              </View>
              <Text style={styles.infiltratorSub}>
                Sinalizar provocadores na manifestação. Usar com cautela: o marcador só aparece no mapa após 2 ou 3 sinalizações trianguladas num raio de 300m.
              </Text>
              <View style={styles.infiltratorMetaRow}>
                <Ionicons name="people" size={12} color="#FCA5A5" />
                <Text style={styles.infiltratorMetaText}>
                  {nearbyInfiltratorSignals >= 2
                    ? `Visível e triangulado no mapa (${nearbyInfiltratorSignals} sinalizações)`
                    : `${nearbyInfiltratorSignals} de 2 sinalizações (raio 300m) para aparecer no mapa`}
                </Text>
              </View>
            </View>
            <Ionicons
              name={selectedCategory === 'protest_infiltrator' ? 'checkmark-circle' : 'chevron-forward'}
              size={20}
              color={selectedCategory === 'protest_infiltrator' ? '#FFFFFF' : '#EF4444'}
            />
          </TouchableOpacity>
        )}

        {/* Category selection - Square White Cards Grid */}
        <Text style={styles.sectionLabel}>TIPO DE OCORRÊNCIA</Text>
        <View style={styles.categoriesGrid}>
          {availableCategories.map((catKey) => {
            const cat = CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            const isFullWidthLast = catKey === 'safe_haven' && !protestMode;

            const renderModernCategoryIcon = () => {
              const iconColor = isSelected ? '#FFFFFF' : cat.color;
              const size = 20;
              switch (catKey) {
                case 'dark_area':
                  return <MaterialCommunityIcons name="weather-night" size={size} color={iconColor} />;
                case 'suspicious':
                  return <MaterialCommunityIcons name="incognito" size={size} color={iconColor} />;
                case 'harassment':
                  return <MaterialCommunityIcons name="hand-back-left-off" size={size} color={iconColor} />;
                case 'theft_risk':
                  return <MaterialCommunityIcons name="shield-alert" size={size} color={iconColor} />;
                case 'hazard':
                  return <MaterialCommunityIcons name="traffic-cone" size={size} color={iconColor} />;
                case 'police_presence':
                  return <MaterialCommunityIcons name="police-badge" size={size} color={iconColor} />;
                case 'protest_infiltrator':
                  return <MaterialCommunityIcons name="account-alert" size={size} color={iconColor} />;
                case 'safe_haven':
                  return <MaterialCommunityIcons name="shield-check" size={size} color={iconColor} />;
                default:
                  return <Ionicons name={cat.icon as any} size={18} color={iconColor} />;
              }
            };

            return (
              <TouchableOpacity
                key={catKey}
                style={[
                  styles.categoryCard,
                  isFullWidthLast && styles.categoryCardFullRow,
                  isSelected && [
                    styles.categoryCardSelected,
                    { borderColor: cat.color, shadowColor: cat.color },
                  ],
                ]}
                onPress={() => handleSelectCategory(catKey)}
                activeOpacity={0.78}
              >
                {isSelected && (
                  <View style={[styles.catSelectedCheckBadge, { backgroundColor: cat.color }]}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>
                )}

                {/* Stealth Teardrop-inspired Squircle Badge inside the Square White Card */}
                <View
                  style={[
                    styles.catIconSquircle,
                    isSelected
                      ? { backgroundColor: cat.color, borderColor: cat.color }
                      : { backgroundColor: '#0E1217', borderColor: cat.color },
                  ]}
                >
                  {renderModernCategoryIcon()}
                </View>

                <Text
                  style={[
                    styles.catLabel,
                    isSelected && { color: '#080A0C', fontWeight: '900' },
                  ]}
                  numberOfLines={2}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description helper */}
        <View style={[styles.metaNotice, { borderLeftColor: meta.color }]}>
          <Text style={styles.metaNoticeText}>{meta.description}</Text>
        </View>

        {/* Caution Callout for Infiltrator Reports */}
        {selectedCategory === 'protest_infiltrator' && (
          <View style={styles.cautionBanner}>
            <Ionicons name="warning" size={20} color="#F59E0B" style={{ marginTop: 1 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.cautionBannerTitle}>USO COM CAUTELA — TRIANGULAÇÃO COMUNITÁRIA</Text>
              <Text style={styles.cautionBannerText}>
                Para evitar falso alarmismo e posicionar o evento com precisão, a sinalização é guardada e só aparece no mapa após 2 ou mais pessoas reportarem na mesma zona (raio 300m). O sistema triangula as posições e coloca o marcador no epicentro mais aproximado.
              </Text>
            </View>
          </View>
        )}

        {/* Custom Title Input */}
        <Text style={styles.sectionLabel}>TÍTULO DO REPORTE (OPCIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder={meta.label}
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />

        {/* Description Input */}
        <Text style={styles.sectionLabel}>DETALHES OU RECOMENDAÇÕES</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={
            selectedCategory === 'protest_infiltrator'
              ? 'Ex: Grupo vestido de preto a arremessar garrafas contra montras...'
              : 'Ex: Evitar passar pelo lado esquerdo da rua, muito escuro e sem saída...'
          }
          placeholderTextColor="#64748B"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={200}
        />

        {/* Location Coordinate indicator */}
        <View style={styles.locationIndicator}>
          <Ionicons name="location-sharp" size={16} color="#38BDF8" />
          <Text style={styles.locationText}>
            Localização: {reportCoord.latitude.toFixed(4)}, {reportCoord.longitude.toFixed(4)}
            {targetCoordinate ? ' (ponto selecionado)' : ' (sua posição GPS)'}
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: meta.color }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Ionicons
            name={selectedCategory === 'protest_infiltrator' ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.submitButtonText}>
            {selectedCategory === 'protest_infiltrator'
              ? 'Sinalizar Possíveis Infiltrados'
              : 'Publicar Alerta Comunitário'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 92 : 90,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    ...M3Elevation.level4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: M3Colors.outlineVariant,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: M3Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  stalkingAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.14)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  stalkingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stalkingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  stalkingTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: M3Shapes.full,
  },
  privateBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  stalkingSub: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
  },
  infiltratorAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    ...M3Elevation.level2,
  },
  infiltratorAlertCardActive: {
    borderColor: '#F87171',
    backgroundColor: '#3B151A',
  },
  infiltratorIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infiltratorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  infiltratorTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  infiltratorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: M3Shapes.full,
  },
  infiltratorBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  infiltratorSub: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
  },
  infiltratorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  infiltratorMetaText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '700',
  },
  cautionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: M3Shapes.small,
    padding: 12,
    marginTop: 12,
  },
  cautionBannerTitle: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cautionBannerText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: M3Colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 10,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
  },
  categoryCard: {
    position: 'relative',
    width: '31.5%',
    aspectRatio: 1.04,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryCardFullRow: {
    width: '100%',
    aspectRatio: undefined,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  categoryCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 7,
  },
  catSelectedCheckBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  catIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 11,
    color: '#080A0C',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 13.5,
    letterSpacing: -0.1,
  },
  metaNotice: {
    backgroundColor: M3Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: M3Shapes.small,
    borderLeftWidth: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  metaNoticeText: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: M3Colors.onSurface,
    fontSize: 14,
  },
  textArea: {
    height: 75,
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 14,
    backgroundColor: M3Colors.secondaryContainer,
    padding: 10,
    borderRadius: M3Shapes.small,
  },
  locationText: {
    color: M3Colors.onSecondaryContainer,
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: M3Shapes.full,
    gap: 8,
    marginTop: 4,
    ...M3Elevation.level2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
