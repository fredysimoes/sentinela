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
import { countNearbyReporters } from '../utils/geo';
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

  // Count active reporters within 300 meters
  const nearbyReportersCount = useMemo(() => {
    return countNearbyReporters(reportCoord, incidents, 300);
  }, [reportCoord, incidents]);

  // Infiltrator report button is only unlocked when protest mode is active AND > 2 users are reporting within 300m
  const canReportInfiltrator = !!protestMode && nearbyReportersCount > 2;

  useEffect(() => {
    if (visible && initialCategory) {
      if (initialCategory === 'protest_infiltrator' && !canReportInfiltrator) {
        setSelectedCategory('dark_area');
      } else {
        setSelectedCategory(initialCategory);
      }
    }
  }, [visible, initialCategory, canReportInfiltrator]);

  useEffect(() => {
    if (selectedCategory === 'protest_infiltrator' && !canReportInfiltrator) {
      setSelectedCategory('dark_area');
    }
  }, [canReportInfiltrator, selectedCategory]);

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
        Alert.alert(
          'Sinalização Registada',
          'O seu reporte preventivo foi registado. Para segurança coletiva e prevenção de alarmismo, o alerta só será divulgado publicamente no mapa após validação comunitária num raio de 300m.'
        );
      }

      setTitle('');
      setDescription('');
      onClose();
    };

    // Caution confirmation specifically for infiltrator reports
    if (selectedCategory === 'protest_infiltrator') {
      Alert.alert(
        'Aviso de Cautela e Responsabilidade',
        'A sinalização de possíveis infiltrados deve ser feita com máxima ponderação para evitar alarmismo injustificado ou incidentes. Confirma que presenciou diretamente comportamentos de incitamento à desordem ou provocação deliberada?',
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

  // Filter general categories grid: exclude protest_infiltrator so it is only triggered via the verified protest button
  const availableCategories = (Object.keys(CATEGORIES) as IncidentCategory[]).filter(
    (catKey) => catKey !== 'protest_infiltrator'
  );

  return (
    <M3BottomSheetWrapper
      visible={visible}
      onClose={onClose}
      style={styles.sheetContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sinalizar no Mapa</Text>
          <Text style={styles.headerSubtitle}>
            Ajude outros pedestres a caminhar em segurança
          </Text>
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

        {/* Protest Mode - Infiltrator Danger Action Button (Only visible in Protest Mode) */}
        {protestMode && (
          canReportInfiltrator ? (
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
                  Sinalizar provocadores ou desestabilizadores violentos. Utilizar com máxima responsabilidade.
                </Text>
                <View style={styles.infiltratorMetaRow}>
                  <Ionicons name="people" size={12} color="#EF4444" />
                  <Text style={styles.infiltratorMetaText}>
                    {nearbyReportersCount} utilizadores a reportar num raio de 300m
                  </Text>
                </View>
              </View>
              <Ionicons
                name={selectedCategory === 'protest_infiltrator' ? 'checkmark-circle' : 'chevron-forward'}
                size={20}
                color={selectedCategory === 'protest_infiltrator' ? '#FFFFFF' : '#EF4444'}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.infiltratorLockedCard}>
              <View style={styles.infiltratorLockedIconCircle}>
                <Ionicons name="lock-closed" size={20} color="#64748B" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.infiltratorTitleRow}>
                  <Text style={styles.infiltratorLockedTitle}>Sinalizar Infiltrados (Bloqueado)</Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="shield-outline" size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                    <Text style={styles.lockedBadgeText}>Cautela</Text>
                  </View>
                </View>
                <Text style={styles.infiltratorLockedSub}>
                  Função de alta sensibilidade. Requer mais de 2 utilizadores a reportar num raio de 300m para prevenir alarmismo falso.
                </Text>
                <View style={styles.infiltratorMetaRow}>
                  <Ionicons name="people-outline" size={12} color="#64748B" />
                  <Text style={styles.infiltratorLockedMetaText}>
                    {nearbyReportersCount} de 3 utilizadores necessários no raio de 300m
                  </Text>
                </View>
              </View>
            </View>
          )
        )}

        {/* Category selection */}
        <Text style={styles.sectionLabel}>TIPO DE OCORRÊNCIA</Text>
        <View style={styles.categoriesGrid}>
          {availableCategories.map((catKey) => {
            const cat = CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            return (
              <TouchableOpacity
                key={catKey}
                style={[
                  styles.categoryCard,
                  isSelected && {
                    borderColor: cat.color,
                    backgroundColor: cat.badgeBg,
                  },
                ]}
                onPress={() => handleSelectCategory(catKey)}
                activeOpacity={0.7}
              >
                <View style={[styles.catIconWrap, { backgroundColor: cat.color }]}>
                  {cat.icon === 'shield-account' ? (
                    <MaterialCommunityIcons name="shield-account" size={16} color="#FFFFFF" />
                  ) : (
                    <Ionicons name={cat.icon as any} size={15} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.catLabel,
                    isSelected && { color: cat.color, fontWeight: '700' },
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
              <Text style={styles.cautionBannerTitle}>USO COM MÁXIMA CAUTELA</Text>
              <Text style={styles.cautionBannerText}>
                Este reporte deve basear-se em factos observados e atos objetivos de provocação, salvaguardando a integridade física de todos os manifestantes e evitando acusações infundadas.
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    backgroundColor: '#1E1B24',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
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
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  infiltratorAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1215',
    borderWidth: 1.5,
    borderColor: '#EF4444',
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
  infiltratorLockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    opacity: 0.85,
  },
  infiltratorLockedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: M3Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infiltratorLockedTitle: {
    color: M3Colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '700',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: M3Shapes.full,
  },
  lockedBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  infiltratorLockedSub: {
    color: M3Colors.outline,
    fontSize: 11,
    lineHeight: 15,
  },
  infiltratorLockedMetaText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
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
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    borderRadius: M3Shapes.medium,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
    width: '48%',
  },
  catIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 12,
    color: M3Colors.onSurface,
    fontWeight: '500',
    flexShrink: 1,
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
