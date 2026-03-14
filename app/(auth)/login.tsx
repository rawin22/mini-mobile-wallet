import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../src/hooks/useAuth';
import {
  getEnvironmentOptions, getActiveEnvironmentId,
  setActiveEnvironment, type AppEnvironmentId,
} from '../../src/api/config';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [envId, setEnvId] = useState<AppEnvironmentId>(getActiveEnvironmentId());
  const [showEnvPicker, setShowEnvPicker] = useState(false);

  const environments = getEnvironmentOptions();

  const handleSelectEnv = async (id: AppEnvironmentId) => {
    await setActiveEnvironment(id);
    setEnvId(id);
    setShowEnvPicker(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      const msg = err?.response?.data?.problems?.[0]?.messageDetails
        || err?.response?.data?.problems?.[0]?.message
        || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>WinstantPay</Text>
        <Text style={styles.subtitle}>Sign in to your wallet</Text>

        {/* Environment selector */}
        <Pressable style={styles.envButton} onPress={() => setShowEnvPicker(true)}>
          <Text style={styles.envLabel}>Environment</Text>
          <Text style={styles.envValue}>{envId} ▾</Text>
        </Pressable>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
            </Pressable>
          </View>

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={handleLogin} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color={colors.textPrimary} />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </Pressable>
        </View>
      </View>

      {/* Environment picker modal */}
      <Modal visible={showEnvPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowEnvPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Environment</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  envButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  envLabel: { fontSize: typography.caption, color: colors.textMuted },
  envValue: { fontSize: typography.small, color: colors.primary, fontWeight: '600' },
  form: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    color: colors.textPrimary, fontSize: typography.body,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: {
    flex: 1,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    color: colors.textPrimary, fontSize: typography.body,
  },
  eyeBtn: { padding: spacing.sm, marginLeft: spacing.xs },
  eyeText: { fontSize: 18 },
  error: { color: colors.danger, fontSize: typography.caption, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  modalTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  envOption: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  envOptionActive: { backgroundColor: colors.primary + '22' },
  envOptionText: { fontSize: typography.body, color: colors.textSecondary },
  envOptionTextActive: { color: colors.primary, fontWeight: '600' },
});
