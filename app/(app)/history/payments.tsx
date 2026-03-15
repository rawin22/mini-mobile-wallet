import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Pressable,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/hooks/useAuth';
import { useLanguage } from '../../../src/hooks/useLanguage';
import { paymentHistoryService } from '../../../src/api/payment-history.service';
import { formatCurrency, formatDateTime } from '../../../src/utils/formatters';
import type { PaymentSearchRecord } from '../../../src/types/payment.types';
import { CurrencyIcon } from '../../../components/ui';
import { colors, spacing, typography, radius } from '../../../src/theme';

const PAGE_SIZE = 25;

export default function PaymentHistoryScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [payments, setPayments] = useState<PaymentSearchRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'posted' | 'created' | 'voided'>('');

  const currentUserAlias = user?.userName || '';

  const fetchPayments = useCallback(async (page: number, showRefresh = false) => {
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await paymentHistoryService.searchPayments({
        pageIndex: page,
        pageSize: PAGE_SIZE,
      });
      setPayments(response.records?.payments ?? []);
      setTotalCount(response.records?.totalRecords ?? 0);
    } catch {
      setError(t('history.paymentsLoadError') || 'Could not load payments. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => { fetchPayments(currentPage); }, [fetchPayments, currentPage]);

  // Client-side filtering
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter && p.status.toLowerCase() !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (p.fromCustomerAlias || '').toLowerCase().includes(term) ||
          (p.toCustomerAlias || '').toLowerCase().includes(term) ||
          (p.paymentReference || '').toLowerCase().includes(term) ||
          (p.memo || '').toLowerCase().includes(term) ||
          (p.fromCustomerName || '').toLowerCase().includes(term) ||
          (p.toCustomerName || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [payments, statusFilter, searchTerm]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'posted' || s === 'completed') return colors.accent;
    if (s === 'voided' || s === 'failed' || s === 'rejected') return colors.danger;
    return colors.warning;
  };

  const statusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'posted') return 'Paid';
    if (s === 'created') return 'Pending';
    if (s === 'voided') return 'Cancelled';
    return status;
  };

  const isOutgoing = (item: PaymentSearchRecord) =>
    item.fromCustomerAlias?.toLowerCase() === currentUserAlias.toLowerCase();

  const renderItem = ({ item }: { item: PaymentSearchRecord }) => {
    const outgoing = isOutgoing(item);
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <CurrencyIcon code={item.currencyCode} size={32} />
          <View style={styles.flex}>
            <Text style={styles.parties} numberOfLines={1}>
              {outgoing
                ? `To: ${item.toCustomerAlias}`
                : `From: ${item.fromCustomerAlias}`}
            </Text>
            <Text style={styles.ref} numberOfLines={1}>{item.paymentReference}</Text>
            <Text style={styles.date}>{formatDateTime(item.createdTime)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.amount, outgoing ? styles.debit : styles.credit]}>
              {outgoing ? '-' : '+'}{formatCurrency(item.amount ?? 0)} {item.currencyCode}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${statusColor(item.status)}22` }]}>
              <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>
        {!!item.memo && (
          <Text style={styles.memo} numberOfLines={1}>📝 {item.memo}</Text>
        )}
      </View>
    );
  };

  if (isLoading && currentPage === 0) {
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
      data={filteredPayments}
      keyExtractor={(item) => item.paymentId}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { setCurrentPage(0); fetchPayments(0, true); }}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{t('history.paymentsTitle') || 'Payment History'}</Text>

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search name, reference, memo..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchTerm !== '' && (
              <Pressable onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Status filter buttons */}
          <View style={styles.filterRow}>
            {([
              { key: '' as const, label: 'All' },
              { key: 'posted' as const, label: 'Paid' },
              { key: 'created' as const, label: 'Pending' },
              { key: 'voided' as const, label: 'Cancelled' },
            ]).map((f) => (
              <Pressable
                key={f.key}
                style={[styles.filterBtn, statusFilter === f.key && styles.filterBtnActive]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Text style={[styles.filterBtnText, statusFilter === f.key && styles.filterBtnTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.resultsInfo}>
            Showing {filteredPayments.length} of {totalCount} payments
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{error || t('history.noPayments') || 'No payments found.'}</Text>
      }
      ListFooterComponent={
        totalPages > 1 ? (
          <View style={styles.pagination}>
            <Pressable
              style={[styles.pageBtn, currentPage === 0 && styles.pageBtnDisabled]}
              disabled={currentPage === 0}
              onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
            >
              <Ionicons name="chevron-back" size={16} color={currentPage === 0 ? colors.textMuted : colors.primary} />
              <Text style={[styles.pageBtnText, currentPage === 0 && styles.pageBtnTextDisabled]}>Previous</Text>
            </Pressable>
            <Text style={styles.pageInfo}>Page {currentPage + 1} of {totalPages}</Text>
            <Pressable
              style={[styles.pageBtn, currentPage >= totalPages - 1 && styles.pageBtnDisabled]}
              disabled={currentPage >= totalPages - 1}
              onPress={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <Text style={[styles.pageBtnText, currentPage >= totalPages - 1 && styles.pageBtnTextDisabled]}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages - 1 ? colors.textMuted : colors.primary} />
            </Pressable>
          </View>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: { gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  searchInput: { flex: 1, fontSize: typography.small, color: colors.textPrimary, paddingVertical: 4 },

  // Filters
  filterRow: { flexDirection: 'row', gap: spacing.xs },
  filterBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: '600' },
  filterBtnTextActive: { color: colors.textPrimary },
  resultsInfo: { fontSize: typography.caption, color: colors.textMuted },

  // Cards
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  parties: { fontSize: typography.small, fontWeight: '600', color: colors.textPrimary },
  ref: { fontSize: typography.caption, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: typography.small, fontWeight: 'bold' },
  credit: { color: colors.accent },
  debit: { color: colors.danger },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: typography.caption, fontWeight: '600' },
  memo: { fontSize: typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  separator: { height: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },

  // Pagination
  pagination: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.md, paddingVertical: spacing.sm,
  },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: typography.small, color: colors.primary, fontWeight: '600' },
  pageBtnTextDisabled: { color: colors.textMuted },
  pageInfo: { fontSize: typography.caption, color: colors.textSecondary },
});
