import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { signupService, SignupError, extractSignupApiMessage } from '../../src/api/signup.service';
import {
  getEnvironmentOptions, getActiveEnvironmentId,
  setActiveEnvironment, type AppEnvironmentId,
} from '../../src/api/config';
import type { NotaryNode } from '../../src/types/signup.types';
import { colors, spacing, typography, radius } from '../../src/theme';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  cellphone: string;
  username: string;
  password: string;
  confirmPassword: string;
  referredBy: string;
  notaryNodeBranchId: string;
}

const empty: FormState = {
  firstName: '', lastName: '', email: '', cellphone: '',
  username: '', password: '', confirmPassword: '',
  referredBy: '', notaryNodeBranchId: '',
};

export default function SignupScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState<FormState>(empty);
  const [envId, setEnvId] = useState<AppEnvironmentId>(getActiveEnvironmentId());
  const [notaryNodes, setNotaryNodes] = useState<NotaryNode[]>([]);
  const [passwordRegEx, setPasswordRegEx] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [isReferredByRequired, setIsReferredByRequired] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNotaryPicker, setShowNotaryPicker] = useState(false);
  const [showEnvPicker, setShowEnvPicker] = useState(false);

  const environments = getEnvironmentOptions();

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Load notary nodes + password rules for the selected environment
  useEffect(() => {
    setConfigLoading(true);
    setError('');
    signupService.loadSignupFormConfig()
      .then((cfg) => {
        setNotaryNodes(cfg.notaryNodes);
        setPasswordRegEx(cfg.passwordRegEx ?? '');
        setPasswordHint(cfg.passwordRegExMessage ?? '');
        setIsReferredByRequired(cfg.isReferredByRequired ?? false);
        const defaultNode = cfg.notaryNodes.find((n) => n.isDefault) ?? cfg.notaryNodes[0];
        if (defaultNode) setForm((prev) => ({ ...prev, notaryNodeBranchId: defaultNode.branchId }));
      })
      .catch(() => setError('Could not load registration config.'))
      .finally(() => setConfigLoading(false));
  }, [envId]);

  const handleEnvSelect = async (id: AppEnvironmentId) => {
    await setActiveEnvironment(id);
    setEnvId(id);
    setShowEnvPicker(false);
  };

  const validate = (): string | null => {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!form.username.trim()) return 'Username is required.';
    if (!form.password) return 'Password is required.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (passwordRegEx) {
      try {
        if (!new RegExp(passwordRegEx).test(form.password))
          return passwordHint || 'Password does not meet requirements.';
      } catch { /* skip */ }
    }
    if (isReferredByRequired && !form.referredBy.trim()) return 'Referred by is required.';
    if (!form.notaryNodeBranchId) return 'Please select a notary node.';
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    try {
      await signupService.register({
        username: form.username.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        email: form.email.trim(),
        cellphone: form.cellphone.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        referredBy: form.referredBy.trim(),
        notaryNodeBranchId: form.notaryNodeBranchId,
      });

      // Auto-login then go straight to verification
      try {
        await login(form.username.trim(), form.password);
        router.replace('/(app)/get-verified' as any);
      } catch {
        // Auto-login failed — send to login manually
        router.replace('/(auth)/login' as any);
      }
    } catch (err) {
      let msg = 'Registration failed. Please try again.';
      if (err instanceof SignupError) {
        const api = extractSignupApiMessage(err.responseData);
        msg = api || err.message || msg;
      } else if (err && typeof err === 'object') {
        const api = extractSignupApiMessage((err as any).response?.data);
        if (api) msg = api;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedNode = notaryNodes.find((n) => n.branchId === form.notaryNodeBranchId);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>WinstantPay</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {configLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.card}>

            {/* Name row */}
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput style={styles.input} value={form.firstName} onChangeText={set('firstName')}
                  placeholder="John" placeholderTextColor={colors.textMuted} autoCapitalize="words" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput style={styles.input} value={form.lastName} onChangeText={set('lastName')}
                  placeholder="Doe" placeholderTextColor={colors.textMuted} autoCapitalize="words" />
              </View>
            </View>

            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={set('email')}
              placeholder="you@example.com" placeholderTextColor={colors.textMuted}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={form.cellphone} onChangeText={set('cellphone')}
              placeholder="+1 555 000 0000" placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad" />

            <Text style={styles.label}>Username *</Text>
            <TextInput style={styles.input} value={form.username} onChangeText={set('username')}
              placeholder="your.username" placeholderTextColor={colors.textMuted}
              autoCapitalize="none" autoCorrect={false} />

            {!!passwordHint && (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>{passwordHint}</Text>
              </View>
            )}

            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.inputFlex} value={form.password} onChangeText={set('password')}
                placeholder="Password" placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.inputRow}>
              <TextInput style={styles.inputFlex} value={form.confirmPassword} onChangeText={set('confirmPassword')}
                placeholder="Repeat password" placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirm} autoCapitalize="none" autoCorrect={false} />
              <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁'}</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Referred By{isReferredByRequired ? ' *' : ''}</Text>
            <TextInput style={styles.input} value={form.referredBy} onChangeText={set('referredBy')}
              placeholder="Referral code or name" placeholderTextColor={colors.textMuted}
              autoCapitalize="none" autoCorrect={false} />

            {/* Notary Node */}
            {notaryNodes.length > 1 && (
              <>
                <Text style={styles.label}>Notary Node *</Text>
                <Pressable style={styles.pickerBtn} onPress={() => setShowNotaryPicker(true)}>
                  <Text style={styles.pickerValue}>{selectedNode?.name || 'Select notary node'}</Text>
                  <Text style={styles.chevron}>▾</Text>
                </Pressable>
              </>
            )}

            {/* Environment */}
            <Text style={styles.label}>Environment</Text>
            <Pressable style={styles.pickerBtn} onPress={() => setShowEnvPicker(true)}>
              <Text style={styles.pickerValue}>{envId}</Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>

            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={colors.textPrimary} />
                : <Text style={styles.buttonText}>Create Account</Text>
              }
            </Pressable>
          </View>
        )}

        <Pressable style={styles.loginLink} onPress={() => router.back()}>
          <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text></Text>
        </Pressable>

      </ScrollView>

      {/* Notary Node Picker */}
      <Modal visible={showNotaryPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowNotaryPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Notary Node</Text>
            <FlatList
              data={notaryNodes}
              keyExtractor={(item) => item.branchId || item.name}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.branchId === form.notaryNodeBranchId && styles.optionActive]}
                  onPress={() => { set('notaryNodeBranchId')(item.branchId); setShowNotaryPicker(false); }}
                >
                  <Text style={styles.optionText}>{item.name}</Text>
                  <Text style={styles.optionSub}>{item.countryCode}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Environment Picker */}
      <Modal visible={showEnvPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowEnvPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Environment</Text>
            <FlatList
              data={environments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.id === envId && styles.optionActive]}
                  onPress={() => handleEnvSelect(item.id)}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
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
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', marginTop: spacing.xl },
  subtitle: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  loader: { marginTop: spacing.xxl },

  errorBox: {
    backgroundColor: `${colors.danger}22`, borderWidth: 1,
    borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: typography.small },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  label: { fontSize: typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body,
  },
  eyeBtn: { padding: spacing.sm, marginLeft: spacing.xs },
  eyeText: { fontSize: 18 },

  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },

  hintBox: {
    backgroundColor: `${colors.warning}22`, borderWidth: 1,
    borderColor: colors.warning, borderRadius: radius.md, padding: spacing.sm,
  },
  hintText: { fontSize: typography.caption, color: colors.warning },

  pickerBtn: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center',
  },
  pickerValue: { flex: 1, color: colors.textPrimary, fontSize: typography.body },
  chevron: { color: colors.primary },

  button: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },

  loginLink: { alignItems: 'center', marginTop: spacing.lg },
  loginLinkText: { fontSize: typography.small, color: colors.textSecondary },
  loginLinkBold: { color: colors.primary, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', maxHeight: 400 },
  modalTitle: {
    fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  option: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionActive: { backgroundColor: `${colors.primary}22` },
  optionText: { fontSize: typography.body, color: colors.textPrimary },
  optionSub: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },
});
