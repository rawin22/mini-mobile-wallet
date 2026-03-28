import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { signupService, SignupError, extractSignupApiMessage } from '../../src/api/signup.service';
import {
  getEnvironmentOptions, getActiveEnvironmentId,
  setActiveEnvironment, type AppEnvironmentId,
} from '../../src/api/config';
import type { NotaryNode } from '../../src/types/signup.types';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';

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
  const { t } = useLanguage();

  const [form, setForm] = useState<FormState>(empty);
  const [envId, setEnvId] = useState<AppEnvironmentId>(getActiveEnvironmentId());
  const [notaryNodes, setNotaryNodes] = useState<NotaryNode[]>([]);
  const [passwordHint, setPasswordHint] = useState('');
  const [isReferredByRequired, setIsReferredByRequired] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNotaryPicker, setShowNotaryPicker] = useState(false);
  const [showEnvPicker, setShowEnvPicker] = useState(false);
  const [success, setSuccess] = useState(false);

  const environments = getEnvironmentOptions();
  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    setConfigLoading(true);
    setError('');
    signupService.loadSignupFormConfig()
      .then((cfg) => {
        setNotaryNodes(cfg.notaryNodes);
        setPasswordHint(cfg.passwordRegExMessage ?? '');
        setIsReferredByRequired(cfg.isReferredByRequired ?? false);
        const defaultNode = cfg.notaryNodes.find((n) => n.isDefault) ?? cfg.notaryNodes[0];
        if (defaultNode) setForm((prev) => ({ ...prev, notaryNodeBranchId: defaultNode.branchId }));
      })
      .catch(() => setError(t('auth.signupConfigError') || 'Could not load registration config.'))
      .finally(() => setConfigLoading(false));
  }, [envId]);

  const handleEnvSelect = async (id: AppEnvironmentId) => {
    await setActiveEnvironment(id);
    setEnvId(id);
    setShowEnvPicker(false);
  };

  const validate = (): string | null => {
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const em = form.email.trim();
    const un = form.username.trim();

    if (!fn || !ln) return `${t('auth.firstName') || 'First'} and ${t('auth.lastName') || 'Last'} name are required.`;
    if (fn.length < 2) return `${t('auth.firstName') || 'First name'} must be at least 2 characters.`;
    if (ln.length < 2) return `${t('auth.lastName') || 'Last name'} must be at least 2 characters.`;
    if (!em) return `${t('auth.email') || 'Email'} is required.`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return 'Please enter a valid email address.';
    const ph = form.cellphone.trim();
    if (ph && !/^[+\d][\d\s\-().]{5,}$/.test(ph)) return 'Please enter a valid phone number.';
    if (!un) return `${t('auth.username') || 'Username'} is required.`;
    if (un.length < 3) return `${t('auth.username') || 'Username'} must be at least 3 characters.`;
    if (/\s/.test(un)) return `${t('auth.username') || 'Username'} cannot contain spaces.`;
    if (!/^[a-zA-Z0-9._@-]+$/.test(un)) return `${t('auth.username') || 'Username'} can only contain letters, numbers, dots, hyphens, and @.`;
    if (!form.password) return `${t('auth.password') || 'Password'} is required.`;
    if (form.password !== form.confirmPassword) return t('auth.passwordMismatch') || 'Passwords do not match.';
    if (isReferredByRequired && !form.referredBy.trim()) return t('auth.referredByRequired') || 'Referred by is required.';
    if (!form.notaryNodeBranchId) return `${t('auth.notaryNode') || 'Notary node'} is required.`;
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

      try {
        await login(form.username.trim(), form.password);
        router.replace('/(app)/get-verified' as any);
      } catch {
        setSuccess(true);
      }
    } catch (err) {
      let msg = t('auth.signupFailed') || 'Registration failed. Please try again.';
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
    <LinearGradient colors={['#0f172a', '#0a0a0a']} style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons name="wallet" size={36} color={colors.textPrimary} />
            </View>
            <Text style={styles.title}>WinstantPay</Text>
            <Text style={styles.subtitle}>{t('auth.signupSubtitle') || 'Create your account'}</Text>
          </View>

          {/* Success state */}
          {success ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
              <Text style={styles.successTitle}>{t('auth.signupSuccess') || 'Account Created!'}</Text>
              <Text style={styles.successText}>
                Your account has been created. Please sign in with your credentials.
              </Text>
              <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login' as any)}>
                <Text style={styles.buttonText}>{t('auth.signIn') || 'Sign In'}</Text>
              </Pressable>
            </View>
          ) : null}

          {!success && !!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!success && configLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : !success ? (
            <View style={styles.form}>

              {/* Name row */}
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>{t('auth.firstName') || 'First Name'} *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.firstName} onChangeText={set('firstName')}
                      placeholder="John" placeholderTextColor={colors.textMuted} autoCapitalize="words" />
                  </View>
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>{t('auth.lastName') || 'Last Name'} *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={form.lastName} onChangeText={set('lastName')}
                      placeholder="Doe" placeholderTextColor={colors.textMuted} autoCapitalize="words" />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>{t('auth.email') || 'Email'} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.email} onChangeText={set('email')}
                  placeholder="you@example.com" placeholderTextColor={colors.textMuted}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>

              <Text style={styles.label}>{t('auth.cellphone') || 'Phone'}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.cellphone} onChangeText={set('cellphone')}
                  placeholder="+1 555 000 0000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
              </View>

              <Text style={styles.label}>{t('auth.username') || 'Username'} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="at-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.username} onChangeText={set('username')}
                  placeholder="your.username" placeholderTextColor={colors.textMuted}
                  autoCapitalize="none" autoCorrect={false} />
              </View>

              {!!passwordHint && (
                <View style={styles.hintBox}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                  <Text style={styles.hintText}>{passwordHint}</Text>
                </View>
              )}

              <Text style={styles.label}>{t('auth.password') || 'Password'} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.password} onChangeText={set('password')}
                  placeholder={t('auth.enterPassword') || 'Password'} placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>{t('auth.confirmPassword') || 'Confirm Password'} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.confirmPassword} onChangeText={set('confirmPassword')}
                  placeholder={t('auth.confirmPassword') || 'Repeat password'} placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm} autoCapitalize="none" autoCorrect={false} />
                <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>
                {t('auth.referredBy') || 'Referred By'}{isReferredByRequired ? ' *' : ''}
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="people-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.input} value={form.referredBy} onChangeText={set('referredBy')}
                  placeholder="Referral code or name" placeholderTextColor={colors.textMuted}
                  autoCapitalize="none" autoCorrect={false} />
              </View>

              {/* Notary Node */}
              {notaryNodes.length > 1 && (
                <>
                  <Text style={styles.label}>{t('auth.notaryNode') || 'Notary Node'} *</Text>
                  <Pressable style={styles.pickerBtn} onPress={() => setShowNotaryPicker(true)}>
                    <Text style={styles.pickerValue}>{selectedNode?.name || 'Select notary node'}</Text>
                    <Text style={styles.chevron}>▾</Text>
                  </Pressable>
                </>
              )}

              {/* Environment */}
              <Text style={styles.label}>{t('auth.environment') || 'Environment'}</Text>
              <Pressable style={styles.pickerBtn} onPress={() => setShowEnvPicker(true)}>
                <Text style={styles.pickerValue}>{envId}</Text>
                <Text style={styles.chevron}>▾</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonDisabled, ...([shadows.button])]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color={colors.textPrimary} />
                  : <Text style={styles.buttonText}>{t('auth.createAccount') || 'Create Account'}</Text>
                }
              </Pressable>
            </View>
          ) : null}

          {!success && (
            <Pressable style={styles.loginLink} onPress={() => router.back()}>
              <Text style={styles.loginLinkText}>
                {t('auth.alreadyAccount') || 'Already have an account?'}{' '}
                <Text style={styles.loginLinkBold}>{t('auth.signIn') || 'Sign in'}</Text>
              </Text>
            </Pressable>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Notary Node Picker */}
      <Modal visible={showNotaryPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowNotaryPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('auth.notaryNode') || 'Select Notary Node'}</Text>
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
            <Text style={styles.modalTitle}>{t('auth.environment') || 'Select Environment'}</Text>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },

  brand: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.lg },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },

  loader: { marginTop: spacing.xxl },

  successBox: {
    backgroundColor: `${colors.accent}22`, borderWidth: 1,
    borderColor: colors.accent, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', gap: spacing.md,
  },
  successTitle: { fontSize: typography.heading, fontWeight: 'bold', color: colors.accent },
  successText: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center' },

  errorBox: {
    backgroundColor: `${colors.danger}22`, borderWidth: 1,
    borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: typography.small },

  form: { gap: spacing.md },
  label: { fontSize: typography.caption, color: colors.textSecondary },

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

  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1, gap: spacing.xs },

  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: `${colors.warning}22`, borderWidth: 1,
    borderColor: colors.warning, borderRadius: radius.md, padding: spacing.sm,
  },
  hintText: { flex: 1, fontSize: typography.caption, color: colors.warning },

  pickerBtn: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center',
  },
  pickerValue: { flex: 1, color: colors.textPrimary, fontSize: typography.body },
  chevron: { color: colors.primary },

  button: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
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
