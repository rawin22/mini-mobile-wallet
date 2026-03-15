import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../src/hooks/useLanguage';
import { paymentHistoryService } from '../../../src/api/payment-history.service';
import { formatCurrency, formatDateTime } from '../../../src/utils/formatters';
import type { PaymentSearchRecord } from '../../../src/types/payment.types';
import { CurrencyIcon } from '../../../components/ui';
import { colors, spacing, typography, radius } from '../../../src/theme';

export default function PaymentHistoryScreen() {
  const { t } = useLanguage();
  const [payments, setPayments] = useState<PaymentSearchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPayments = useCallback(async (showRefresh = false) => {
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await paymentHistoryService.searchPayments();
      setPayments(response.records?.payments ?? []);
    } catch {
      setError(t('history.paymentsLoadError') || 'Could not load payments. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'posted' || s === 'completed') return colors.accent;
    if (s === 'failed' || s === 'rejected') return colors.danger;
    return colors.warning;
  };

  const renderItem = ({ item }: { item: PaymentSearchRecord }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <CurrencyIcon code={item.currencyCode} size={32} />
        <View style={styles.flex}>
          <Text style={styles.ref} numberOfLines={1}>{item.paymentReference}</Text>
          <Text style={styles.parties} numberOfLines={1}>
            {item.fromCustomerAlias} → {item.toCustomerAlias}
          </Text>
          <Text style={styles.date}>{formatDateTime(item.createdTime)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>
            {item.currencyCode} {formatCurrency(item.amount)}
          </Text>
          <View style={[styles.badge, { backgroundColor: `${statusColor(item.status)}22` }]}>
            <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
      {!!item.memo && (
        <Text style={styles.memo} numberOfLines={1}>Memo: {item.memo}</Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={payments}
      keyExtractor={(item) => item.paymentId}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchPayments(true)}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <Text style={styles.title}>{t('history.paymentsTitle') || 'Payment History'}</Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{error || t('history.noPayments') || 'No payments found.'}</Text>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  ref: { fontSize: typography.small, fontWeight: '600', color: colors.textPrimary },
  parties: { fontSize: typography.caption, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: typography.caption, fontWeight: '600' },
  memo: { fontSize: typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  separator: { height: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
});
