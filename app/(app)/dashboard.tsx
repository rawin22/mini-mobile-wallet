import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Pressable, RefreshControl, Switch, TextInput, Modal, FlatList,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { balanceService } from '../../src/api/balance.service';
import { paymentHistoryService } from '../../src/api/payment-history.service';
import { fxService } from '../../src/api/fx.service';
import { fxHistoryService } from '../../src/api/fx-history.service';
import type { CustomerBalanceData } from '../../src/types/balance.types';
import type { FxCurrency, FxDealSearchRecord } from '../../src/types/fx.types';
import { formatCurrency, formatDateTime } from '../../src/utils/formatters';
import { storage } from '../../src/utils/storage';
import { CurrencyIcon, PinEntryModal } from '../../components/ui';
import { colors, spacing, typography, radius, gradients, shadows } from '../../src/theme';

interface RecentRecipient {
  alias: string;
  name: string;
  currencyCode: string;
}

const SPARKLINE_PATH = 'M0,20 Q10,18 20,15 T40,12 T60,16 T80,10 T100,8 T120,12 T140,6 T160,9 T180,4 T200,7';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Balance state
  const [balances, setBalances] = useState<CustomerBalanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [hideZero, setHideZero] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Recent recipients
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);

  // Recent FX deals
  const [recentDeals, setRecentDeals] = useState<FxDealSearchRecord[]>([]);

  // Converter state
  const [sellCcy, setSellCcy] = useState('');
  const [buyCcy, setBuyCcy] = useState('');
  const [converterAmount, setConverterAmount] = useState('1');
  const [converterResult, setConverterResult] = useState('');
  const [converterRate, setConverterRate] = useState('');
  const [converterLoading, setConverterLoading] = useState(false);
  const [sellCurrencies, setSellCurrencies] = useState<FxCurrency[]>([]);
  const [buyCurrencies, setBuyCurrencies] = useState<FxCurrency[]>([]);
  const [showSellPicker, setShowSellPicker] = useState(false);
  const [showBuyPicker, setShowBuyPicker] = useState(false);
  const [quickExchangeLoading, setQuickExchangeLoading] = useState(false);
  const [quickExchangeResult, setQuickExchangeResult] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // Load persisted filter state
  useEffect(() => {
    storage.getFavoriteCurrencies().then(setFavorites);
    storage.getHideZeroBalances().then(setHideZero);
  }, []);

  // Fetch balances
  const fetchBalances = useCallback(async (showRefresh = false) => {
    if (!user?.organizationId) return;
    console.log('[Dashboard] Fetching balances for org:', user.organizationId);
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await balanceService.getBalances(user.organizationId!);
      const list = response.balances ?? [];
      console.log('[Dashboard] Loaded', list.length, 'balance(s)');
      setBalances(list);
    } catch (err) {
      console.error('[Dashboard] Balance fetch failed:', err);
      setError(t('dashboard.loadError') || 'Could not load balances. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.organizationId, t]);

  // Fetch recent recipients from payment history — always live, never cached
  const fetchRecipients = useCallback(async () => {
    if (!user) return;
    try {
      const response = await paymentHistoryService.searchPayments();
      console.log('[Dashboard] Payment search response:', JSON.stringify(response).slice(0, 500));
      const payments = response.records?.payments ?? [];
      console.log('[Dashboard] Found', payments.length, 'payments');

      const seen = new Set<string>();
      const recipients: RecentRecipient[] = [];
      for (const p of payments) {
        const alias = p.toCustomerAlias;
        if (alias && !seen.has(alias) && alias !== user?.userName) {
          seen.add(alias);
          recipients.push({
            alias,
            name: alias,
            currencyCode: p.currencyCode,
          });
          if (recipients.length >= 5) break;
        }
      }
      console.log('[Dashboard] Extracted', recipients.length, 'unique recipients');
      setRecentRecipients(recipients);
    } catch (err) {
      console.log('[Dashboard] Could not load recent recipients:', err);
    }
  }, [user]);

  // Fetch FX currencies for converter
  const fetchFxCurrencies = useCallback(async () => {
    if (!user) return;
    try {
      const [sellRes, buyRes] = await Promise.all([
        fxService.getSellCurrencies(),
        fxService.getBuyCurrencies(),
      ]);
      const allSell = sellRes.currencies ?? [];
      const buy = buyRes.currencies ?? [];
      // Only show sell currencies the user actually holds
      const balanceCodes = new Set(balances.filter((b) => b.balanceAvailable > 0).map((b) => b.currencyCode));
      const sell = balanceCodes.size > 0 ? allSell.filter((c) => balanceCodes.has(c.currencyCode)) : allSell;
      console.log('[Dashboard] FX sell currencies:', sell.length, '(of', allSell.length, ') | buy:', buy.length);
      setSellCurrencies(sell.length > 0 ? sell : allSell);
      setBuyCurrencies(buy);

      // Default: sell = user's baseCurrency, buy = first different one
      const baseCcy = user?.baseCurrencyCode || 'USD';
      if (!sellCcy) {
        const defaultSell = sell.find((c) => c.currencyCode === baseCcy) ? baseCcy : sell[0]?.currencyCode ?? '';
        setSellCcy(defaultSell);
        const defaultBuy = buy.find((c) => c.currencyCode !== defaultSell)?.currencyCode ?? buy[0]?.currencyCode ?? '';
        setBuyCcy(defaultBuy);
      }
    } catch (err) {
      console.log('[Dashboard] Could not load FX currencies:', err);
    }
  }, [user]);

  // Fetch recent FX deals (last 5)
  const fetchRecentDeals = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fxHistoryService.searchDeals({ pageIndex: 0, pageSize: 5 });
      setRecentDeals(response.fxDeals ?? []);
      console.log('[Dashboard] Recent FX deals:', (response.fxDeals ?? []).length);
    } catch (err) {
      console.log('[Dashboard] Could not load recent FX deals:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.organizationId) return;
    fetchBalances();
    fetchRecipients();
    fetchFxCurrencies();
    fetchRecentDeals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  // Converter: get quote with debounce
  const getConverterQuote = useCallback(async () => {
    if (!sellCcy || !buyCcy || !converterAmount) {
      setConverterResult('');
      return;
    }
    const amt = parseFloat(converterAmount);
    if (isNaN(amt) || amt <= 0) {
      setConverterResult('');
      return;
    }
    setConverterLoading(true);
    try {
      const res = await fxService.getQuote({
        sellCurrencyCode: sellCcy,
        buyCurrencyCode: buyCcy,
        amount: amt,
        amountCurrencyCode: sellCcy,
        dealType: 'SPOT',
        windowOpenDate: '',
        finalValueDate: '',
        isForCurrencyCalculator: true,
      });
      if (res.quote) {
        setConverterResult(res.quote.buyAmount);
        setConverterRate(res.quote.rate);
        console.log('[Dashboard] FX quote:', sellCcy, '→', buyCcy, 'rate:', res.quote.rate);
      }
    } catch (err) {
      console.log('[Dashboard] FX quote failed:', err);
      setConverterResult('--');
      setConverterRate('');
    } finally {
      setConverterLoading(false);
    }
  }, [sellCcy, buyCcy, converterAmount]);

  useEffect(() => {
    const timer = setTimeout(getConverterQuote, 600);
    return () => clearTimeout(timer);
  }, [getConverterQuote]);

  // Quick Exchange: get real quote + book in one go
  const handleQuickExchange = async () => {
    if (!sellCcy || !buyCcy || sellCcy === buyCcy) return;
    const amt = parseFloat(converterAmount);
    if (isNaN(amt) || amt <= 0) return;

    setQuickExchangeLoading(true);
    setQuickExchangeResult('');
    try {
      // Step 1: Get a real (non-calculator) quote
      const quoteRes = await fxService.getQuote({
        sellCurrencyCode: sellCcy,
        buyCurrencyCode: buyCcy,
        amount: amt,
        amountCurrencyCode: sellCcy,
        dealType: 'SPOT',
        windowOpenDate: '',
        finalValueDate: '',
        isForCurrencyCalculator: false,
      });
      if (quoteRes.problems) {
        setQuickExchangeResult(`Error: ${quoteRes.problems}`);
        return;
      }
      // Step 2: Book immediately
      const bookRes = await fxService.bookDeal(quoteRes.quote.quoteId);
      if (bookRes.problems) {
        setQuickExchangeResult(`Error: ${bookRes.problems}`);
        return;
      }
      const ref = bookRes.fxDepositData.fxDealReference;
      setQuickExchangeResult(`Done! ${formatCurrency(parseFloat(quoteRes.quote.sellAmount))} ${sellCcy} → ${formatCurrency(parseFloat(quoteRes.quote.buyAmount))} ${buyCcy} (${ref})`);
      console.log('[Dashboard] Quick exchange booked:', ref);
      // Refresh balances and deals
      fetchBalances();
      fetchRecentDeals();
    } catch (err) {
      console.log('[Dashboard] Quick exchange failed:', err);
      setQuickExchangeResult('Exchange failed. Please try again.');
    } finally {
      setQuickExchangeLoading(false);
    }
  };

  // Filter balances
  const filteredBalances = balances.filter((b) => {
    if (hideZero && (b.balanceAvailable ?? 0) === 0) return false;
    if (favoritesOnly && !favorites.includes(b.currencyCode)) return false;
    return true;
  });

  const usdTotal = filteredBalances.reduce((sum, b) => sum + (b.balanceAvailableBase ?? 0), 0);
  const baseCcy = user?.baseCurrencyCode || balances[0]?.baseCurrencyCode || 'USD';

  const toggleFavorite = async (code: string) => {
    const next = favorites.includes(code)
      ? favorites.filter((c) => c !== code)
      : [...favorites, code];
    setFavorites(next);
    await storage.saveFavoriteCurrencies(next);
  };

  const toggleHideZero = async (val: boolean) => {
    setHideZero(val);
    await storage.setHideZeroBalances(val);
  };

  const onRefresh = () => {
    fetchBalances(true);
    fetchRecipients();
    fetchRecentDeals();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ── Hero: USD Equivalent ── */}
      <LinearGradient colors={gradients.hero} style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>{baseCcy} {t('dashboard.equivalent') || 'EQUIVALENT'}</Text>
            <Text style={styles.heroAmount}>{formatCurrency(usdTotal)}</Text>
          </View>
          <Pressable onPress={logout}>
            <Text style={styles.logout}>{t('nav.logout') || 'Sign out'}</Text>
          </Pressable>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.heroWelcome}>
            {t('dashboard.welcome', { name: user?.firstName ?? '' }) || `Welcome, ${user?.firstName ?? ''}`}
          </Text>
          <Svg width={120} height={24} viewBox="0 0 200 24">
            <Path d={SPARKLINE_PATH} fill="none" stroke={colors.accent} strokeWidth={2} opacity={0.6} />
          </Svg>
        </View>
      </LinearGradient>

      {/* ── Filters ── */}
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>{t('dashboard.hideZero') || 'Hide 0 Bal.'}</Text>
          <Switch
            value={hideZero}
            onValueChange={toggleHideZero}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={hideZero ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>{t('dashboard.favoritesOnly') || 'Favorites'}</Text>
          <Switch
            value={favoritesOnly}
            onValueChange={setFavoritesOnly}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={favoritesOnly ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      {/* ── Balance Cards ── */}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {filteredBalances.length === 0 ? (
        <Text style={styles.empty}>{t('dashboard.noBalances') || 'No accounts match filters.'}</Text>
      ) : (
        filteredBalances.map((item) => {
          const isFav = favorites.includes(item.currencyCode);
          return (
            <Pressable
              key={item.accountId}
              style={({ pressed }) => [styles.cardWrapper, pressed && styles.cardPressed]}
              onPress={() => router.push(`/(app)/statement/${item.accountId}` as any)}
            >
              <LinearGradient colors={gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
                <CurrencyIcon code={item.currencyCode} size={32} />
                <View style={styles.cardBody}>
                  <Text style={styles.currency}>{item.currencyCode}</Text>
                  <Text style={styles.accountId} numberOfLines={1}>{item.accountNumber || item.accountId}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.balance}>{formatCurrency(item.balanceAvailable ?? 0)}</Text>
                  {item.baseCurrencyCode && item.currencyCode !== item.baseCurrencyCode && (
                    <Text style={styles.balanceBase}>≈ {formatCurrency(item.balanceAvailableBase ?? 0)} {item.baseCurrencyCode}</Text>
                  )}
                </View>
                <Pressable onPress={() => toggleFavorite(item.currencyCode)} hitSlop={8}>
                  <Ionicons
                    name={isFav ? 'star' : 'star-outline'}
                    size={18}
                    color={isFav ? colors.warning : colors.textMuted}
                  />
                </Pressable>
              </LinearGradient>
            </Pressable>
          );
        })
      )}

      {/* ── Quick Pay: Recent Recipients ── */}
      {recentRecipients.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.quickPay') || 'QuickPay'}</Text>
            <Pressable onPress={() => router.push('/(app)/history/payments' as any)}>
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientRow}>
            {recentRecipients.map((r) => (
              <Pressable
                key={r.alias}
                style={styles.recipientItem}
                onPress={() => router.push({ pathname: '/(app)/pay-now', params: { recipient: r.alias } } as any)}
              >
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientInitials}>
                    {(r.name || r.alias).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.recipientName} numberOfLines={1}>{r.name || r.alias}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Recent Exchanges ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Exchanges</Text>
          <Pressable onPress={() => router.push('/(app)/history/convert' as any)}>
            <Text style={styles.viewAllLink}>View All</Text>
          </Pressable>
        </View>
        {recentDeals.length === 0 ? (
          <Pressable style={styles.dealCard} onPress={() => router.push('/(app)/exchange' as any)}>
            <Text style={styles.dealDate}>No recent exchanges. Tap to make one.</Text>
          </Pressable>
        ) : (
          recentDeals.map((deal) => (
            <View key={deal.fxDealId} style={styles.dealCard}>
              <View style={styles.dealTop}>
                <View style={styles.dealCcyRow}>
                  <CurrencyIcon code={deal.sellCurrencyCode} size={20} />
                  <Text style={styles.dealDebit}>-{formatCurrency(deal.sellAmount ?? 0)} {deal.sellCurrencyCode}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                  <Text style={styles.dealCredit}>+{formatCurrency(deal.buyAmount ?? 0)} {deal.buyCurrencyCode}</Text>
                  <CurrencyIcon code={deal.buyCurrencyCode} size={20} />
                </View>
              </View>
              <View style={styles.dealBottom}>
                <Text style={styles.dealDate}>{formatDateTime(deal.bookedTime)}</Text>
                <Text style={styles.dealRate}>{deal.bookedRateTextWithCurrencyCodes || `Rate: ${deal.bookedRate}`}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Currency Converter Widget ── */}
      {sellCurrencies.length > 0 && buyCurrencies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.converter') || 'Quick Convert'}</Text>
          <View style={styles.converterCard}>
            {/* From row */}
            <Text style={styles.converterLabel}>From:</Text>
            <View style={styles.converterRow}>
              <Pressable style={styles.ccyPicker} onPress={() => setShowSellPicker(true)}>
                <CurrencyIcon code={sellCcy} size={24} />
                <Text style={styles.ccyPickerText}>{sellCcy}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </Pressable>
              <TextInput
                style={styles.converterInput}
                value={converterAmount}
                onChangeText={(txt) => {
                  setConverterAmount(txt);
                  setConverterResult('');
                }}
                keyboardType="decimal-pad"
                placeholder="1.00"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
              />
            </View>

            {/* Arrow + rate */}
            <View style={styles.converterMiddle}>
              <Pressable
                style={styles.swapBtn}
                onPress={() => {
                  setSellCcy(buyCcy);
                  setBuyCcy(sellCcy);
                  setConverterResult('');
                }}
              >
                <Ionicons name="swap-vertical" size={18} color={colors.primary} />
              </Pressable>
              {!!converterRate && (
                <Text style={styles.converterRateText}>1 {sellCcy} = {converterRate} {buyCcy}</Text>
              )}
            </View>

            {/* To row */}
            <Text style={styles.converterLabel}>To:</Text>
            <View style={styles.converterRow}>
              <Pressable style={styles.ccyPicker} onPress={() => setShowBuyPicker(true)}>
                <CurrencyIcon code={buyCcy} size={24} />
                <Text style={styles.ccyPickerText}>{buyCcy}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </Pressable>
              <View style={styles.converterResultBox}>
                {converterLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.converterResultText}>{converterResult || '—'}</Text>
                )}
              </View>
            </View>

            {/* Quick Exchange result */}
            {quickExchangeResult !== '' && (
              <Text style={styles.quickExchangeResult}>{quickExchangeResult}</Text>
            )}

            {/* Exchange button */}
            <Pressable
              style={[styles.exchangeBtn, (quickExchangeLoading || !converterResult || converterResult === '--' || sellCcy === buyCcy) && styles.exchangeBtnDisabled]}
              disabled={quickExchangeLoading || !converterResult || converterResult === '--' || sellCcy === buyCcy}
              onPress={() => {
                if (storage.hasPin()) {
                  setShowPinModal(true);
                } else {
                  handleQuickExchange();
                }
              }}
            >
              {quickExchangeLoading ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <Text style={styles.exchangeBtnText}>Exchange Now</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <PinEntryModal
        visible={showPinModal}
        title="Enter PIN to Exchange"
        onSuccess={() => { setShowPinModal(false); handleQuickExchange(); }}
        onCancel={() => setShowPinModal(false)}
      />

      {/* ── Sell Currency Picker Modal ── */}
      <Modal visible={showSellPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowSellPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>From Currency</Text>
            <FlatList
              data={sellCurrencies}
              keyExtractor={(item) => item.currencyCode}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalOption, item.currencyCode === sellCcy && styles.modalOptionActive]}
                  onPress={() => { setSellCcy(item.currencyCode); setShowSellPicker(false); setConverterResult(''); }}
                >
                  <CurrencyIcon code={item.currencyCode} size={24} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionText}>{item.currencyCode}</Text>
                    <Text style={styles.modalOptionSub}>{item.currencyName}</Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ── Buy Currency Picker Modal ── */}
      <Modal visible={showBuyPicker} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowBuyPicker(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>To Currency</Text>
            <FlatList
              data={buyCurrencies}
              keyExtractor={(item) => item.currencyCode}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalOption, item.currencyCode === buyCcy && styles.modalOptionActive]}
                  onPress={() => { setBuyCcy(item.currencyCode); setShowBuyPicker(false); setConverterResult(''); }}
                >
                  <CurrencyIcon code={item.currencyCode} size={24} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionText}>{item.currencyCode}</Text>
                    <Text style={styles.modalOptionSub}>{item.currencyName}</Text>
                  </View>
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
  content: { padding: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.sm },
  loader: { marginTop: spacing.xxl },

  // Hero
  heroCard: {
    borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.card,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: typography.caption, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  heroAmount: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, marginTop: 2 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroWelcome: { fontSize: typography.small, color: colors.textSecondary },
  logout: { fontSize: typography.caption, color: colors.danger },

  // Filters
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterItem: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  filterLabel: { fontSize: typography.caption, color: colors.textSecondary },

  // Balance cards
  error: { color: colors.danger, fontSize: typography.caption, textAlign: 'center' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
  cardWrapper: { width: '100%' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg,
    padding: spacing.sm, gap: spacing.sm, ...shadows.card,
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardBody: { flex: 1, gap: 2 },
  cardRight: { alignItems: 'flex-end', gap: 2, marginRight: spacing.xs },
  currency: { fontSize: typography.body, fontWeight: 'bold', color: colors.primary },
  balance: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  balanceBase: { fontSize: typography.caption, color: colors.textMuted },
  accountId: { fontSize: typography.caption, color: colors.textMuted },

  // Sections
  section: { marginTop: spacing.sm },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm, paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.small, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, paddingHorizontal: spacing.xs,
  },
  viewAllLink: { fontSize: typography.caption, color: colors.primary, fontWeight: '600' },

  // Recent Deals
  dealCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.xs,
  },
  dealTop: {},
  dealCcyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dealDebit: { fontSize: typography.small, fontWeight: '600', color: colors.danger, flex: 1 },
  dealCredit: { fontSize: typography.small, fontWeight: '600', color: colors.accent, flex: 1, textAlign: 'right' },
  dealBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  dealDate: { fontSize: typography.caption, color: colors.textMuted },
  dealRate: { fontSize: typography.caption, color: colors.textSecondary },

  // Quick Pay
  recipientRow: { gap: spacing.md, paddingHorizontal: spacing.xs },
  recipientItem: { alignItems: 'center', width: 64 },
  recipientAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  recipientInitials: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  recipientName: { fontSize: typography.caption, color: colors.textSecondary, textAlign: 'center' },

  // Converter
  converterCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  converterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ccyPicker: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    minWidth: 100,
  },
  ccyPickerText: { fontSize: typography.small, fontWeight: '600', color: colors.textPrimary },
  converterInput: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.sm, color: colors.textPrimary, fontSize: typography.body,
    textAlign: 'right', borderWidth: 1, borderColor: colors.border,
  },
  converterMiddle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs,
  },
  swapBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center',
  },
  converterLabel: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: '600' },
  converterRateText: { fontSize: typography.caption, color: colors.textMuted },
  converterResultBox: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'flex-end', borderWidth: 1, borderColor: colors.border,
    minHeight: 40, justifyContent: 'center',
  },
  converterResultText: { fontSize: typography.body, fontWeight: '600', color: colors.accent },
  exchangeBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', marginTop: spacing.xs,
  },
  exchangeBtnDisabled: { opacity: 0.4 },
  exchangeBtnText: { color: colors.textPrimary, fontSize: typography.small, fontWeight: '700' },
  quickExchangeResult: { fontSize: typography.caption, color: colors.accent, textAlign: 'center' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', maxHeight: 400 },
  modalTitle: {
    fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalOptionActive: { backgroundColor: `${colors.primary}22` },
  modalOptionText: { fontSize: typography.body, color: colors.textPrimary },
  modalOptionSub: { fontSize: typography.caption, color: colors.textMuted },
});
