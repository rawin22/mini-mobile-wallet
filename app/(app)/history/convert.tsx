import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Pressable,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../../src/hooks/useLanguage';
import { fxHistoryService } from '../../../src/api/fx-history.service';
import { formatCurrency, formatDateTime } from '../../../src/utils/formatters';
import type { FxDealSearchRecord } from '../../../src/types/fx.types';
import { CurrencyIcon } from '../../../components/ui';
import { colors, spacing, typography, radius } from '../../../src/theme';

const PAGE_SIZE = 25;

type StatusKey = '' | 'settled' | 'pending' | 'cancelled';

export default function ConvertHistoryScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [deals, setDeals] = useState<FxDealSearchRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('');

  const fetchDeals = useCallback(async (page: number, showRefresh = false) => {
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await fxHistoryService.searchDeals({
        pageIndex: page,
        pageSize: PAGE_SIZE,
      });
      setDeals(response.fxDeals ?? []);
      setTotalCount(response.totalRecords ?? 0);
    } catch {
      setError(t('history.exchangeLoadError') || 'Could not load FX history. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => { fetchDeals(currentPage); }, [fetchDeals, currentPage]);

  // Status helpers
  const getStatusCategory = (typeName: string): string => {
    const s = typeName.toLowerCase();
    if (s.includes('settled') || s.includes('completed')) return 'settled';
    if (s.includes('booked') || s.includes('pending') || s.includes('spot')) return 'pending';
    if (s.includes('cancelled') || s.includes('expired') || s.includes('voided')) return 'cancelled';
    return 'pending';
  };

  const statusColor = (typeName: string) => {
    const cat = getStatusCategory(typeName);
    if (cat === 'settled') return colors.accent;
    if (cat === 'cancelled') return colors.danger;
    return colors.warning;
  };

  const statusLabel = (typeName: string) => {
    const cat = getStatusCategory(typeName);
    if (cat === 'settled') return 'Settled';
    if (cat === 'cancelled') return 'Cancelled';
    return 'Pending';
  };

  // Client-side filtering
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (statusFilter && getStatusCategory(d.fxDealTypeName) !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (d.fxDealReference || '').toLowerCase().includes(term) ||
          (d.buyCurrencyCode || '').toLowerCase().includes(term) ||
          (d.sellCurrencyCode || '').toLowerCase().includes(term) ||
          (d.bookedForCustomerName || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [deals, statusFilter, searchTerm]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderItem = ({ item }: { item: FxDealSearchRecord }) => (
    <View style={styles.card}>
      {/* Top row: reference + status */}
      <View style={styles.topRow}>
        <View style={styles.flex}>
          <Text style={styles.ref} numberOfLines={1}>{item.fxDealReference}</Text>
          <Text style={styles.date}>{formatDateTime(item.bookedTime)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor(item.fxDealTypeName)}22` }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.fxDealTypeName) }]}>
            {statusLabel(item.fxDealTypeName)}
          </Text>
        </View>
      </View>

      {/* Conversion: Sold → Bought */}
      <View style={styles.conversionRow}>
        <View style={styles.ccySide}>
          <CurrencyIcon code={item.sellCurrencyCode} size={24} />
          <View>
            <Text style={styles.ccyLabel}>Sold</Text>
            <Text style={[styles.ccyAmount, styles.debit]}>
              -{formatCurrency(item.sellAmount ?? 0)} {item.sellCurrencyCode}
            </Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
        <View style={[styles.ccySide, styles.ccySideRight]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ccyLabel}>Bought</Text>
            <Text style={[styles.ccyAmount, styles.credit]}>
              +{formatCurrency(item.buyAmount ?? 0)} {item.buyCurrencyCode}
            </Text>
          </View>
          <CurrencyIcon code={item.buyCurrencyCode} size={24} />
        </View>
      </View>

      {/* Rate */}
      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>Rate</Text>
        <Text style={styles.rateValue}>{item.bookedRateTextWithCurrencyCodes || `${item.bookedRate}`}</Text>
      </View>
    </View>
  );

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
      data={filteredDeals}
      keyExtractor={(item) => item.fxDealId}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { setCurrentPage(0); fetchDeals(0, true); }}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{t('history.exchangeTitle') || 'Exchange History'}</Text>

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search reference or currency..."
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
              { key: '' as StatusKey, label: 'All' },
              { key: 'settled' as StatusKey, label: 'Settled' },
              { key: 'pending' as StatusKey, label: 'Pending' },
              { key: 'cancelled' as StatusKey, label: 'Cancelled' },
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
            Showing {filteredDeals.length} of {totalCount} exchanges
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💱</Text>
          <Text style={styles.empty}>{error || t('history.noDeals') || 'No exchange transactions found.'}</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/(app)/exchange' as any)}>
            <Text style={styles.emptyBtnText}>Make an Exchange</Text>
          </Pressable>
        </View>
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
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  ref: { fontSize: typography.small, fontWeight: '600', color: colors.textPrimary },
  date: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: typography.caption, fontWeight: '600' },

  // Conversion row
  conversionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ccySide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ccySideRight: { justifyContent: 'flex-end' },
  ccyLabel: { fontSize: typography.caption, color: colors.textMuted },
  ccyAmount: { fontSize: typography.small, fontWeight: '700', marginTop: 2 },
  credit: { color: colors.accent },
  debit: { color: colors.danger },

  // Rate
  rateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs,
  },
  rateLabel: { fontSize: typography.caption, color: colors.textMuted },
  rateValue: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: '600' },

  separator: { height: spacing.sm },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: spacing.xxl, gap: spacing.sm },
  emptyIcon: { fontSize: 40 },
  empty: { textAlign: 'center', color: colors.textSecondary },
  emptyBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  emptyBtnText: { color: colors.textPrimary, fontWeight: '600', fontSize: typography.small },

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
