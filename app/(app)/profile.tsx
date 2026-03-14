import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Pressable, Linking,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { verificationService } from '../../src/api/verification.service';
import { formatDateTime } from '../../src/utils/formatters';
import { colors, spacing, typography, radius } from '../../src/theme';

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
  const router = useRouter();
  const [vlinks, setVlinks] = useState<VLinkDisplay[]>([]);
  const [vlinkLoading, setVlinkLoading] = useState(true);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.fullName}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.username}>@{user.userName}</Text>
      </View>

      {/* Account Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <InfoRow label="Username" value={user.userName} />
        <InfoRow label="Email" value={user.emailAddress} />
        {!!user.phone && <InfoRow label="Phone" value={user.phone} />}
      </View>

      {/* Personal Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal</Text>
        <InfoRow label="First name" value={user.firstName} />
        <InfoRow label="Last name" value={user.lastName} />
        <InfoRow label="Organisation" value={user.organizationName} />
        <InfoRow label="Branch" value={user.branchName} />
      </View>

      {/* Verification */}
      {(user.customerWKYCLevel !== undefined || user.wkycId) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verification</Text>
          {user.customerWKYCLevel !== undefined && (
            <InfoRow label="WKYC Level" value={String(user.customerWKYCLevel)} />
          )}
          {user.customerTrustScore !== undefined && (
            <InfoRow label="Trust Score" value={String(user.customerTrustScore)} />
          )}
          {!!user.wkycId && <InfoRow label="WKYC ID" value={user.wkycId} />}
        </View>
      )}

      {/* Verified Links */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verified Links</Text>
        {vlinkLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : vlinks.length === 0 ? (
          <Text style={styles.empty}>No verified links found.</Text>
        ) : (
          vlinks.map((vl) => (
            <View key={vl.id} style={styles.vlinkItem}>
              <InfoRow label="Reference" value={vl.reference} />
              <InfoRow label="Name" value={vl.name} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.badge, { backgroundColor: `${statusColor(vl.statusId)}22` }]}>
                  <Text style={[styles.badgeText, { color: statusColor(vl.statusId) }]}>
                    {vl.statusName}
                  </Text>
                </View>
              </View>
              {!!vl.url && (
                <Pressable
                  style={styles.urlRow}
                  onPress={() => Linking.openURL(vl.url)}
                >
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
        <Text style={styles.cardTitle}>Settings</Text>
        <InfoRow label="Base currency" value={user.baseCurrencyCode} />
        <InfoRow label="Language" value={user.cultureCode} />
      </View>

      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account</Text>
          <View style={[styles.badge, { backgroundColor: user.isEnabled ? `${colors.accent}22` : `${colors.danger}22` }]}>
            <Text style={[styles.badgeText, { color: user.isEnabled ? colors.accent : colors.danger }]}>
              {user.isEnabled ? 'Active' : 'Disabled'}
            </Text>
          </View>
        </View>
        {user.isLockedOut && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Locked out</Text>
            <View style={[styles.badge, { backgroundColor: `${colors.danger}22` }]}>
              <Text style={[styles.badgeText, { color: colors.danger }]}>Yes</Text>
            </View>
          </View>
        )}
        {!!user.lastLoginTime && (
          <InfoRow label="Last login" value={formatDateTime(user.lastLoginTime)} />
        )}
        {!!user.lastPasswordChangedTime && (
          <InfoRow label="Password changed" value={formatDateTime(user.lastPasswordChangedTime)} />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.verifyButton]}
          onPress={() => router.push('/(app)/get-verified' as any)}
        >
          <Text style={styles.buttonText}>Get Verified</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => router.push('/(app)/change-password' as any)}
        >
          <Text style={styles.buttonText}>Change Password</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.dangerButton]} onPress={logout}>
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Sign Out</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },

  avatarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: typography.small, color: colors.textSecondary, flex: 1 },
  infoValue: { fontSize: typography.small, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },

  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: typography.caption, fontWeight: '600' },

  vlinkItem: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  urlText: { flex: 1, fontSize: typography.caption, color: colors.primary },
  urlOpen: { fontSize: typography.caption, color: colors.primary, fontWeight: '600' },

  loader: { marginVertical: spacing.md },
  empty: { fontSize: typography.small, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },

  actions: { gap: spacing.sm, marginBottom: spacing.xl },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  verifyButton: { backgroundColor: colors.accent },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
  dangerButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  dangerButtonText: { color: colors.danger },
});
