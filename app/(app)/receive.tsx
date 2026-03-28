import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Share, ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { verifiedLinkService, buildVlinkUrl, type VerifiedLinkProfile } from '../../src/api/verified-link.service';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';

export default function ReceiveScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [links, setLinks] = useState<VerifiedLinkProfile[]>([]);
  const [selected, setSelected] = useState<VerifiedLinkProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.organizationId) {
      setLoading(false);
      return;
    }
    verifiedLinkService.getMyLinks(user.organizationId)
      .then((list) => {
        setLinks(list);
        setSelected(list[0] ?? null);
      })
      .catch(() => setError('Could not load your payment link.'))
      .finally(() => setLoading(false));
  }, [user]);

  const stealthId = selected?.verifiedLinkReference || user?.preferredAlias || '';
  const paymentUrl = selected?.verifiedLinkUrl || (selected?.verifiedLinkId ? buildVlinkUrl(selected.verifiedLinkId) : '');
  const qrValue = paymentUrl || stealthId;

  const handleShare = async () => {
    if (!qrValue) return;
    await Share.share({
      message: paymentUrl
        ? `${t('payment.shareLink') || 'Pay me via WinstantPay'}: ${paymentUrl}`
        : stealthId,
      url: paymentUrl || undefined,
    });
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{t('payment.receive') || 'Get Paid'}</Text>
      <Text style={styles.subtitle}>{t('payment.yourQRCode') || 'Share your QR code or payment link'}</Text>

      {loading && <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <>
          {/* VLink picker — only shown when the user has more than one */}
          {links.length > 1 && (
            <View style={styles.pickerCard}>
              <Text style={styles.pickerLabel}>Select payment link</Text>
              {links.map((vl) => (
                <Pressable
                  key={vl.verifiedLinkId}
                  style={[styles.pickerItem, selected?.verifiedLinkId === vl.verifiedLinkId && styles.pickerItemActive]}
                  onPress={() => { setSelected(vl); setCopied(false); }}
                >
                  <View style={styles.pickerItemInner}>
                    <Text style={[styles.pickerRef, selected?.verifiedLinkId === vl.verifiedLinkId && styles.pickerRefActive]}>
                      {vl.verifiedLinkReference}
                    </Text>
                    {!!vl.verifiedLinkName && (
                      <Text style={styles.pickerName} numberOfLines={1}>{vl.verifiedLinkName}</Text>
                    )}
                  </View>
                  {selected?.verifiedLinkId === vl.verifiedLinkId && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* QR Code */}
          <View style={styles.qrCard}>
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={200}
                color={colors.textPrimary}
                backgroundColor={colors.surface}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={80} color={colors.textMuted} />
              </View>
            )}
          </View>

          {/* StealthID / alias display */}
          {stealthId ? (
            <View style={styles.idCard}>
              <Text style={styles.idLabel}>{t('payment.stealthId') || 'Your StealthID'}</Text>
              <Pressable style={styles.idRow} onPress={handleCopy}>
                <Text style={styles.idValue}>{stealthId}</Text>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={20}
                  color={copied ? colors.accent : colors.primary}
                />
              </Pressable>
            </View>
          ) : null}

          {/* Share button */}
          <Pressable
            style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed, ...[shadows.button]]}
            onPress={handleShare}
            disabled={!qrValue}
          >
            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.shareButtonText}>{t('payment.shareLink') || 'Share Payment Link'}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, alignItems: 'center', flexGrow: 1 },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { fontSize: typography.small, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  loader: { marginTop: spacing.xxl },

  errorBox: { backgroundColor: `${colors.danger}22`, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md, width: '100%' },
  errorText: { color: colors.danger, fontSize: typography.small },

  pickerCard: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg, overflow: 'hidden',
  },
  pickerLabel: {
    fontSize: typography.caption, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerItemActive: { backgroundColor: `${colors.primary}11` },
  pickerItemInner: { flex: 1 },
  pickerRef: { fontSize: typography.body, fontWeight: '600', color: colors.textSecondary },
  pickerRefActive: { color: colors.primary },
  pickerName: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },

  qrCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
    ...shadows.card,
  },
  qrPlaceholder: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },

  idCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, width: '100%', marginBottom: spacing.lg },
  idLabel: { fontSize: typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idValue: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 1 },

  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    width: '100%', justifyContent: 'center',
  },
  shareButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  shareButtonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
});
