import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Haptics, { ImpactFeedbackStyle } from '../utils/haptics';
import { M3Colors, M3Shapes, M3Elevation } from '../theme/m3';
import { M3BottomSheetWrapper, M3Pressable } from './M3MotionWrapper';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, UserProfile } from '../services/authService';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    setIsGoogleLoading(true);
    setErrorMessage('');

    try {
      const res = await signInWithGoogle();
      if (res.profile) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess(res.profile);
        onClose();
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao autenticar com a Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor preencha o email e a palavra-passe.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Por favor introduza o seu nome.');
      return;
    }

    Haptics.impactAsync(ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (mode === 'login') {
        const res = await signInWithEmail(email, password);
        if (res.profile) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess(res.profile);
          onClose();
        } else {
          setErrorMessage(res.error || 'Credenciais inválidas.');
        }
      } else {
        const res = await signUpWithEmail(email, password, name);
        if (res.profile) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Bem-vindo ao Sentinela!', res.message || 'Conta criada com sucesso.');
          onSuccess(res.profile);
          onClose();
        } else {
          setErrorMessage(res.error || 'Falha ao criar conta.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <M3BottomSheetWrapper visible={visible} onClose={onClose} style={styles.sheetContainer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {mode === 'login' ? 'Iniciar Sessão' : 'Criar Conta Gratuita'}
              </Text>
              <Text style={styles.subtitle}>
                Ative o seu Círculo de Sentinelas e o rastro de proteção
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Social Login Button (Google) */}
          <M3Pressable
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                <Text style={styles.googleBtnText}>Continuar com o Google</Text>
              </>
            )}
          </M3Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou com email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Error Message banner */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Registration Name Field */}
          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>O SEU NOME</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Maria Santos"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="nome@email.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PALAVRA-PASSE</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Submit Button */}
          <M3Pressable
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'Entrar no Sentinela' : 'Criar a Minha Conta'}
              </Text>
            )}
          </M3Pressable>

          {/* Toggle Mode */}
          <TouchableOpacity
            style={styles.toggleModeBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setMode(mode === 'login' ? 'register' : 'login');
              setErrorMessage('');
            }}
          >
            <Text style={styles.toggleModeText}>
              {mode === 'login' ? (
                <>Não tem conta? <Text style={{ color: '#38BDF8', fontWeight: '700' }}>Registar-se</Text></>
              ) : (
                <>Já tem conta? <Text style={{ color: '#38BDF8', fontWeight: '700' }}>Iniciar Sessão</Text></>
              )}
            </Text>
          </TouchableOpacity>

          {/* Informational Safety Note */}
          <View style={styles.safetyCard}>
            <Ionicons name="lock-closed" size={14} color="#10B981" style={{ marginTop: 2, marginRight: 6 }} />
            <Text style={styles.safetyCardText}>
              A sua conta permite associar os seus Sentinelas (familiares e amigos de confiança) para poderem acompanhar trajetos privados em tempo real.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </M3BottomSheetWrapper>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#f5f4ee',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#000000',
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    backgroundColor: '#f5f4ee',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
    paddingBottom: 12,
  },
  brandIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 0,
    backgroundColor: '#ffff00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  title: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  googleBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#000000',
  },
  dividerText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff0000',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#ff0000',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleModeBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleModeText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8e8e8',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    padding: 12,
    marginTop: 12,
  },
  safetyCardText: {
    flex: 1,
    color: '#000000',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
