import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import Haptics from '../utils/haptics';
import { submitUserFeedback, FeedbackType } from '../services/feedbackService';
import { M3BottomSheetWrapper } from './M3MotionWrapper';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

const FEEDBACK_CATEGORIES: { id: FeedbackType; label: string; icon: any; color: string }[] = [
  { id: 'bug', label: 'Erro na App', icon: 'bug-outline', color: '#EF4444' },
  { id: 'map_correction', label: 'Correção no Mapa', icon: 'map-outline', color: '#38BDF8' },
  { id: 'suggestion', label: 'Melhoria', icon: 'bulb-outline', color: '#F59E0B' },
  { id: 'other', label: 'Outro', icon: 'chatbubble-ellipses-outline', color: '#A855F7' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  userLocation,
}) => {
  const [selectedType, setSelectedType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [includeDevice, setIncludeDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContactInfo('');
    setSelectedType('bug');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor indique um resumo ou assunto do seu feedback.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor descreva o erro, correção ou sugestão.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      const result = await submitUserFeedback({
        type: selectedType,
        title,
        description,
        contactInfo,
        latitude: includeLocation && userLocation ? userLocation.latitude : null,
        longitude: includeLocation && userLocation ? userLocation.longitude : null,
        includeDevice,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Obrigado!', result.message, [
          {
            text: 'Concluir',
            onPress: () => {
              handleClose();
            },
          },
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(result.tableMissing ? 'Tabela Supabase Pendente' : 'Aviso', result.message, [
          {
            text: 'Entendido',
            onPress: () => {
              handleClose();
            },
          },
        ]);
      }
    } catch (err) {
      console.error('Erro ao submeter feedback:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao submeter o feedback. Tente novamente mais tarde.');
      setIsSubmitting(false);
    }
  };

  return (
    <M3BottomSheetWrapper visible={visible} onClose={handleClose} style={styles.sheetContainer}>
      {/* Header */}
      <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="chatbubbles" size={20} color="#383139" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Feedback & Suporte</Text>
                <Text style={styles.headerSubtitle}>
                  Reporte erros, correções no mapa ou sugestões
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#383139" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Category Selector Chips */}
            <Text style={styles.sectionLabel}>TIPO DE RELATÓRIO</Text>
            <View style={styles.chipsRow}>
              {FEEDBACK_CATEGORIES.map((cat) => {
                const isSelected = selectedType === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      isSelected && {
                        backgroundColor: '#ded0f9',
                        borderColor: '#ffffff',
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedType(cat.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={isSelected ? '#383139' : '#7D7582'}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: '#383139', fontWeight: '900' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title / Summary */}
            <Text style={styles.sectionLabel}>ASSUNTO / TÍTULO</Text>
            <TextInput
              style={styles.input}
              placeholder={
                selectedType === 'map_correction'
                  ? 'Ex: Estrada fechada / Nome de rua incorreto'
                  : selectedType === 'bug'
                  ? 'Ex: Erro ao carregar mapa / App bloqueia'
                  : 'Ex: Sugestão para rotas noturnas'
              }
              placeholderTextColor="#7D7582"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>DETALHES</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva detalhadamente o que observou, onde ocorreu e passos para reproduzir se aplicável..."
              placeholderTextColor="#7D7582"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Contact (Optional) */}
            <Text style={styles.sectionLabel}>CONTACTO (OPCIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="Email ou telefone caso deseje receber resposta"
              placeholderTextColor="#7D7582"
              value={contactInfo}
              onChangeText={setContactInfo}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Toggles */}
            <View style={styles.togglesCard}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Incluir coordenadas GPS</Text>
                  <Text style={styles.toggleSubtitle}>
                    {userLocation
                      ? `Lat: ${userLocation.latitude.toFixed(4)}, Lon: ${userLocation.longitude.toFixed(4)}`
                      : 'Sem sinal de localização de momento'}
                  </Text>
                </View>
                <Switch
                  value={includeLocation && !!userLocation}
                  onValueChange={setIncludeLocation}
                  disabled={!userLocation}
                  trackColor={{ false: '#e2dbe6', true: '#c0efdc' }}
                  thumbColor={includeLocation && userLocation ? '#ffffff' : '#b0a7b3'}
                />
              </View>

              <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: '#f1f2fa', marginTop: 10, paddingTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Incluir dados do dispositivo</Text>
                  <Text style={styles.toggleSubtitle}>
                    {Platform.OS.toUpperCase()} {Platform.Version} (Ajuda a resolver erros)
                  </Text>
                </View>
                <Switch
                  value={includeDevice}
                  onValueChange={setIncludeDevice}
                  trackColor={{ false: '#e2dbe6', true: '#c0efdc' }}
                  thumbColor={includeDevice ? '#ffffff' : '#b0a7b3'}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#383139" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#383139" />
                    <Text style={styles.submitBtnText}>Enviar Feedback</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffffff',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    backgroundColor: '#fffdf7',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#383139',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7D7582',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#fffdf7',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#383139',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#383139',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f1f2fa',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: {
    borderRadius: 24,
    minHeight: 90,
  },
  togglesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    padding: 16,
    marginTop: 16,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#383139',
    textTransform: 'uppercase',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#7D7582',
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 22,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelBtnText: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f6a3ca',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#383139',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
