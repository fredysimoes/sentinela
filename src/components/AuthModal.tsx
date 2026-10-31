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
              <Ionicons name="shield-checkmark" size={24} color="#383139" />
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
              <Ionicons name="close" size={20} color="#383139" />
            </TouchableOpacity>
          </View>

          {/* Social Login Button (Google) */}
          <M3Pressable
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#383139" />
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
              <Ionicons name="alert-circle" size={16} color="#383139" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Registration Name Field */}
          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>O SEU NOME</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#7D7582" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Maria Santos"
                  placeholderTextColor="#7D7582"
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
              <Ionicons name="mail-outline" size={18} color="#7D7582" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="nome@email.com"
                placeholderTextColor="#7D7582"
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
              <Ionicons name="lock-closed-outline" size={18} color="#7D7582" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#7D7582"
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
              <ActivityIndicator size="small" color="#383139" />
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
                <>Não tem conta? <Text style={{ color: '#f6a3ca', fontWeight: '800' }}>Registar-se</Text></>
              ) : (
                <>Já tem conta? <Text style={{ color: '#f6a3ca', fontWeight: '800' }}>Iniciar Sessão</Text></>
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
    paddingBottom: 28,
    backgroundColor: '#fffdf7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#f1f2fa',
    paddingBottom: 12,
  },
  brandIconWrap: {
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
    fontSize: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnText: {
    color: '#383139',
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
    height: 1.5,
    backgroundColor: '#f1f2fa',
  },
  dividerText: {
    color: '#7D7582',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9e7a8',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 24,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: '#383139',
    fontSize: 12,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#383139',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f2fa',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#383139',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#f6a3ca',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#383139',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: '#383139',
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
    color: '#383139',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f1f2fa',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    marginTop: 12,
  },
  safetyCardText: {
    flex: 1,
    color: '#48404b',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});
