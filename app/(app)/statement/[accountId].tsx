import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, typography } from '../../../src/theme';

export default function StatementScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Statement</Text>
      <Text style={styles.sub}>Account: {accountId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },
  sub: { fontSize: typography.small, color: colors.textMuted, marginTop: spacing.sm },
});
