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
            <Ionicons name="shield-checkmark-outline" size={22} color="#383139" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Os Meus Sentinelas</Text>
            <Text style={styles.subtitle}>
              Contactos de confiança que acompanham o seu trajeto se estiver a ser seguido(a)
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#383139" />
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
            <Ionicons name="share-social" size={16} color="#383139" style={{ marginRight: 6 }} />
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
            <Ionicons name="person-circle-outline" size={24} color="#383139" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guestBannerTitle}>Inicie sessão para sincronizar na nuvem</Text>
              <Text style={styles.guestBannerSub}>Ligue uma conta Google para guardar os seus Sentinelas</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#383139" />
          </TouchableOpacity>
        )}

        {/* Add Sentinel Input */}
        <View style={styles.addCard}>
          <Text style={styles.sectionHeader}>ADICIONAR NOVO SENTINELA</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Código (ex: ST-8291) ou email..."
              placeholderTextColor="#7D7582"
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
                <ActivityIndicator size="small" color="#383139" />
              ) : (
                <>
                  <Ionicons name="person-add" size={15} color="#383139" style={{ marginRight: 4 }} />
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
              <ActivityIndicator size="small" color="#f6a3ca" style={{ marginVertical: 20 }} />
            ) : sentinels.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="shield-outline" size={32} color="#7D7582" />
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
                      <Ionicons name="scan" size={14} color="#383139" />
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
                      <Ionicons name="radio" size={14} color="#383139" />
                      <Text style={styles.findFriendBtnText}>Estou Aqui</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleRemove(sentinel)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={17} color="#f6a3ca" />
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
                <Ionicons name="heart-outline" size={32} color="#7D7582" />
                <Text style={styles.emptyTitle}>Ainda não protege ninguém</Text>
                <Text style={styles.emptySub}>
                  Partilhe o seu Código de Sentinela com quem precisa de proteção para ser avisado se estiverem a ser seguidos.
                </Text>
              </View>
            ) : (
              protectedUsers.map((person) => (
                <View key={person.id} style={styles.sentinelCard}>
                  <View style={[styles.sentinelAvatarWrap, { backgroundColor: '#c0efdc' }]}>
                    <Text style={[styles.sentinelAvatarText, { color: '#383139' }]}>
                      {person.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sentinelName}>{person.name}</Text>
                    <Text style={styles.sentinelCodeText}>Protegido(a) por si</Text>
                  </View>
                  <View style={styles.activeBadge}>
                    <Ionicons name="shield-checkmark" size={13} color="#383139" style={{ marginRight: 4 }} />
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
    backgroundColor: '#fffdf7',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    maxHeight: '85%',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 96,
    backgroundColor: '#fffdf7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    paddingBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    color: '#383139',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#7D7582',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 15,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  myCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  myCodeLabel: {
    color: '#7D7582',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  myCodeValue: {
    color: '#383139',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginVertical: 2,
  },
  myCodeSub: {
    color: '#7D7582',
    fontSize: 11,
    fontWeight: '600',
  },
  shareCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6a3ca',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  shareCodeBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9e7a8',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 14,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  guestBannerTitle: {
    color: '#383139',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  guestBannerSub: {
    color: '#48404b',
    fontSize: 11,
    fontWeight: '600',
  },
  addCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    marginBottom: 16,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#f1f2fa',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 14,
    color: '#383139',
    fontSize: 13,
    fontWeight: '700',
    height: 44,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6a3ca',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 16,
    borderRadius: 999,
    height: 44,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: '#383139',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f2fa',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 999,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: '#7D7582',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#383139',
    fontWeight: '900',
  },
  listSection: {
    gap: 8,
  },
  sentinelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 10,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  sentinelAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#ded0f9',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentinelAvatarText: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '900',
  },
  sentinelName: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sentinelCodeText: {
    color: '#7D7582',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c0efdc',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  activeBadgeText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  findFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#c5e5fb',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  findFriendBtnText: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    gap: 8,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyTitle: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptySub: {
    color: '#7D7582',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
  },
});
