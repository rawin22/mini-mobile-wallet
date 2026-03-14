import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, ScrollView, Modal, FlatList,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { fxService } from '../../src/api/fx.service';
import { formatCurrency, formatCountdown } from '../../src/utils/formatters';
import type { FxCurrency, FxQuote } from '../../src/types/fx.types';
import { colors, spacing, typography, radius } from '../../src/theme';

type Step = 'form' | 'quoting' | 'quote' | 'booking' | 'success' | 'expired';
type Picker = 'buy' | 'sell' | 'amountCcy' | null;

export default function ExchangeScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [activePicker, setActivePicker] = useState<Picker>(null);

  const [buyCurrencies, setBuyCurrencies] = useState<FxCurrency[]>([]);
  const [sellCurrencies, setSellCurrencies] = useState<FxCurrency[]>([]);
  const [buyCcy, setBuyCcy] = useState('');
  const [sellCcy, setSellCcy] = useState('');
  const [amount, setAmount] = useState('');
  const [amountCcy, setAmountCcy] = useState('');

  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [dealRef, setDealRef] = useState('');
  const [depositRef, setDepositRef] = useState('');

  // Load currencies on mount
  useEffect(() => {
    (async () => {
      try {
        const [buyRes, sellRes] = await Promise.all([
          fxService.getBuyCurrencies(),
          fxService.getSellCurrencies(),
        ]);
        const buys = buyRes.currencies ?? [];
        const sells = sellRes.currencies ?? [];
        setBuyCurrencies(buys);
        setSellCurrencies(sells);
        if (buys.length) setBuyCcy(buys[0].currencyCode);
        if (sells.length) {
          setSellCcy(sells[0].currencyCode);
          setAmountCcy(sells[0].currencyCode);
        }
      } catch {
        setError('Could not load currencies.');
      }
    })();
  }, []);

  // Countdown timer when quote is active
  useEffect(() => {
    if (step !== 'quote' || !quote) return;
    const expiresAt = new Date(quote.expirationTime).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) setStep('expired');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, quote]);

  const isFormValid = buyCcy && sellCcy && buyCcy !== sellCcy && parseFloat(amount) > 0;

  const handleGetQuote = async () => {
    setStep('quoting');
    setError('');
    try {
      const result = await fxService.getQuote({
        buyCurrencyCode: buyCcy,
        sellCurrencyCode: sellCcy,
        amount: parseFloat(amount),
        amountCurrencyCode: amountCcy,
        dealType: 'SPOT',
        windowOpenDate: '',
        finalValueDate: '',
        isForCurrencyCalculator: false,
      });
      if (result.problems) {
        setError(String(result.problems));
        setStep('form');
        return;
      }
      setQuote(result.quote);
      setStep('quote');
    } catch {
      setError('Could not get quote. Please try again.');
      setStep('form');
    }
  };

  const handleBookDeal = async () => {
    if (!quote) return;
    setStep('booking');
    setError('');
    try {
      const result = await fxService.bookDeal(quote.quoteId);
      if (result.problems) {
        setError(String(result.problems));
        setStep('quote');
        return;
      }
      setDealRef(result.fxDepositData.fxDealReference);
      setDepositRef(result.fxDepositData.depositReference);
      setStep('success');
    } catch {
      setError('Could not book deal. Please try again.');
      setStep('quote');
    }
  };

  const reset = () => {
    setStep('form');
    setQuote(null);
    setError('');
    setAmount('');
  };

  const countdownColor =
    secondsRemaining > 30 ? colors.accent :
    secondsRemaining > 10 ? colors.warning :
    colors.danger;

  const pickerData: FxCurrency[] =
    activePicker === 'buy' ? buyCurrencies :
    activePicker === 'sell' ? sellCurrencies :
    activePicker === 'amountCcy' ? [
      buyCurrencies.find((c) => c.currencyCode === buyCcy),
      sellCurrencies.find((c) => c.currencyCode === sellCcy),
    ].filter(Boolean) as FxCurrency[] : [];

  const handlePickerSelect = (code: string) => {
    if (activePicker === 'buy') setBuyCcy(code);
    else if (activePicker === 'sell') { setSellCcy(code); setAmountCcy(code); }
    else if (activePicker === 'amountCcy') setAmountCcy(code);
    setActivePicker(null);
  };

  const activePickerSelected =
    activePicker === 'buy' ? buyCcy :
    activePicker === 'sell' ? sellCcy :
    amountCcy;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Exchange</Text>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── FORM ── */}
      {step === 'form' && (
        <View style={styles.card}>
          <Text style={styles.label}>To Currency</Text>
          <Pressable style={styles.picker} onPress={() => setActivePicker('buy')}>
            <Text style={styles.pickerCode}>{buyCcy || 'Select'}</Text>
            <Text style={styles.pickerName}>
              {buyCurrencies.find((c) => c.currencyCode === buyCcy)?.currencyName ?? ''}
            </Text>
            <Text style={styles.chevron}>▾</Text>
          </Pressable>

          <Text style={styles.label}>From Currency</Text>
          <Pressable style={styles.picker} onPress={() => setActivePicker('sell')}>
            <Text style={styles.pickerCode}>{sellCcy || 'Select'}</Text>
            <Text style={styles.pickerName}>
              {sellCurrencies.find((c) => c.currencyCode === sellCcy)?.currencyName ?? ''}
            </Text>
            <Text style={styles.chevron}>▾</Text>
          </Pressable>

          {buyCcy === sellCcy && buyCcy !== '' && (
            <Text style={styles.warning}>From and To currencies must differ.</Text>
          )}

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Amount Currency</Text>
          <Pressable style={styles.picker} onPress={() => setActivePicker('amountCcy')}>
            <Text style={styles.pickerCode}>{amountCcy || 'Select'}</Text>
            <Text style={styles.chevron}>▾</Text>
          </Pressable>

          <Pressable
            style={[styles.button, !isFormValid && styles.buttonDisabled]}
            disabled={!isFormValid}
            onPress={handleGetQuote}
          >
            <Text style={styles.buttonText}>Get Quote</Text>
          </Pressable>
        </View>
      )}

      {/* ── LOADING ── */}
      {(step === 'quoting' || step === 'booking') && (
        <View style={[styles.card, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>
            {step === 'quoting' ? 'Requesting quote…' : 'Booking deal…'}
          </Text>
        </View>
      )}

      {/* ── QUOTE ── */}
      {step === 'quote' && quote && (
        <View style={styles.card}>
          <View style={styles.countdownRow}>
            <Text style={styles.sectionTitle}>Your Quote</Text>
            <View style={[styles.countdownBadge, { borderColor: countdownColor }]}>
              <Text style={[styles.countdownText, { color: countdownColor }]}>
                ⏱ {formatCountdown(secondsRemaining)}
              </Text>
            </View>
          </View>
          <QuoteRow label="Symbol" value={quote.symbol} />
          <QuoteRow label="Rate" value={quote.rate} highlight />
          <QuoteRow label="You receive" value={`${formatCurrency(parseFloat(quote.buyAmount))} ${quote.buyCurrencyCode}`} />
          <QuoteRow label="You pay" value={`${formatCurrency(parseFloat(quote.sellAmount))} ${quote.sellCurrencyCode}`} />
          <QuoteRow label="Deal type" value={quote.dealType} />
          <QuoteRow label="Value date" value={quote.valueDate} />
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={reset}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonFlex]} onPress={handleBookDeal}>
              <Text style={styles.buttonText}>Book Deal</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── EXPIRED ── */}
      {step === 'expired' && (
        <View style={[styles.card, styles.centered]}>
          <Text style={styles.expiredIcon}>⏰</Text>
          <Text style={styles.sectionTitle}>Quote Expired</Text>
          <Text style={styles.processingText}>The rate has expired. Request a new quote.</Text>
          <Pressable style={[styles.button, { marginTop: spacing.md }]} onPress={() => setStep('form')}>
            <Text style={styles.buttonText}>New Quote</Text>
          </Pressable>
        </View>
      )}

      {/* ── SUCCESS ── */}
      {step === 'success' && quote && (
        <View style={styles.card}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Deal Booked!</Text>
          <QuoteRow label="Deal reference" value={dealRef} />
          <QuoteRow label="Deposit reference" value={depositRef} />
          <QuoteRow label="You received" value={`${formatCurrency(parseFloat(quote.buyAmount))} ${quote.buyCurrencyCode}`} />
          <QuoteRow label="You paid" value={`${formatCurrency(parseFloat(quote.sellAmount))} ${quote.sellCurrencyCode}`} />
          <QuoteRow label="Rate" value={quote.rate} highlight />
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.buttonFlex]} onPress={reset}>
              <Text style={styles.buttonText}>New Exchange</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.buttonFlex]}
              onPress={() => router.push('/(app)/history/convert' as any)}
            >
              <Text style={styles.secondaryButtonText}>View History</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── CURRENCY PICKER MODAL ── */}
      <Modal visible={activePicker !== null} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setActivePicker(null)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {activePicker === 'buy' ? 'To Currency' :
               activePicker === 'sell' ? 'From Currency' : 'Amount Currency'}
            </Text>
            <FlatList
              data={pickerData}
              keyExtractor={(item) => item.currencyCode}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.currencyCode === activePickerSelected && styles.optionActive]}
                  onPress={() => handlePickerSelect(item.currencyCode)}
                >
                  <Text style={styles.optionCode}>{item.currencyCode}</Text>
                  <Text style={styles.optionName}>{item.currencyName}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function QuoteRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.quoteRow}>
      <Text style={styles.quoteLabel}>{label}</Text>
      <Text style={[styles.quoteValue, highlight && styles.quoteHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },

  label: { fontSize: typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  picker: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center',
  },
  pickerCode: { fontSize: typography.body, fontWeight: '700', color: colors.textPrimary, marginRight: spacing.sm },
  pickerName: { flex: 1, fontSize: typography.small, color: colors.textSecondary },
  chevron: { color: colors.primary },
  warning: { fontSize: typography.caption, color: colors.danger },

  input: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: typography.body,
  },

  button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonFlex: { flex: 1 },
  buttonText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: '600' },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  secondaryButtonText: { color: colors.textSecondary, fontSize: typography.body },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },

  sectionTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  processingText: { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },

  countdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdownBadge: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  countdownText: { fontSize: typography.small, fontWeight: '700' },

  quoteRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  quoteLabel: { fontSize: typography.small, color: colors.textSecondary },
  quoteValue: { fontSize: typography.small, color: colors.textPrimary, fontWeight: '500' },
  quoteHighlight: { color: colors.accent, fontWeight: '700', fontSize: typography.body },

  successIcon: { fontSize: 40, textAlign: 'center', color: colors.accent },
  expiredIcon: { fontSize: 40, textAlign: 'center' },

  errorBox: {
    backgroundColor: `${colors.danger}22`, borderWidth: 1,
    borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: typography.small },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', maxHeight: 420 },
  modalTitle: {
    fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  option: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' },
  optionActive: { backgroundColor: `${colors.primary}22` },
  optionCode: { fontSize: typography.body, fontWeight: '700', color: colors.textPrimary, width: 56 },
  optionName: { fontSize: typography.small, color: colors.textSecondary, flex: 1 },
});
