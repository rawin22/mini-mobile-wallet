import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { balanceService } from '../../src/api/balance.service';
import type { CustomerBalanceData } from '../../src/types/balance.types';
import { formatCurrency } from '../../src/utils/formatters';
import { colors, spacing, typography, radius } from '../../src/theme';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [balances, setBalances] = useState<CustomerBalanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchBalances = useCallback(async (showRefresh = false) => {
    if (!user?.organizationId) return;
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await balanceService.getBalances(user.organizationId!);
      setBalances(response.balances ?? []);
    } catch {
      setError('Could not load balances. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.customerId]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const renderBalance = ({ item }: { item: CustomerBalanceData }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(app)/statement/${item.accountId}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.currency}>{item.currencyCode}</Text>
        <Text style={styles.accountId} numberOfLines={1}>{item.accountId}</Text>
      </View>
      <Text style={styles.balance}>{formatCurrency(item.balanceAvailable ?? 0)}</Text>
      <Text style={styles.balanceLabel}>Available</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back</Text>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Sign out</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={balances}
          keyExtractor={(item) => item.accountId}
          renderItem={renderBalance}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchBalances(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{error || 'No accounts found.'}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  welcome: { fontSize: typography.caption, color: colors.textSecondary },
  name: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },
  logout: { fontSize: typography.small, color: colors.danger },
  loader: { marginTop: spacing.xxl },
  list: { padding: spacing.md },
  row: { gap: spacing.md, marginBottom: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  currency: { fontSize: typography.body, fontWeight: 'bold', color: colors.primary },
  accountId: { fontSize: typography.caption, color: colors.textMuted, flex: 1, textAlign: 'right' },
  balance: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },
  balanceLabel: { fontSize: typography.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
});
