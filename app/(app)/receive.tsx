import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { useState, useEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { verifiedLinkService, type VerifiedLinkProfile } from '../../src/api/verified-link.service';
import { colors, spacing, typography, radius, shadows } from '../../src/theme';

export default function ReceiveScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [link, setLink] = useState<VerifiedLinkProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.organizationId) {
      setLoading(false);
      return;
    }
    verifiedLinkService.getMyLink(user.organizationId)
      .then(setLink)
      .catch(() => setError('Could not load your payment link.'))
      .finally(() => setLoading(false));
  }, [user]);

  const paymentUrl = link?.VerifiedLinkUrl || link?.VerifiedLinkShortUrl || '';
  const stealthId = link?.VerifiedLinkReference || user?.preferredAlias || '';
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
    <View style={styles.container}>
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

          {/* StealthID display */}
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
            style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed, ...([shadows.button])]}
            onPress={handleShare}
            disabled={!qrValue}
          >
            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.shareButtonText}>{t('payment.shareLink') || 'Share Payment Link'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, alignItems: 'center' },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { fontSize: typography.small, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  loader: { marginTop: spacing.xxl },

  errorBox: { backgroundColor: `${colors.danger}22`, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md, width: '100%' },
  errorText: { color: colors.danger, fontSize: typography.small },

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
