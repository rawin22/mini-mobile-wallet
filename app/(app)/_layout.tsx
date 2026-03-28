import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../src/hooks/useLanguage';
import { colors } from '../../src/theme';

export default function AppLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('nav.dashboard') || 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pay-now"
        options={{
          title: t('nav.payNow') || 'Pay',
          tabBarIcon: ({ color, size }) => <Ionicons name="send-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exchange"
        options={{
          title: t('nav.exchange') || 'Exchange',
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: t('payment.receive') || 'Receive',
          tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile') || 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      {/* Hidden screens — accessible via navigation but not in tab bar */}
      <Tabs.Screen name="history/payments" options={{ href: null }} />
      <Tabs.Screen name="history/convert" options={{ href: null }} />
      <Tabs.Screen name="statement/[accountId]" options={{ href: null }} />
      <Tabs.Screen name="get-verified" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="pin-setup" options={{ href: null }} />
    </Tabs>
  );
}
