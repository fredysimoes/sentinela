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
                  trackColor={{ false: '#e2dbe6', true: '#f6a3ca' }}
                  thumbColor={localSettings.enabled ? '#ffffff' : '#b0a7b3'}
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
                  trackColor={{ false: '#e2dbe6', true: '#c0efdc' }}
                  thumbColor={localSettings.backgroundTracking ? '#ffffff' : '#b0a7b3'}
                />
              </View>
            </View>

            {/* Protest Mode Card */}
            <View style={[styles.sectionCard, localSettings.protestMode && styles.protestCardActive]}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <View style={styles.badgeRow}>
                    <View style={styles.protestIconPill}>
                      <Ionicons name="megaphone" size={14} color="#383139" />
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
                  trackColor={{ false: '#e2dbe6', true: '#f9e7a8' }}
                  thumbColor={localSettings.protestMode ? '#ffffff' : '#b0a7b3'}
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
                        trackColor={{ false: '#e2dbe6', true: meta.color }}
                        thumbColor={isEnabled ? '#ffffff' : '#b0a7b3'}
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
    backgroundColor: 'rgba(56, 49, 57, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: '88%',
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    backgroundColor: '#fffdf7',
    alignItems: 'center',
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d6cfcf',
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
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    ...M3Typography.titleMedium,
    color: '#383139',
    fontWeight: '900',
    fontSize: 18,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    ...M3Typography.bodySmall,
    color: '#7D7582',
    marginTop: 6,
    width: '100%',
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  userAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#f6a3ca',
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
  userAvatarText: {
    color: '#383139',
    fontSize: 16,
    fontWeight: '900',
  },
  userNameText: {
    color: '#383139',
    fontSize: 15,
    fontWeight: '900',
  },
  userEmailText: {
    color: '#7D7582',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  userCodeBadge: {
    backgroundColor: '#ded0f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  userCodeText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '900',
  },
  openSentinelsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c5e5fb',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  openSentinelsBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  signOutBtn: {
    width: 40,
    height: 40,
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
    backgroundColor: '#c0efdc',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  livePillText: {
    color: '#383139',
    fontSize: 10,
    fontWeight: '900',
  },
  settingTitle: {
    ...M3Typography.titleSmall,
    color: '#383139',
    fontWeight: '900',
    fontSize: 15,
  },
  settingDesc: {
    ...M3Typography.bodySmall,
    color: '#7D7582',
    marginTop: 3,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionHeaderTitle: {
    ...M3Typography.titleSmall,
    color: '#383139',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  radiusPillSelected: {
    backgroundColor: '#ded0f9',
    borderColor: '#ffffff',
    borderWidth: 1.5,
  },
  radiusPillText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '700',
  },
  radiusPillTextSelected: {
    color: '#383139',
    fontWeight: '900',
  },
  categoryList: {
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2fa',
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  catLabel: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '800',
  },
  catDescription: {
    color: '#7D7582',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  feedbackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    padding: 12,
    marginTop: 12,
    gap: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  feedbackIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackActionTitle: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  feedbackActionSub: {
    color: '#7D7582',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 92 : 90,
    backgroundColor: '#fffdf7',
    borderTopWidth: 1.5,
    borderTopColor: '#f1f2fa',
  },
  saveBtn: {
    backgroundColor: '#f6a3ca',
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
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
  saveBtnText: {
    color: '#383139',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  protestCardActive: {
    borderColor: '#ffffff',
    backgroundColor: '#fef7e0',
  },
  protestTitleActive: {
    color: '#383139',
  },
  protestIconPill: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#f9e7a8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  protestActiveBadge: {
    backgroundColor: '#f9e7a8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 6,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  protestActiveBadgeText: {
    color: '#383139',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  protestDetailsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f2fa',
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
    color: '#48404b',
    fontSize: 12,
    fontWeight: '500',
  },
  protestRightsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 10,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  protestRightsBtnText: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  exitProtestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6a3ca',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  exitProtestBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '700',
  },
});
