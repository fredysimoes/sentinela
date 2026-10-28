import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { M3Colors, M3Shapes } from '../theme/m3';
import { M3BottomSheetWrapper, M3Pressable } from './M3MotionWrapper';
import { UserProfile } from '../services/authService';
import {
  SentinelContact,
  fetchMySentinels,
  fetchPeopleIProtect,
  addSentinelByCodeOrEmail,
  removeSentinel,
} from '../services/sentinelsService';

interface SentinelsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenFriendFinder?: (friend: { id: string; name: string; code: string }) => void;
  onOpenRadar?: () => void;
}

export const SentinelsModal: React.FC<SentinelsModalProps> = ({
  visible,
  onClose,
  currentUser,
  onOpenAuth,
  onOpenFriendFinder,
  onOpenRadar,
}) => {
  const [activeTab, setActiveTab] = useState<'my_sentinels' | 'protecting'>('my_sentinels');
  const [sentinels, setSentinels] = useState<SentinelContact[]>([]);
  const [protectedUsers, setProtectedUsers] = useState<SentinelContact[]>([]);
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const userId = currentUser?.id || '';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const mySentinels = await fetchMySentinels(userId);
      setSentinels(mySentinels);

      if (userId) {
        const protecting = await fetchPeopleIProtect(userId);
        setProtectedUsers(protecting);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, userId]);

  const handleCopyCode = async () => {
    Haptics.selectionAsync();
    const code = currentUser?.sentinelCode || 'ST-4829';
    try {
      await Share.share({
        message: `Junta-te a mim no Sentinela! O meu código de Sentinela é ${code}. Adiciona-me para acompanhar os meus trajetos em segurança: https://sentinela.app`,
      });
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 3000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAddSentinel = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Código Necessário', 'Introduza o Código de Sentinela (ex: ST-4829) ou o email do contacto.');
      return;
    }

    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    setIsAdding(true);

    const res = await addSentinelByCodeOrEmail(userId, inputCode);
    setIsAdding(false);

    if (res.success && res.sentinel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSentinels((prev) => [res.sentinel!, ...prev.filter((s) => s.id !== res.sentinel!.id)]);
      setInputCode('');
      Alert.alert('Sentinela Adicionado!', res.message);
    } else {
      Alert.alert('Aviso', res.message);
    }
  };

  const handleRemove = (sentinel: SentinelContact) => {
    Alert.alert(
      'Remover Sentinela',
      `Tem a certeza de que pretende remover ${sentinel.name} dos seus Sentinelas? Este contacto deixará de receber os seus alertas de trajeto.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(ImpactFeedbackStyle.Medium);
            await removeSentinel(userId, sentinel.id);
            setSentinels((prev) => prev.filter((s) => s.id !== sentinel.id));
          },
        },
      ]
    );
  };

  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#38BDF8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Os Meus Sentinelas</Text>
            <Text style={styles.subtitle}>
              Contactos de confiança que acompanham o seu trajeto se estiver a ser seguido(a)
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* User's Own Sentinel Code Card */}
        <View style={styles.myCodeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.myCodeLabel}>O SEU CÓDIGO DE SENTINELA</Text>
            <Text style={styles.myCodeValue}>{currentUser?.sentinelCode || 'ST-4829'}</Text>
            <Text style={styles.myCodeSub}>Partilhe com amigos ou familiares para o adicionarem</Text>
          </View>
          <M3Pressable style={styles.shareCodeBtn} onPress={handleCopyCode}>
            <Ionicons name="share-social" size={16} color="#0F172A" style={{ marginRight: 6 }} />
            <Text style={styles.shareCodeBtnText}>Partilhar</Text>
          </M3Pressable>
        </View>

        {/* Not Logged In Notice */}
        {!currentUser && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => {
              onClose();
              onOpenAuth();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="person-circle-outline" size={24} color="#38BDF8" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guestBannerTitle}>Inicie sessão para sincronizar na nuvem</Text>
              <Text style={styles.guestBannerSub}>Ligue uma conta Google para guardar os seus Sentinelas</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#38BDF8" />
          </TouchableOpacity>
        )}

        {/* Add Sentinel Input */}
        <View style={styles.addCard}>
          <Text style={styles.sectionHeader}>ADICIONAR NOVO SENTINELA</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Código (ex: ST-8291) ou email..."
              placeholderTextColor="#64748B"
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <M3Pressable
              style={styles.addBtn}
              onPress={handleAddSentinel}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="person-add" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.addBtnText}>Adicionar</Text>
                </>
              )}
            </M3Pressable>
          </View>
        </View>

        {/* Tabs: Os Meus Sentinelas vs Pessoas que Protejo */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'my_sentinels' && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('my_sentinels');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'my_sentinels' && styles.tabTextActive]}>
              Os Meus Sentinelas ({sentinels.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'protecting' && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('protecting');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'protecting' && styles.tabTextActive]}>
              Pessoas que Protejo ({protectedUsers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: My Sentinels List */}
        {activeTab === 'my_sentinels' && (
          <View style={styles.listSection}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#38BDF8" style={{ marginVertical: 20 }} />
            ) : sentinels.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="shield-outline" size={32} color="#64748B" />
                <Text style={styles.emptyTitle}>Ainda não tem Sentinelas</Text>
                <Text style={styles.emptySub}>
                  Adicione o código de um amigo ou familiar acima para que possam acompanhar os seus alertas em tempo real.
                </Text>
              </View>
            ) : (
              sentinels.map((sentinel) => (
                <View key={sentinel.id} style={styles.sentinelCard}>
                  <View style={styles.sentinelAvatarWrap}>
                    <Text style={styles.sentinelAvatarText}>
                      {sentinel.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sentinelName}>{sentinel.name}</Text>
                    <Text style={styles.sentinelCodeText}>Código: {sentinel.sentinelCode}</Text>
                  </View>
                  {onOpenRadar && (
                    <TouchableOpacity
                      style={styles.findFriendBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onClose();
                        onOpenRadar();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="scan" size={14} color="#10B981" />
                      <Text style={styles.findFriendBtnText}>Radar</Text>
                    </TouchableOpacity>
                  )}
                  {onOpenFriendFinder && !onOpenRadar && (
                    <TouchableOpacity
                      style={styles.findFriendBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onClose();
                        onOpenFriendFinder({
                          id: sentinel.id,
                          name: sentinel.name,
                          code: sentinel.sentinelCode,
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="radio" size={14} color="#10B981" />
                      <Text style={styles.findFriendBtnText}>Estou Aqui</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemove(sentinel)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 2: People I Protect List */}
        {activeTab === 'protecting' && (
          <View style={styles.listSection}>
            {protectedUsers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={32} color="#64748B" />
                <Text style={styles.emptyTitle}>Ainda não protege ninguém</Text>
                <Text style={styles.emptySub}>
                  Partilhe o seu Código de Sentinela com quem precisa de proteção para ser avisado se estiverem a ser seguidos.
                </Text>
              </View>
            ) : (
              protectedUsers.map((person) => (
                <View key={person.id} style={styles.sentinelCard}>
                  <View style={[styles.sentinelAvatarWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.sentinelAvatarText, { color: '#10B981' }]}>
                      {person.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sentinelName}>{person.name}</Text>
                    <Text style={styles.sentinelCodeText}>Protegido(a) por si</Text>
                  </View>
                  <View style={[styles.activeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Ionicons name="shield-checkmark" size={13} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.activeBadgeText}>Sentinela Ativo</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: M3Colors.outlineVariant,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    padding: 6,
  },
  myCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2430',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2F3849',
    marginBottom: 14,
  },
  myCodeLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  myCodeValue: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginVertical: 2,
  },
  myCodeSub: {
    color: '#64748B',
    fontSize: 11,
  },
  shareCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: M3Shapes.full,
  },
  shareCodeBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 14,
  },
  guestBannerTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  guestBannerSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  addCard: {
    backgroundColor: '#1B202A',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2D3444',
    marginBottom: 16,
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#12151B',
    borderWidth: 1,
    borderColor: '#2A303C',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 13,
    height: 44,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 44,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1B202A',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#272E3B',
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  listSection: {
    gap: 8,
  },
  sentinelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2430',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A3140',
    gap: 10,
  },
  sentinelAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentinelAvatarText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  sentinelName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  sentinelCodeText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: M3Shapes.full,
  },
  activeBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  findFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: M3Shapes.full,
  },
  findFriendBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171B23',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#242A36',
    gap: 8,
  },
  emptyTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});
