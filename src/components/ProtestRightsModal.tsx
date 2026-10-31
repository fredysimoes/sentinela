import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { M3BottomSheetWrapper } from './M3MotionWrapper';

interface ProtestRightsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProtestRightsModal: React.FC<ProtestRightsModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      {/* Header */}
      <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="book" size={20} color={M3Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Direitos em Manifestações</Text>
                <Text style={styles.headerSubtitle}>
                  Legislação Portuguesa & Constituição da República
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={M3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Article 45 CRP */}
            <View style={styles.lawCard}>
              <View style={styles.lawHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#38BDF8" />
                <Text style={styles.lawTitle}>Direito de Reunião e Manifestação</Text>
              </View>
              <Text style={styles.lawRef}>Artigo 45.º da Constituição da República Portuguesa</Text>
              <Text style={styles.lawText}>
                «1. Os cidadãos têm o direito de se reunir, pacificamente e sem armas, mesmo em lugares abertos ao público, sem necessidade de qualquer autorização.{'\n'}
                2. A todos os cidadãos é reconhecido o direito de manifestação.»
              </Text>
            </View>

            {/* DL 406/74 */}
            <View style={styles.lawCard}>
              <View style={styles.lawHeader}>
                <Ionicons name="newspaper-outline" size={18} color="#F59E0B" />
                <Text style={styles.lawTitle}>Aviso Prévio e Autorizações</Text>
              </View>
              <Text style={styles.lawRef}>Decreto-Lei n.º 406/74 (Regime Jurídico das Manifestações)</Text>
              <Text style={styles.lawText}>
                • A manifestação pacífica não carece de aprovação prévia das autoridades policiais.{'\n'}
                • Apenas requer aviso prévio com 2 dias úteis de antecedência à Câmara Municipal.{'\n'}
                • Nenhuma autoridade pode proibir manifestações pacíficas que respeitem a lei e a segurança comum.
              </Text>
            </View>

            {/* Identification Rights */}
            <View style={styles.lawCard}>
              <View style={styles.lawHeader}>
                <Ionicons name="card-outline" size={18} color="#A855F7" />
                <Text style={styles.lawTitle}>Identificação Policial e Retenção</Text>
              </View>
              <Text style={styles.lawRef}>Artigo 250.º do Código de Processo Penal</Text>
              <Text style={styles.lawText}>
                • Os agentes de autoridade devem identificar-se mediante crachá, número de identificação ou cartão profissional.{'\n'}
                • O cidadão identifica-se exibindo Cartão de Cidadão, Passaporte ou Carta de Condução.{'\n'}
                • A condução à esquadra só pode ocorrer na impossibilidade de identificação no local.{'\n'}
                • A retenção para identificação tem o limite máximo absoluto legal de 6 horas.{'\n'}
                • Tem direito imediato a contactar pessoa de confiança ou advogado para comunicar onde se encontra.
              </Text>
            </View>

            {/* Filming Police in Public */}
            <View style={styles.lawCard}>
              <View style={styles.lawHeader}>
                <Ionicons name="videocam-outline" size={18} color="#10B981" />
                <Text style={styles.lawTitle}>Direito a Filmar e Fotografar</Text>
              </View>
              <Text style={styles.lawRef}>Espaço Público e Exercício de Funções Oficiais</Text>
              <Text style={styles.lawText}>
                • É permitido a qualquer cidadão ou jornalista fotografar ou filmar a atuação de agentes da autoridade em espaço público no exercício das suas funções.{'\n'}
                • O telemóvel ou câmara não pode ser apreendido sem mandado judicial nem as gravações apagadas.{'\n'}
                • Não deve obstruir fisicamente a circulação ou ação dos agentes durante a gravação.
              </Text>
            </View>

            {/* In Case of Detention */}
            <View style={styles.lawCard}>
              <View style={styles.lawHeader}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.lawTitle}>Em Caso de Detenção</Text>
              </View>
              <Text style={styles.lawRef}>Artigos 61.º e 64.º do Código de Processo Penal</Text>
              <Text style={styles.lawText}>
                1. Tem direito a conhecer de imediato os motivos exatos da detenção.{'\n'}
                2. Direito ao silêncio: não é obrigado a responder a perguntas sobre os factos sem a presença de um advogado.{'\n'}
                3. Direito a telefonar a uma pessoa de confiança e a um advogado.{'\n'}
                4. Obrigatoriedade de ser apresentado a um juiz de instrução no prazo máximo de 48 horas.
              </Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Entendido</Text>
            </TouchableOpacity>
          </ScrollView>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    backgroundColor: '#f5f4ee',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#f5f4ee',
  },
  lawCard: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  lawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lawTitle: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lawRef: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    marginBottom: 8,
  },
  lawText: {
    color: '#000000',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: '#ff0000',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
