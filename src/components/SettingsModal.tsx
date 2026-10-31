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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NotificationSettings, IncidentCategory } from '../types';
import { CATEGORIES } from '../constants/categories';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { M3BottomSheetWrapper } from './M3MotionWrapper';
import { UserProfile } from '../services/authService';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onSaveSettings: (settings: NotificationSettings) => void;
  onOpenFeedback?: () => void;
  onOpenProtestRights?: () => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenSentinels?: () => void;
  onSignOut?: () => void;
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
  onOpenProtestRights,
  currentUser,
  onOpenAuth,
  onOpenSentinels,
  onSignOut,
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

  const toggleProtestMode = (val: boolean) => {
    Haptics.notificationAsync(
      val ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    const updated = { ...localSettings, protestMode: val };
    setLocalSettings(updated);
    onSaveSettings(updated);
  };

  const handleDismiss = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const handleExitProtestMode = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = { ...localSettings, protestMode: false };
    setLocalSettings(updated);
    onSaveSettings(updated);
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
    <M3BottomSheetWrapper
      visible={visible}
      onClose={handleDismiss}
      style={styles.sheetContainer}
    >
      {/* Header */}
      <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="options-outline" size={20} color="#10B981" />
                </View>
                <Text style={styles.headerTitle}>Notificações & Perigos</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleDismiss}
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
            {/* Account & Sentinels Circle Card */}
            <View style={[styles.sectionCard, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
              {currentUser ? (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <View style={styles.userAvatarWrap}>
                      <Text style={styles.userAvatarText}>
                        {currentUser.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userNameText}>{currentUser.name}</Text>
                      <Text style={styles.userEmailText}>{currentUser.email || 'Conta Sentinela'}</Text>
                    </View>
                    <View style={styles.userCodeBadge}>
                      <Text style={styles.userCodeText}>{currentUser.sentinelCode}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {onOpenSentinels && (
                      <TouchableOpacity
                        style={styles.openSentinelsBtn}
                        onPress={() => {
                          handleDismiss();
                          onOpenSentinels();
                        }}
                      >
                        <Ionicons name="shield-checkmark" size={15} color="#06140E" style={{ marginRight: 6 }} />
                        <Text style={styles.openSentinelsBtnText}>Os Meus Sentinelas</Text>
                      </TouchableOpacity>
                    )}

                    {onSignOut && (
                      <TouchableOpacity
                        style={styles.signOutBtn}
                        onPress={() => {
                          handleDismiss();
                          onSignOut();
                        }}
                      >
                        <Ionicons name="log-out-outline" size={15} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Ionicons name="person-circle" size={28} color="#0284C7" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userNameText}>Aceder à Sua Conta</Text>
                      <Text style={styles.userEmailText}>Inicie sessão para gerir os seus Sentinelas</Text>
                    </View>
                  </View>

                  {onOpenAuth && (
                    <TouchableOpacity
                      style={styles.openSentinelsBtn}
                      onPress={() => {
                        handleDismiss();
                        onOpenAuth();
                      }}
                    >
                      <Ionicons name="log-in-outline" size={16} color="#06140E" style={{ marginRight: 6 }} />
                      <Text style={styles.openSentinelsBtnText}>Entrar com Google / Email</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

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

            {/* Protest Mode Card */}
            <View style={[styles.sectionCard, localSettings.protestMode && styles.protestCardActive]}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <View style={styles.badgeRow}>
                    <View style={styles.protestIconPill}>
                      <Ionicons name="megaphone" size={14} color="#F59E0B" />
                    </View>
                    <Text style={[styles.settingTitle, localSettings.protestMode && styles.protestTitleActive]}>
                      Modo Protesto & Manifestação
                    </Text>
                    {localSettings.protestMode && (
                      <View style={styles.protestActiveBadge}>
                        <Text style={styles.protestActiveBadgeText}>ATIVO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.settingDesc}>
                    Ferramentas dedicadas para manifestações pacíficas: lanterna de alta visibilidade, sinalizador de presença policial, strobe de localização e botão "Estou Bem" no SOS.
                  </Text>
                </View>
                <Switch
                  value={!!localSettings.protestMode}
                  onValueChange={toggleProtestMode}
                  trackColor={{ false: '#333842', true: '#F59E0B' }}
                  thumbColor={localSettings.protestMode ? '#FFFFFF' : '#94A3B8'}
                />
              </View>

              {/* Extended Protest Tools & Info when Active */}
              {localSettings.protestMode && (
                <View style={styles.protestDetailsBox}>
                  <View style={styles.protestFeatureList}>
                    <View style={styles.protestFeatureItem}>
                      <Ionicons name="flashlight" size={14} color="#F59E0B" />
                      <Text style={styles.protestFeatureText}>Lanterna contínua e Modo Strobe no ecrã</Text>
                    </View>
                    <View style={styles.protestFeatureItem}>
                      <Ionicons name="shield" size={14} color="#3B82F6" />
                      <Text style={styles.protestFeatureText}>Sinalização rápida de presença policial no mapa</Text>
                    </View>
                    <View style={styles.protestFeatureItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.protestFeatureText}>Botão "Estou Bem" com GPS nos alertas de SOS</Text>
                    </View>
                  </View>

                  {/* Constitutional & Legal Rights in PT Law */}
                  {onOpenProtestRights && (
                    <TouchableOpacity
                      style={styles.protestRightsBtn}
                      onPress={() => {
                        Haptics.selectionAsync();
                        onClose();
                        onOpenProtestRights();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="book-outline" size={16} color="#F59E0B" />
                      <Text style={styles.protestRightsBtnText}>
                        Direitos Legais em Manifestações (Lei Portuguesa)
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
                    </TouchableOpacity>
                  )}

                  {/* Exit Protest Mode Button */}
                  <TouchableOpacity
                    style={styles.exitProtestBtn}
                    onPress={handleExitProtestMode}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.exitProtestBtnText}>Sair do Modo de Protesto</Text>
                  </TouchableOpacity>
                </View>
              )}
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
                        <MaterialCommunityIcons
                          name={(meta.mciIcon || 'alert-circle') as any}
                          size={19}
                          color={meta.color}
                        />
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
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: '88%',
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    ...M3Elevation.level4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    backgroundColor: '#f5f4ee',
    alignItems: 'center',
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 0,
    backgroundColor: '#000000',
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
    width: 38,
    height: 38,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    ...M3Typography.titleMedium,
    color: '#000000',
    fontWeight: '900',
    fontSize: 18,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    ...M3Typography.bodySmall,
    color: '#000000',
    marginTop: 6,
    width: '100%',
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 16,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#000000',
    ...M3Elevation.level2,
  },
  userAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },
  userNameText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  userEmailText: {
    color: '#000000',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  userCodeBadge: {
    backgroundColor: '#ffff00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  userCodeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  openSentinelsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0000ff',
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 10,
    borderRadius: 0,
    ...M3Elevation.level1,
  },
  openSentinelsBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#ffff00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 0,
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  livePillText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  settingTitle: {
    ...M3Typography.titleSmall,
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
  },
  settingDesc: {
    ...M3Typography.bodySmall,
    color: '#000000',
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionHeaderTitle: {
    ...M3Typography.titleSmall,
    color: '#000000',
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 4,
    textTransform: 'uppercase',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    ...M3Elevation.level1,
  },
  radiusPillSelected: {
    backgroundColor: '#ffff00',
    borderColor: '#000000',
    borderWidth: 3,
  },
  radiusPillText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  radiusPillTextSelected: {
    color: '#000000',
    fontWeight: '900',
  },
  categoryList: {
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  catLabel: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  catDescription: {
    color: '#000000',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  feedbackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 12,
    marginTop: 12,
    gap: 12,
    ...M3Elevation.level1,
  },
  feedbackIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackActionTitle: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  feedbackActionSub: {
    color: '#000000',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    backgroundColor: '#f5f4ee',
    borderTopWidth: 3,
    borderTopColor: '#000000',
  },
  saveBtn: {
    backgroundColor: '#ff0000',
    height: 52,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000000',
    ...M3Elevation.level2,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  protestCardActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  protestTitleActive: {
    color: '#B45309',
  },
  protestIconPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  protestActiveBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  protestActiveBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  protestDetailsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  protestFeatureList: {
    gap: 8,
    marginBottom: 14,
  },
  protestFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  protestFeatureText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  protestRightsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
    ...M3Elevation.level1,
  },
  protestRightsBtnText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  exitProtestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
    ...M3Elevation.level1,
  },
  exitProtestBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
