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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics from '../utils/haptics';
import { Incident, IncidentCategory, UserLocation } from '../types';
import { CATEGORIES } from '../constants/categories';
import { M3Colors, M3Shapes, M3Elevation, M3Typography } from '../theme/m3';
import { M3BottomSheetWrapper } from './M3MotionWrapper';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (incident: Omit<Incident, 'id' | 'createdAt' | 'confirmations' | 'dismissals'>) => void;
  currentLocation: UserLocation | null;
  targetCoordinate: { latitude: number; longitude: number } | null;
  initialCategory?: IncidentCategory;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
  currentLocation,
  targetCoordinate,
  initialCategory = 'dark_area',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    if (visible && initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [visible, initialCategory]);

  const reportCoord = targetCoordinate || {
    latitude: currentLocation?.latitude ?? 38.7223,
    longitude: currentLocation?.longitude ?? -9.1393,
  };

  const handleSelectCategory = (cat: IncidentCategory) => {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
  };

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const meta = CATEGORIES[selectedCategory];
    const finalTitle = title.trim() || meta.label;

    onSubmit({
      category: selectedCategory,
      title: finalTitle,
      description: description.trim() || meta.description,
      latitude: reportCoord.latitude,
      longitude: reportCoord.longitude,
      severity: meta.severity,
    });

    setTitle('');
    setDescription('');
    onClose();
  };

  const meta = CATEGORIES[selectedCategory];

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
            {/* Category selection */}
            <Text style={styles.sectionLabel}>TIPO DE OCORRÊNCIA</Text>
            <View style={styles.categoriesGrid}>
              {(Object.keys(CATEGORIES) as IncidentCategory[]).map((catKey) => {
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
                      <Ionicons name={cat.icon as any} size={18} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[
                        styles.catLabel,
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected category preview message */}
            <View style={[styles.metaNotice, { borderLeftColor: meta.color }]}>
              <Text style={styles.metaNoticeText}>{meta.description}</Text>
            </View>

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
              placeholder="Ex: Evitar passar pelo lado esquerdo da rua, muito escuro e sem saída..."
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
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Publicar Alerta Comunitário</Text>
            </TouchableOpacity>
          </ScrollView>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
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
