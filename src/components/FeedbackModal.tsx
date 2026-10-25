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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Obrigado!', result.message, [
        {
          text: 'Concluir',
          onPress: () => {
            handleClose();
          },
        },
      ]);
    } catch (err) {
      console.error('Erro ao submeter feedback:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao submeter o feedback. Tente novamente mais tarde.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="chatbubbles" size={20} color={M3Colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Feedback & Suporte</Text>
                <Text style={styles.headerSubtitle}>
                  Reporte erros, correções no mapa ou sugestões
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={M3Colors.onSurfaceVariant} />
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
                        backgroundColor: `${cat.color}22`,
                        borderColor: cat.color,
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
                      color={isSelected ? cat.color : M3Colors.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
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
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>DETALHES</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva detalhadamente o que observou, onde ocorreu e passos para reproduzir se aplicável..."
              placeholderTextColor="#64748B"
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
              placeholderTextColor="#64748B"
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
                  trackColor={{ false: '#334155', true: M3Colors.primaryContainer }}
                  thumbColor={includeLocation && userLocation ? M3Colors.primary : '#94A3B8'}
                />
              </View>

              <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: '#282A2F', marginTop: 10, paddingTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Incluir dados do dispositivo</Text>
                  <Text style={styles.toggleSubtitle}>
                    {Platform.OS.toUpperCase()} {Platform.Version} (Ajuda a resolver erros)
                  </Text>
                </View>
                <Switch
                  value={includeDevice}
                  onValueChange={setIncludeDevice}
                  trackColor={{ false: '#334155', true: M3Colors.primaryContainer }}
                  thumbColor={includeDevice ? M3Colors.primary : '#94A3B8'}
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
                  <ActivityIndicator size="small" color="#062E6F" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#062E6F" />
                    <Text style={styles.submitBtnText}>Enviar Feedback</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: M3Colors.surfaceContainer,
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#282A2F',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(168, 199, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: M3Shapes.full,
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
  },
  chipText: {
    fontSize: 12,
    color: M3Colors.onSurfaceVariant,
  },
  input: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.medium,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
  },
  togglesCard: {
    backgroundColor: M3Colors.surfaceContainerHigh,
    borderRadius: M3Shapes.medium,
    borderWidth: 1,
    borderColor: M3Colors.outlineVariant,
    padding: 14,
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
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
    paddingHorizontal: 18,
    borderRadius: M3Shapes.full,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: M3Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: M3Shapes.full,
    ...M3Elevation.level2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#062E6F',
    fontSize: 14,
    fontWeight: '700',
  },
});
