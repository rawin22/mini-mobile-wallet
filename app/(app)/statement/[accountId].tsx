import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  Pressable, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../../../src/hooks/useLanguage';
import { statementService } from '../../../src/api/statement.service';
import { formatCurrency, formatDateTime, todayDateString } from '../../../src/utils/formatters';
import type { StatementEntry, AccountInfo } from '../../../src/types/statement.types';
import { GradientCard, CurrencyIcon } from '../../../components/ui';
import { colors, spacing, typography, radius, gradients } from '../../../src/theme';

type Preset = '7' | '30' | '90' | 'all';

const dateFromPreset = (preset: Preset): string => {
  if (preset === 'all') return '2000-01-01';
  const d = new Date();
  d.setDate(d.getDate() - parseInt(preset, 10));
  return d.toISOString().split('T')[0];
};

export default function StatementScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const { t } = useLanguage();
  const [preset, setPreset] = useState<Preset>('30');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const PRESETS: { label: string; value: Preset }[] = [
    { label: t('statement.days', { days: '7' }) || '7d', value: '7' },
    { label: t('statement.days', { days: '30' }) || '30d', value: '30' },
    { label: t('statement.days', { days: '90' }) || '90d', value: '90' },
    { label: t('statement.all') || 'All', value: 'all' },
  ];

  const fetchStatement = useCallback(async (p: Preset, showRefresh = false) => {
    if (!accountId) return;
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await statementService.getStatement(
        accountId,
        dateFromPreset(p),
        todayDateString(),
      );
      setAccountInfo(response.accountInfo ?? null);
      setEntries(response.entries ?? []);
    } catch {
      setError(t('statement.loadError') || 'Could not load statement. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accountId, t]);

  useEffect(() => { fetchStatement(preset); }, [fetchStatement, preset]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    fetchStatement(p);
  };

  const renderEntry = ({ item }: { item: StatementEntry }) => {
    const isCredit = item.creditAmount > 0;
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.rowMeta}>
            {item.transactionType} · {formatDateTime(item.transactionTime)}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowAmount, isCredit ? styles.credit : styles.debit]}>
            {isCredit ? '+' : '-'}{formatCurrency((isCredit ? item.creditAmount : item.debitAmount) ?? 0)}
          </Text>
          <Text style={styles.rowBalance}>{formatCurrency(item.runningBalance ?? 0)}</Text>
        </View>
      </View>
    );
  };

  const header = (
    <>
      {accountInfo && (
        <GradientCard colors={gradients.card} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <CurrencyIcon code={accountInfo.accountCurrencyCode} size={32} />
            <View>
              <Text style={styles.accountName}>{accountInfo.accountName}</Text>
              <Text style={styles.accountMeta}>
                {accountInfo.accountCurrencyCode} · {accountInfo.accountNumber}
              </Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>{t('statement.opening') || 'Opening'}</Text>
              <Text style={styles.balanceValue}>{formatCurrency(accountInfo.beginningBalance)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceRight}>
              <Text style={styles.balanceLabel}>{t('statement.closing') || 'Closing'}</Text>
              <Text style={[styles.balanceValue, styles.balanceHighlight]}>
                {formatCurrency(accountInfo.endingBalance)}
              </Text>
            </View>
          </View>
        </GradientCard>
      )}

      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <Pressable
            key={p.value}
            style={[styles.presetBtn, preset === p.value && styles.presetActive]}
            onPress={() => handlePreset(p.value)}
          >
            <Text style={[styles.presetText, preset === p.value && styles.presetTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.flex]}>{t('statement.description') || 'Description'}</Text>
        <Text style={styles.tableHeaderText}>{t('statement.balance') || 'Amount / Balance'}</Text>
      </View>
    </>
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
      data={entries}
      keyExtractor={(_, i) => String(i)}
      renderItem={renderEntry}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Text style={styles.empty}>{error || t('statement.noTransactions') || 'No transactions in this period.'}</Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchStatement(preset, true)}
          tintColor={colors.primary}
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },

  summaryCard: { marginBottom: spacing.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  accountName: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  accountMeta: { fontSize: typography.caption, color: colors.textSecondary, marginTop: 2 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceDivider: { width: 1, height: 36, backgroundColor: colors.borderLight, marginHorizontal: spacing.md },
  balanceRight: { alignItems: 'flex-start' },
  balanceLabel: { fontSize: typography.caption, color: colors.textSecondary },
  balanceValue: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },
  balanceHighlight: { color: colors.accent },

  presetRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  presetBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontSize: typography.small, color: colors.textSecondary, fontWeight: '600' },
  presetTextActive: { color: colors.textPrimary },

  tableHeader: {
    flexDirection: 'row', paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.xs,
  },
  tableHeaderText: { fontSize: typography.caption, color: colors.textMuted, fontWeight: '600' },
  flex: { flex: 1 },

  row: { flexDirection: 'row', paddingVertical: spacing.sm, gap: spacing.sm },
  rowLeft: { flex: 1 },
  rowDesc: { fontSize: typography.small, color: colors.textPrimary },
  rowMeta: { fontSize: typography.caption, color: colors.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { fontSize: typography.small, fontWeight: '700' },
  rowBalance: { fontSize: typography.caption, color: colors.textSecondary, marginTop: 2 },
  credit: { color: colors.accent },
  debit: { color: colors.danger },

  separator: { height: 1, backgroundColor: colors.border },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
});
