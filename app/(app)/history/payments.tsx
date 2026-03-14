import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../src/theme';

export default function PaymentHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>PaymentHistory</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },
  sub: { fontSize: typography.small, color: colors.textMuted, marginTop: spacing.sm },
});
