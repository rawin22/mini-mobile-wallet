import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Pressable, Linking, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { verificationService } from '../../src/api/verification.service';
import { storage } from '../../src/utils/storage';
import { formatDateTime } from '../../src/utils/formatters';
import { InfoRow } from '../../components/ui';
import { colors, spacing, typography, radius, gradients, shadows } from '../../src/theme';

interface VLinkDisplay {
  id: string;
  reference: string;
  name: string;
  statusId: number;
  statusName: string;
  url: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, language, languages, setLanguage } = useLanguage();
  const router = useRouter();
  const [vlinks, setVlinks] = useState<VLinkDisplay[]>([]);
  const [vlinkLoading, setVlinkLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    setHasPin(storage.hasPin());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const searchResults = await verificationService.searchVerifiedLinks();
        const displays: VLinkDisplay[] = [];
        for (const vl of searchResults) {
          const id = (vl.verifiedLinkId ?? vl.VerifiedLinkId) as string;
          const ref = (vl.verifiedLinkReference ?? vl.VerifiedLinkReference) as string;
          const name = (vl.verifiedLinkName ?? vl.VerifiedLinkName) as string;
          const statusId = (vl.verifiedLinkStatusTypeId ?? vl.VerifiedLinkStatusTypeId) as number;
          const statusName = (vl.verifiedLinkStatusTypeName ?? vl.VerifiedLinkStatusTypeName) as string;
          let url = '';
          try {
            const full = await verificationService.getVerifiedLink(id);
            url = (full?.verifiedLinkUrl ?? full?.VerifiedLinkUrl ?? '') as string;
          } catch { /* leave url empty */ }
          displays.push({ id, reference: ref, name, statusId, statusName, url });
        }
        setVlinks(displays);
      } catch {
        setVlinks([]);
      } finally {
        setVlinkLoading(false);
      }
    })();
  }, []);

  if (!user) return null;

  const statusColor = (statusId: number) => {
    if (statusId === 2) return colors.accent;
    if (statusId === 1) return colors.warning;
    return colors.danger;
  };

  const currentLangLabel = languages.find((l) => l.code === language)?.label ?? language;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar with gradient header */}
      <LinearGradient colors={gradients.hero} style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.fullName}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.username}>@{user.userName}</Text>
      </LinearGradient>

      {/* Account Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.accountInfo') || 'Account'}</Text>
        <InfoRow label={t('profile.username') || 'Username'} value={user.userName} />
        <InfoRow label={t('profile.email') || 'Email'} value={user.emailAddress} />
        {!!user.phone && <InfoRow label={t('profile.phone') || 'Phone'} value={user.phone} />}
      </View>

      {/* Personal Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.personalInfo') || 'Personal'}</Text>
        <InfoRow label={t('profile.firstName') || 'First name'} value={user.firstName} />
        <InfoRow label={t('profile.lastName') || 'Last name'} value={user.lastName} />
        <InfoRow label={t('profile.organization') || 'Organisation'} value={user.organizationName} />
        <InfoRow label={t('profile.branch') || 'Branch'} value={user.branchName} />
      </View>

      {/* Verification */}
      {(user.customerWKYCLevel !== undefined || user.wkycId) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.verification') || 'Verification'}</Text>
          {user.customerWKYCLevel !== undefined && (
            <InfoRow label={t('profile.wkycLevel') || 'WKYC Level'} value={String(user.customerWKYCLevel)} />
          )}
          {user.customerTrustScore !== undefined && (
            <InfoRow label={t('profile.trustScore') || 'Trust Score'} value={String(user.customerTrustScore)} />
          )}
          {!!user.wkycId && <InfoRow label={t('profile.wkycId') || 'WKYC ID'} value={user.wkycId} />}
        </View>
      )}

      {/* Verified Links */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.verifiedLinks') || 'Verified Links'}</Text>
        {vlinkLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : vlinks.length === 0 ? (
          <Text style={styles.empty}>{t('profile.noVlinks') || 'No verified links found.'}</Text>
        ) : (
          vlinks.map((vl) => (
            <View key={vl.id} style={styles.vlinkItem}>
              <InfoRow label={t('profile.vlinkReference') || 'Reference'} value={vl.reference} />
              <InfoRow label={t('profile.vlinkName') || 'Name'} value={vl.name} />
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('profile.vlinkStatus') || 'Status'}</Text>
                <View style={[styles.badge, { backgroundColor: `${statusColor(vl.statusId)}22` }]}>
                  <Text style={[styles.badgeText, { color: statusColor(vl.statusId) }]}>
                    {vl.statusName}
                  </Text>
                </View>
              </View>
              {!!vl.url && (
                <Pressable style={styles.urlRow} onPress={() => Linking.openURL(vl.url)}>
                  <Text style={styles.urlText} numberOfLines={1}>{vl.url}</Text>
                  <Text style={styles.urlOpen}>Open ↗</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </View>

      {/* Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.settings') || 'Settings'}</Text>
        <InfoRow label={t('profile.baseCurrency') || 'Base currency'} value={user.baseCurrencyCode} />
        <Pressable style={styles.settingRow} onPress={() => setShowLangPicker(true)}>
          <Text style={styles.settingLabel}>{t('profile.language') || 'Language'}</Text>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>{currentLangLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </Pressable>
      </View>

      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.status') || 'Status'}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('profile.enabled') || 'Account'}</Text>
          <View style={[styles.badge, { backgroundColor: user.isEnabled ? `${colors.accent}22` : `${colors.danger}22` }]}>
            <Text style={[styles.badgeText, { color: user.isEnabled ? colors.accent : colors.danger }]}>
              {user.isEnabled ? (t('profile.yes') || 'Active') : 'Disabled'}
            </Text>
          </View>
        </View>
        {user.isLockedOut && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('profile.lockedOut') || 'Locked out'}</Text>
            <View style={[styles.badge, { backgroundColor: `${colors.danger}22` }]}>
              <Text style={[styles.badgeText, { color: colors.danger }]}>{t('profile.yes') || 'Yes'}</Text>
            </View>
          </View>
        )}
        {!!user.lastLoginTime && (
          <InfoRow label={t('profile.lastLogin') || 'Last login'} value={formatDateTime(user.lastLoginTime)} />
        )}
        {!!user.lastPasswordChangedTime && (
          <InfoRow label={t('profile.lastPasswordChange') || 'Password changed'} value={formatDateTime(user.lastPasswordChangedTime)} />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.verifyButton]}
          onPress={() => router.push('/(app)/get-verified' as any)}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textPrimary} style={styles.btnIcon} />
          <Text style={styles.buttonText}>{t('nav.getVerified') || 'Get Verified'}</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => {
            router.push('/(app)/pin-setup' as any);
          }}
        >
          <Ionicons name="keypad-outline" size={18} color={colors.textPrimary} style={styles.btnIcon} />
          <Text style={styles.buttonText}>
            {hasPin ? (t('pin.changePin') || 'Change PIN') : (t('pin.setPin') || 'Set PIN')}
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/(app)/change-password' as any)}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.textPrimary} style={styles.btnIcon} />
          <Text style={styles.buttonText}>{t('profile.changePassword') || 'Change Password'}</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/(app)/help' as any)}
        >
          <Ionicons name="help-circle-outline" size={18} color={colors.textPrimary} style={styles.btnIcon} />
          <Text style={styles.buttonText}>{t('nav.help') || 'Help'}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.tourButton]}
          onPress={() => router.push('/(onboarding)/intro' as any)}
        >
          <Ionicons name="rocket-outline" size={18} color={colors.primary} style={styles.btnIcon} />
          <Text style={[styles.buttonText, { color: colors.primary }]}>App Tour</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.dangerButton]} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} style={styles.btnIcon} />
          <Text style={[styles.buttonText, styles.dangerButtonText]}>{t('nav.logout') || 'Sign Out'}</Text>
        </Pressable>
      </View>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowLangPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('common.language') || 'Language'}</Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.langOption, item.code === language && styles.langOptionActive]}
                  onPress={() => { setLanguage(item.code); setShowLangPicker(false); }}
                >
                  <Text style={[styles.langOptionText, item.code === language && styles.langOptionTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },

  avatarCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary },
  fullName: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },
  username: { fontSize: typography.small, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.small, fontWeight: '700',
    color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: spacing.xs,
  },

  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statusLabel: { fontSize: typography.small, color: colors.textSecondary, flex: 1 },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: typography.caption, fontWeight: '600' },

  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  settingLabel: { fontSize: typography.small, color: colors.textSecondary },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  settingValue: { fontSize: typography.small, color: colors.textPrimary, fontWeight: '500' },

  vlinkItem: {
    gap: spacing.xs, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  urlText: { flex: 1, fontSize: typography.caption, color: colors.primary },
  urlOpen: { fontSize: typography.caption, color: colors.primary, fontWeight: '600' },

  loader: { marginVertical: spacing.md },
  empty: { fontSize: typography.small, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },

  actions: { gap: spacing.sm, marginBottom: spacing.xl },
  button: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: { marginRight: spacing.sm },
  verifyButton: { backgroundColor: colors.accent, borderColor: colors.accent },
  tourButton: { backgroundColor: 'transparent', borderColor: colors.primary },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
  dangerButton: { backgroundColor: 'transparent', borderColor: colors.danger },
  dangerButtonText: { color: colors.danger },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  modalTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  langOption: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  langOptionActive: { backgroundColor: `${colors.primary}22` },
  langOptionText: { fontSize: typography.body, color: colors.textSecondary },
  langOptionTextActive: { color: colors.primary, fontWeight: '600' },
});
