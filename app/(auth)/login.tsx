import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Switch,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { storage } from '../../src/utils/storage';
import {
  getEnvironmentOptions, getActiveEnvironmentId,
  setActiveEnvironment, type AppEnvironmentId,
} from '../../src/api/config';
import { colors, spacing, typography, radius, gradients, shadows } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [envId, setEnvId] = useState<AppEnvironmentId>(getActiveEnvironmentId());
  const [showEnvPicker, setShowEnvPicker] = useState(false);

  const environments = getEnvironmentOptions();

  // On mount: check for saved credentials and auto-fill / auto-login
  useEffect(() => {
    (async () => {
      const remembered = await storage.getRememberMe();
      setRememberMe(remembered);
      if (remembered) {
        const creds = await storage.getSavedCredentials();
        if (creds) {
          setUsername(creds.username);
          setPassword(creds.password);
        }
      }
      setAutoLoginAttempted(true);
    })();
  }, []);

  const handleSelectEnv = async (id: AppEnvironmentId) => {
    await setActiveEnvironment(id);
    setEnvId(id);
    setShowEnvPicker(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError(t('auth.loginFailed') || 'Please enter username and password');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(username.trim(), password, rememberMe);
      router.replace('/(app)/dashboard' as any);
    } catch (err: any) {
      const msg = err?.response?.data?.problems?.[0]?.messageDetails
        || err?.response?.data?.problems?.[0]?.message
        || t('auth.loginFailed') || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!autoLoginAttempted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#0a0a0a']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons name="wallet" size={36} color={colors.textPrimary} />
            </View>
            <Text style={styles.title}>WinstantPay</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle') || 'Sign in to your wallet'}</Text>
          </View>

          {/* Environment selector */}
          <Pressable style={styles.envButton} onPress={() => setShowEnvPicker(true)}>
            <Text style={styles.envLabel}>{t('auth.environment') || 'Environment'}</Text>
            <Text style={styles.envValue}>{envId} ▾</Text>
          </Pressable>

          <View style={styles.form}>
            {/* Username */}
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.enterUsername') || 'Username'}
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.enterPassword') || 'Password'}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {/* Remember Me */}
            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>{t('auth.rememberMe') || 'Remember Me'}</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={rememberMe ? colors.primary : colors.textMuted}
              />
            </View>

            {error !== '' && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, ...([shadows.button])]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color={colors.textPrimary} />
                : <Text style={styles.buttonText}>{t('auth.signIn') || 'Sign In'}</Text>
              }
            </Pressable>

            <Pressable style={styles.signupLink} onPress={() => router.push('/(auth)/signup' as any)}>
              <Text style={styles.signupLinkText}>
                {t('auth.newUser') || "Don't have an account?"}{' '}
                <Text style={styles.signupLinkBold}>{t('auth.createAccount') || 'Sign up'}</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Environment picker modal */}
      <Modal visible={showEnvPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowEnvPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('auth.environment') || 'Select Environment'}</Text>
            <FlatList
              data={environments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.envOption, item.id === envId && styles.envOptionActive]}
                  onPress={() => handleSelectEnv(item.id)}
                >
                  <Text style={[styles.envOptionText, item.id === envId && styles.envOptionTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xl },

  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },

  envButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  envLabel: { fontSize: typography.caption, color: colors.textMuted },
  envValue: { fontSize: typography.small, color: colors.primary, fontWeight: '600' },

  form: { gap: spacing.md },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1, paddingVertical: spacing.md,
    color: colors.textPrimary, fontSize: typography.body,
  },
  eyeBtn: { padding: spacing.sm },

  rememberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  rememberText: { fontSize: typography.small, color: colors.textSecondary },

  error: { color: colors.danger, fontSize: typography.caption, textAlign: 'center' },

  button: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },

  signupLink: { alignItems: 'center', marginTop: spacing.md },
  signupLinkText: { fontSize: typography.small, color: colors.textSecondary },
  signupLinkBold: { color: colors.primary, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  modalTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  envOption: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  envOptionActive: { backgroundColor: colors.primary + '22' },
  envOptionText: { fontSize: typography.body, color: colors.textSecondary },
  envOptionTextActive: { color: colors.primary, fontWeight: '600' },
});
