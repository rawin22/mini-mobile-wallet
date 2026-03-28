import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, ScrollView, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { instantPaymentService } from '../../src/api/instant-payment.service';
import { balanceService } from '../../src/api/balance.service';
import { verifiedLinkService, type VerifiedLinkProfile } from '../../src/api/verified-link.service';
import { formatCurrency, todayDateString } from '../../src/utils/formatters';
import { storage } from '../../src/utils/storage';
import type { CustomerBalanceData } from '../../src/types/balance.types';
import { colors, spacing, typography, radius } from '../../src/theme';
import { CurrencyIcon, PinEntryModal } from '../../components/ui';

type Step = 'lookup' | 'form' | 'review' | 'processing' | 'success';

export default function PayNowScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { recipient } = useLocalSearchParams<{ recipient?: string }>();

  const [step, setStep] = useState<Step>(recipient ? 'form' : 'lookup');
  const [error, setError] = useState('');

  // Lookup step state
  const [lookupId, setLookupId] = useState(recipient ?? '');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<VerifiedLinkProfile | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Payment form state
  const [balances, setBalances] = useState<CustomerBalanceData[]>([]);
  const [toCustomer, setToCustomer] = useState(recipient ?? '');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [memo, setMemo] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    balanceService.getBalances(user.organizationId).then((data) => {
      const active = (data.balances ?? []).filter((b) => b.balanceAvailable > 0);
      setBalances(active);
      if (active.length > 0) setCurrency(active[0].currencyCode);
    }).catch(console.error);
  }, [user]);

  // ─── Lookup ───────────────────────────────────────────────────────────────

  const handleLookup = async (id?: string) => {
    const query = (id ?? lookupId).trim();
    if (!query) return;
    setLookupLoading(true);
    setError('');
    try {
      const profile = await verifiedLinkService.search(query);
      if (!profile) {
        setError(t('payment.recipientNotFound') || 'Recipient not found.');
        return;
      }
      setRecipientProfile(profile);
      setToCustomer(profile.VerifiedLinkReference);
    } catch {
      setError(t('payment.recipientNotFound') || 'Recipient not found. Please check the ID.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        setError(t('payment.cameraPermissionRequired') || 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setScanned(false);
    setShowCamera(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setShowCamera(false);
    // Extract VL reference from URL or use raw value
    const match = data.match(/\/vl\/(VL\w+)/i) ?? data.match(/(VL\d+)/i);
    const extracted = match ? match[1] : data;
    setLookupId(extracted);
    handleLookup(extracted);
  };

  // ─── Payment ─────────────────────────────────────────────────────────────

  const selectedBalance = balances.find((b) => b.currencyCode === currency);
  const parsedAmount = parseFloat(amount);
  const isFormValid = toCustomer.trim() !== '' && parsedAmount > 0 && currency !== '';

  const handleSend = async () => {
    if (!user) return;
    setStep('processing');
    setError('');
    try {
      const createResult = await instantPaymentService.createPayment({
        fromCustomer: user.userName,
        toCustomer,
        paymentTypeId: 1,
        amount: parsedAmount,
        currencyCode: currency,
        valueDate: todayDateString(),
        reasonForPayment: t('payment.instantReason') || 'Instant Payment',
        externalReference: '',
        memo,
      });

      if (createResult.problems) {
        setError(String(createResult.problems));
        setStep('review');
        return;
      }

      setPaymentReference(createResult.payment.paymentReference);

      const confirmResult = await instantPaymentService.confirmPayment({
        instantPaymentId: createResult.payment.paymentId,
        timestamp: createResult.payment.timestamp,
      });

      if (confirmResult.problems) {
        setError(String(confirmResult.problems));
        setStep('review');
        return;
      }

      setStep('success');
    } catch {
      setError(t('payment.failed') || 'Payment failed. Please try again.');
      setStep('review');
    }
  };

  const reset = () => {
    setStep('lookup');
    setLookupId('');
    setRecipientProfile(null);
    setToCustomer('');
    setAmount('');
    setMemo('');
    setError('');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('payment.title') || 'Send Payment'}</Text>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Step: Lookup recipient ── */}
      {step === 'lookup' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('payment.searchRecipient') || 'Search Recipient'}</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={lookupId}
              onChangeText={(v) => { setLookupId(v); setRecipientProfile(null); }}
              placeholder={t('payment.lookupPlaceholder') || 'Enter StealthID (e.g. VL10207)'}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable style={styles.scanBtn} onPress={handleOpenCamera}>
              <Ionicons name="qr-code-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          {lookupLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : recipientProfile ? (
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <Ionicons name="person" size={28} color={colors.textPrimary} />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{recipientProfile.VerifiedLinkName}</Text>
                  {recipientProfile.OrganizationName && (
                    <Text style={styles.profileOrg}>{recipientProfile.OrganizationName}</Text>
                  )}
                  <Text style={styles.profileRef}>{recipientProfile.VerifiedLinkReference}</Text>
                </View>
                {(recipientProfile.IsVerified || recipientProfile.Status === 'Verified') && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                    <Text style={styles.verifiedText}>{t('payment.recipientVerified') || 'Verified'}</Text>
                  </View>
                )}
              </View>
              {recipientProfile.TrustScore !== undefined && (
                <Text style={styles.trustScore}>
                  {t('payment.trustScore') || 'Trust Score'}: {recipientProfile.TrustScore}
                </Text>
              )}
              <Pressable style={styles.button} onPress={() => setStep('form')}>
                <Text style={styles.buttonText}>{t('payment.sendPayment') || 'Pay'}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.button, !lookupId.trim() && styles.buttonDisabled]}
              disabled={!lookupId.trim()}
              onPress={() => handleLookup()}
            >
              <Text style={styles.buttonText}>{t('payment.search') || 'Search'}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Step: Payment form ── */}
      {step === 'form' && (
        <View style={styles.card}>
          <Text style={styles.label}>{t('payment.to') || 'To'}</Text>
          <TextInput style={styles.input} value={toCustomer} onChangeText={setToCustomer}
            placeholder="recipient" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.label}>{t('payment.amount') || 'Amount'}</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount}
            placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />

          <Text style={styles.label}>{t('payment.currency') || 'Currency'}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={styles.pickerValue}>{currency || 'Select currency'}</Text>
            {selectedBalance && (
              <Text style={styles.pickerSub}>{t('dashboard.available') || 'Available'}: {formatCurrency(selectedBalance.balanceAvailable)}</Text>
            )}
            <Text style={styles.pickerChevron}>▾</Text>
          </Pressable>

          <Text style={styles.label}>{t('payment.memoOptional') || 'Memo (optional)'}</Text>
          <TextInput style={styles.input} value={memo} onChangeText={setMemo}
            placeholder={t('payment.memoPlaceholder') || 'Note to recipient'}
            placeholderTextColor={colors.textMuted} />

          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep('lookup')}>
              <Text style={styles.secondaryButtonText}>{t('common.back') || 'Back'}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonFlex, !isFormValid && styles.buttonDisabled]}
              disabled={!isFormValid} onPress={() => setStep('review')}>
              <Text style={styles.buttonText}>{t('payment.reviewPayment') || 'Review'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Step: Review ── */}
      {step === 'review' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('payment.reviewSend') || 'Review & Send'}</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('payment.to') || 'To'}</Text>
            <Text style={styles.reviewValue}>{toCustomer}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('payment.amount') || 'Amount'}</Text>
            <Text style={styles.reviewValue}>{formatCurrency(parsedAmount)} {currency}</Text>
          </View>
          {memo !== '' && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{t('payment.memoOptional') || 'Memo'}</Text>
              <Text style={styles.reviewValue}>{memo}</Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep('form')}>
              <Text style={styles.secondaryButtonText}>{t('common.back') || 'Back'}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonFlex]} onPress={() => {
              if (storage.hasPin()) {
                setShowPinModal(true);
              } else {
                handleSend();
              }
            }}>
              <Text style={styles.buttonText}>{t('payment.sendPayment') || 'Send'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Step: Processing ── */}
      {step === 'processing' && (
        <View style={[styles.card, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>{t('payment.processing') || 'Sending payment...'}</Text>
        </View>
      )}

      {/* ── Step: Success ── */}
      {step === 'success' && (
        <View style={styles.card}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.sectionTitle}>{t('payment.successTitle') || 'Payment Sent!'}</Text>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('payment.reference') || 'Reference'}</Text>
            <Text style={styles.reviewValue}>{paymentReference}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('payment.to') || 'To'}</Text>
            <Text style={styles.reviewValue}>{toCustomer}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('payment.amount') || 'Amount'}</Text>
            <Text style={styles.reviewValue}>{formatCurrency(parsedAmount)} {currency}</Text>
          </View>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.buttonFlex]} onPress={reset}>
              <Text style={styles.buttonText}>{t('payment.sendAnother') || 'Send Another'}</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, styles.buttonFlex]}
              onPress={() => router.push('/(app)/history/payments' as any)}>
              <Text style={styles.secondaryButtonText}>{t('payment.viewHistory') || 'View History'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Currency picker modal ── */}
      <Modal visible={showCurrencyPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowCurrencyPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('payment.currency') || 'Select Currency'}</Text>
            <FlatList
              data={balances}
              keyExtractor={(item) => item.currencyCode}
              renderItem={({ item }) => (
                <Pressable style={[styles.option, item.currencyCode === currency && styles.optionActive]}
                  onPress={() => { setCurrency(item.currencyCode); setShowCurrencyPicker(false); }}>
                  <View style={styles.optionRow}>
                    <CurrencyIcon code={item.currencyCode} size={28} />
                    <Text style={styles.optionText}>{item.currencyCode}</Text>
                  </View>
                  <Text style={styles.optionSub}>{t('dashboard.available') || 'Available'}: {formatCurrency(item.balanceAvailable)}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ── QR Camera modal ── */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraFrame} />
          </View>
          <Pressable style={styles.cameraClose} onPress={() => setShowCamera(false)}>
            <Ionicons name="close-circle" size={44} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.cameraHint}>{t('payment.scanQR') || 'Scan a payment QR code'}</Text>
        </View>
      </Modal>

      <PinEntryModal
        visible={showPinModal}
        title={t('pin.enterPin') || 'Enter PIN to Send'}
        onSuccess={() => { setShowPinModal(false); handleSend(); }}
        onCancel={() => setShowPinModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  label: { fontSize: typography.caption, color: colors.textSecondary },
  input: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body },

  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body },
  scanBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },

  profileCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginTop: spacing.xs },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profileAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: typography.body, fontWeight: '600', color: colors.textPrimary },
  profileOrg: { fontSize: typography.caption, color: colors.textSecondary },
  profileRef: { fontSize: typography.caption, color: colors.textMuted },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${colors.accent}22`, borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  verifiedText: { fontSize: typography.caption, color: colors.accent, fontWeight: '600' },
  trustScore: { fontSize: typography.caption, color: colors.textSecondary },

  pickerButton: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center' },
  pickerValue: { flex: 1, color: colors.textPrimary, fontSize: typography.body },
  pickerSub: { color: colors.textSecondary, fontSize: typography.caption, marginRight: spacing.sm },
  pickerChevron: { color: colors.primary },

  button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonFlex: { flex: 1 },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  secondaryButtonText: { color: colors.textSecondary, fontSize: typography.body },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },

  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewLabel: { fontSize: typography.small, color: colors.textSecondary },
  reviewValue: { fontSize: typography.small, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },

  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 150 },
  processingText: { color: colors.textSecondary, marginTop: spacing.md },
  successIcon: { fontSize: 40, textAlign: 'center', color: colors.accent },

  errorBox: { backgroundColor: `${colors.danger}22`, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md },
  errorText: { color: colors.danger, fontSize: typography.small },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', maxHeight: 400 },
  modalTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  option: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionActive: { backgroundColor: `${colors.primary}22` },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
  optionSub: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 },

  cameraContainer: { flex: 1, backgroundColor: colors.background },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  cameraFrame: { width: 220, height: 220, borderWidth: 2, borderColor: colors.primary, borderRadius: radius.lg },
  cameraClose: { position: 'absolute', top: 56, right: spacing.lg },
  cameraHint: { position: 'absolute', bottom: 80, alignSelf: 'center', color: colors.textPrimary, fontSize: typography.small, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md },
});
