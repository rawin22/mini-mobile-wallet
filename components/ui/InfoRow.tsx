import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../src/theme';

interface InfoRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <View style={styles.row}>
    {icon && <View style={styles.icon}>{icon}</View>}
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={1}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontSize: typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: typography.small,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
});
