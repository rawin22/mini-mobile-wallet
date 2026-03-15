import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, ScrollView, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { instantPaymentService } from '../../src/api/instant-payment.service';
import { balanceService } from '../../src/api/balance.service';
import { formatCurrency, todayDateString } from '../../src/utils/formatters';
import { storage } from '../../src/utils/storage';
import type { CustomerBalanceData } from '../../src/types/balance.types';
import { colors, spacing, typography, radius } from '../../src/theme';
import { CurrencyIcon, PinEntryModal } from '../../components/ui';

type Step = 'form' | 'review' | 'processing' | 'success';

export default function PayNowScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [balances, setBalances] = useState<CustomerBalanceData[]>([]);
  const { recipient } = useLocalSearchParams<{ recipient?: string }>();
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
    setStep('form');
    setToCustomer('');
    setAmount('');
    setMemo('');
    setError('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('payment.title') || 'Send Payment'}</Text>

      {error !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {step === 'form' && (
        <View style={styles.card}>
          <Text style={styles.label}>To (PayID)</Text>
          <TextInput style={styles.input} value={toCustomer} onChangeText={setToCustomer}
            placeholder="recipient@example.com" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" autoCorrect={false} />

          <Text style={styles.label}>{t('payment.amount') || 'Amount'}</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount}
            placeholder="0.00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />

          <Text style={styles.label}>{t('payment.currency') || 'Currency'}</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowCurrencyPicker(true)}>
            <Text style={styles.pickerValue}>{currency || 'Select currency'}</Text>
            {selectedBalance && (
              <Text style={styles.pickerSub}>Available: {formatCurrency(selectedBalance.balanceAvailable)}</Text>
            )}
            <Text style={styles.pickerChevron}>▾</Text>
          </Pressable>

          <Text style={styles.label}>{t('payment.memoOptional') || 'Memo (optional)'}</Text>
          <TextInput style={styles.input} value={memo} onChangeText={setMemo}
            placeholder={t('payment.memoPlaceholder') || 'Note to recipient'}
            placeholderTextColor={colors.textMuted} />

          <Pressable style={[styles.button, !isFormValid && styles.buttonDisabled]}
            disabled={!isFormValid} onPress={() => setStep('review')}>
            <Text style={styles.buttonText}>{t('payment.reviewPayment') || 'Review Payment'}</Text>
          </Pressable>
        </View>
      )}

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

      {step === 'processing' && (
        <View style={[styles.card, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>{t('payment.processing') || 'Sending payment...'}</Text>
        </View>
      )}

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
                  <Text style={styles.optionSub}>Available: {formatCurrency(item.balanceAvailable)}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
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
  label: { fontSize: typography.caption, color: colors.textSecondary },
  input: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body },
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
  sectionTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
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
});
