import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { authService } from '../../src/api/auth.service';
import { Ionicons } from '@expo/vector-icons';
import type { AxiosError } from 'axios';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function ChangePasswordScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const validate = (): string | null => {
    if (!oldPassword || !newPassword || !confirmPassword) return t('profile.allFieldsRequired') || 'All fields are required.';
    if (newPassword !== confirmPassword) return 'New passwords do not match.';
    if (user.passwordRegEx) {
      try {
        if (!new RegExp(user.passwordRegEx).test(newPassword)) {
          return user.passwordRegExMessage || 'Password does not meet requirements.';
        }
      } catch { /* invalid regex — skip */ }
    }
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    try {
      await authService.changePassword(user.userId, oldPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; problems?: string }>;
      const msg = axiosErr.response?.data?.message
        || axiosErr.response?.data?.problems
        || t('profile.changePasswordError') || 'Failed to change password. Please try again.';
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>{t('profile.changePasswordTitle') || 'Password Changed'}</Text>
        <Text style={styles.successSub}>{t('profile.passwordChanged') || 'Your password has been updated successfully.'}</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>{t('profile.backToProfile') || 'Back to Profile'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {!!user.passwordRegExMessage && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{user.passwordRegExMessage}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('profile.currentPassword') || 'Current Password'}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry={!showOld}
              placeholderTextColor={colors.textMuted}
              placeholder="Enter current password"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowOld(!showOld)}>
              <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>{t('profile.newPassword') || 'New Password'}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              placeholderTextColor={colors.textMuted}
              placeholder="Enter new password"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>{t('profile.confirmNewPassword') || 'Confirm New Password'}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholderTextColor={colors.textMuted}
              placeholder="Repeat new password"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>{t('common.cancel') || 'Cancel'}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonFlex, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={colors.textPrimary} />
              : <Text style={styles.buttonText}>{t('profile.changePassword') || 'Change Password'}</Text>
            }
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },

  hintBox: {
    backgroundColor: `${colors.warning}22`,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  hintText: { fontSize: typography.small, color: colors.warning },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fieldLabel: { fontSize: typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  eyeBtn: { padding: spacing.sm, marginLeft: spacing.xs },
  eyeText: { fontSize: 18 },

  errorBox: {
    backgroundColor: `${colors.danger}22`,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  errorText: { color: colors.danger, fontSize: typography.small },

  actions: { flexDirection: 'row', gap: spacing.sm },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonFlex: { flex: 1 },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
  buttonDisabled: { opacity: 0.4 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.textSecondary, fontSize: typography.body },

  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successIcon: { fontSize: 56, color: colors.accent, marginBottom: spacing.md },
  successTitle: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  successSub: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
});
