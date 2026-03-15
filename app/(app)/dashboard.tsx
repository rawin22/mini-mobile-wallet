import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/hooks/useAuth';
import { useLanguage } from '../../src/hooks/useLanguage';
import { balanceService } from '../../src/api/balance.service';
import type { CustomerBalanceData } from '../../src/types/balance.types';
import { formatCurrency } from '../../src/utils/formatters';
import { CurrencyIcon } from '../../components/ui';
import { colors, spacing, typography, radius, gradients, shadows } from '../../src/theme';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [balances, setBalances] = useState<CustomerBalanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  console.log('[Dashboard] Screen mounted, user:', user?.userName ?? 'none');

  const fetchBalances = useCallback(async (showRefresh = false) => {
    if (!user?.organizationId) {
      console.log('[Dashboard] No organizationId, skipping balance fetch');
      return;
    }
    console.log('[Dashboard] Fetching balances for org:', user.organizationId);
    showRefresh ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const response = await balanceService.getBalances(user.organizationId!);
      const list = response.balances ?? [];
      console.log('[Dashboard] Loaded', list.length, 'balance(s):', list.map((b) => b.currencyCode).join(', '));
      setBalances(list);
    } catch (err) {
      console.error('[Dashboard] Balance fetch failed:', err);
      setError(t('dashboard.loadError') || 'Could not load balances. Pull to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.customerId, t]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const renderBalance = ({ item }: { item: CustomerBalanceData }) => (
    <Pressable
      style={({ pressed }) => [styles.cardWrapper, pressed && styles.cardPressed]}
      onPress={() => {
        console.log('[Dashboard] Tapped account:', item.accountId, item.currencyCode);
        router.push(`/(app)/statement/${item.accountId}` as any);
      }}
    >
      <LinearGradient colors={gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.cardLeft}>
          <CurrencyIcon code={item.currencyCode} size={32} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.currency}>{item.currencyCode}</Text>
          <Text style={styles.accountId} numberOfLines={1}>{item.accountId}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.balance}>{formatCurrency(item.balanceAvailable ?? 0)}</Text>
          <Text style={styles.balanceLabel}>{t('dashboard.available') || 'Available'}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Hero header */}
      <LinearGradient colors={gradients.hero} style={styles.header}>
        <View>
          <Text style={styles.welcome}>{t('dashboard.welcome', { name: user?.firstName ?? '' }) || 'Welcome back'}</Text>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        </View>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>{t('nav.logout') || 'Sign out'}</Text>
        </Pressable>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={balances}
          keyExtractor={(item) => item.accountId}
          renderItem={renderBalance}
          horizontal={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchBalances(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{error || t('dashboard.noBalances') || 'No accounts found.'}</Text>
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
  list: { padding: spacing.sm, gap: spacing.sm },
  cardWrapper: { width: '100%' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardLeft: { width: 40, alignItems: 'center' },
  cardBody: { flex: 1, gap: 2 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  currency: { fontSize: typography.body, fontWeight: 'bold', color: colors.primary },
  balance: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  balanceLabel: { fontSize: typography.caption, color: colors.textSecondary },
  accountId: { fontSize: typography.caption, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
});
