import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { fxHistoryService } from '../../../src/api/fx-history.service';
import { formatCurrency, formatDateTime } from '../../../src/utils/formatters';
import type { FxDealSearchRecord } from '../../../src/types/fx.types';
import { colors, spacing, typography, radius } from '../../../src/theme';

export default function ConvertHistoryScreen() {
  const [deals, setDeals] = useState<FxDealSearchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDeals = useCallback(async (showRefresh = false) => {
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await fxHistoryService.searchDeals();
      setDeals(response.fxDeals ?? []);
    } catch {
      setError('Could not load FX history. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const renderItem = ({ item }: { item: FxDealSearchRecord }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.ref} numberOfLines={1}>{item.fxDealReference}</Text>
          <Text style={styles.meta}>{item.fxDealTypeName} · {formatDateTime(item.bookedTime)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.rate}>{item.bookedRateTextWithCurrencyCodes}</Text>
        </View>
      </View>
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Bought</Text>
          <Text style={[styles.amountValue, styles.credit]}>
            +{formatCurrency(item.buyAmount)} {item.buyCurrencyCode}
          </Text>
        </View>
        <Text style={styles.arrow}>⇄</Text>
        <View style={[styles.amountBox, styles.amountRight]}>
          <Text style={styles.amountLabel}>Sold</Text>
          <Text style={[styles.amountValue, styles.debit]}>
            -{formatCurrency(item.sellAmount)} {item.sellCurrencyCode}
          </Text>
        </View>
      </View>
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
      data={deals}
      keyExtractor={(item) => item.fxDealId}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchDeals(true)}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <Text style={styles.title}>FX History</Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{error || 'No FX deals found.'}</Text>
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.md },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  ref: { fontSize: typography.small, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },
  rate: { fontSize: typography.caption, color: colors.textSecondary },

  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amountBox: { flex: 1 },
  amountRight: { alignItems: 'flex-end' },
  amountLabel: { fontSize: typography.caption, color: colors.textMuted },
  amountValue: { fontSize: typography.small, fontWeight: '700', marginTop: 2 },
  credit: { color: colors.accent },
  debit: { color: colors.danger },
  arrow: { fontSize: 18, color: colors.textMuted },

  separator: { height: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
});
