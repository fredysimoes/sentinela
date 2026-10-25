import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationSettings, IncidentCategory } from '../types';
import { CATEGORIES } from '../constants/categories';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onSaveSettings: (settings: NotificationSettings) => void;
  onOpenFeedback?: () => void;
}

const RADIUS_OPTIONS = [
  { label: '100m', value: 100 },
  { label: '300m (Recomendado)', value: 300 },
  { label: '500m', value: 500 },
  { label: '1 km', value: 1000 },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  settings,
  onSaveSettings,
  onOpenFeedback,
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, visible]);

  const toggleMasterEnabled = (val: boolean) => {
    Haptics.impactAsync(ImpactFeedbackStyle.Light);
    setLocalSettings((prev) => ({ ...prev, enabled: val }));
  };

  const toggleBackgroundTracking = (val: boolean) => {
    Haptics.impactAsync(ImpactFeedbackStyle.Light);
    setLocalSettings((prev) => ({ ...prev, backgroundTracking: val }));
  };

  const setRadius = (radiusMeters: number) => {
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    setLocalSettings((prev) => ({ ...prev, radiusMeters }));
  };

  const toggleCategory = (cat: IncidentCategory, val: boolean) => {
    Haptics.impactAsync(ImpactFeedbackStyle.Light);
    setLocalSettings((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [cat]: val,
      },
    }));
  };

  const handleSave = () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    onSaveSettings(localSettings);
    onClose();
  };

  // Only hazard categories for notifications (exclude safe_haven by default unless desired)
  const notificationCategories = (Object.keys(CATEGORIES) as IncidentCategory[]).filter(
    (cat) => cat !== 'safe_haven'
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="notifications" size={20} color="#38BDF8" />
                </View>
                <Text style={styles.headerTitle}>Notificações & Perigos</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={M3Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              Configure os alertas de proximidade e as categorias que deseja monitorizar.
            </Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Master Switch Section */}
            <View style={styles.sectionCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.settingTitle}>Alertas de Proximidade</Text>
                  <Text style={styles.settingDesc}>
                    Receber alertas push quando estiver próximo de zonas de perigo reportadas.
                  </Text>
                </View>
                <Switch
                  value={localSettings.enabled}
                  onValueChange={toggleMasterEnabled}
                  trackColor={{ false: '#333842', true: '#0284C7' }}
                  thumbColor={localSettings.enabled ? '#FFFFFF' : '#94A3B8'}
                />
              </View>
            </View>

            {/* Background Tracking Card */}
            <View style={styles.sectionCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.settingTitle}>Monitorização em Segundo Plano</Text>
                    <View style={styles.livePill}>
                      <Text style={styles.livePillText}>24/7</Text>
                    </View>
                  </View>
                  <Text style={styles.settingDesc}>
                    Continua a proteger e a enviar notificações mesmo quando a app está minimizada ou o ecrã bloqueado.
                  </Text>
                </View>
                <Switch
                  value={localSettings.backgroundTracking}
                  onValueChange={toggleBackgroundTracking}
                  disabled={!localSettings.enabled}
                  trackColor={{ false: '#333842', true: '#10B981' }}
                  thumbColor={localSettings.backgroundTracking ? '#FFFFFF' : '#94A3B8'}
                />
              </View>
            </View>

            {/* Radius Selector */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>Raio de Deteção</Text>
              <Text style={styles.settingDesc}>
                Distância a que será notificado ao aproximar-se de uma ocorrência:
              </Text>
              <View style={styles.radiusPillsGrid}>
                {RADIUS_OPTIONS.map((opt) => {
                  const isSelected = localSettings.radiusMeters === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.radiusPill,
                        isSelected && styles.radiusPillSelected,
                      ]}
                      onPress={() => setRadius(opt.value)}
                      activeOpacity={0.7}
                      disabled={!localSettings.enabled}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      )}
                      <Text
                        style={[
                          styles.radiusPillText,
                          isSelected && styles.radiusPillTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Category Preferences */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>Categorias a Notificar</Text>
              <Text style={styles.settingDesc}>
                Escolha que tipos de ocorrências disparam alerta no seu telemóvel:
              </Text>

              <View style={styles.categoryList}>
                {notificationCategories.map((catKey) => {
                  const meta = CATEGORIES[catKey];
                  const isEnabled = localSettings.categories[catKey] !== false;
                  return (
                    <View key={catKey} style={styles.categoryRow}>
                      <View style={[styles.catIconWrap, { backgroundColor: meta.badgeBg }]}>
                        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                      </View>
                      <View style={styles.catTextWrap}>
                        <Text style={styles.catLabel}>{meta.label}</Text>
                        <Text style={styles.catDescription} numberOfLines={1}>
                          {meta.description}
                        </Text>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={(val) => toggleCategory(catKey, val)}
                        disabled={!localSettings.enabled}
                        trackColor={{ false: '#333842', true: meta.color }}
                        thumbColor={isEnabled ? '#FFFFFF' : '#94A3B8'}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Support, Bug Report & Map Corrections */}
            {onOpenFeedback && (
              <View style={[styles.sectionCard, { marginTop: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="chatbubbles" size={18} color="#A8C7FA" />
                  <Text style={styles.sectionHeaderTitle}>Suporte & Melhorias</Text>
                </View>
                <Text style={styles.settingDesc}>
                  Encontrou algum problema na app ou quer sugerir correções no mapa?
                </Text>

                <TouchableOpacity
                  style={styles.feedbackActionBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                    onOpenFeedback();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.feedbackIconBadge}>
                    <Ionicons name="construct" size={18} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedbackActionTitle}>Reportar Erro / Feedback</Text>
                    <Text style={styles.feedbackActionSub}>
                      Erros na app, sugestões ou correções no mapa
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#8E9099" />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Save Action */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={20} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Guardar Configurações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#111318',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#282A2F',
    ...M3Elevation.level4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1D2024',
    alignItems: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3E4249',
    marginBottom: 12,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    ...M3Typography.titleMedium,
    color: '#E2E2E5',
    fontWeight: '800',
    fontSize: 18,
  },
  headerSubtitle: {
    ...M3Typography.bodySmall,
    color: '#94A3B8',
    marginTop: 6,
    width: '100%',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1D2024',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#1D2024',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#282A2F',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelWrap: {
    flex: 1,
    marginRight: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  livePillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  settingTitle: {
    ...M3Typography.titleSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  settingDesc: {
    ...M3Typography.bodySmall,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 18,
  },
  sectionHeaderTitle: {
    ...M3Typography.titleSmall,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  radiusPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  radiusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282A2F',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#373A42',
  },
  radiusPillSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  radiusPillText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  radiusPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categoryList: {
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#282A2F',
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  catLabel: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
  },
  catDescription: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  feedbackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16191E',
    borderWidth: 1,
    borderColor: '#2D323B',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
  feedbackIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackActionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackActionSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#111318',
    borderTopWidth: 1,
    borderTopColor: '#1D2024',
  },
  saveBtn: {
    backgroundColor: '#38BDF8',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...M3Elevation.level2,
  },
  saveBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
});
