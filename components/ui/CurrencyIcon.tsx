import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIconEntry, countryCodeToFlag, hashColor } from '../../src/utils/currencyIcons';
import { colors } from '../../src/theme';

interface CurrencyIconProps {
  code: string;
  size?: number;
}

export const CurrencyIcon: React.FC<CurrencyIconProps> = ({ code, size = 36 }) => {
  const entry = getIconEntry(code);
  const circleSize = size;
  const fontSize = size * 0.5;

  if (entry?.type === 'flag') {
    return (
      <View style={[styles.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: colors.surfaceAlt }]}>
        <Text style={{ fontSize: size * 0.6, lineHeight: size * 0.75 }}>
          {countryCodeToFlag(entry.value)}
        </Text>
      </View>
    );
  }

  if (entry?.type === 'ionicon') {
    return (
      <View style={[styles.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: `${entry.color ?? colors.primary}22` }]}>
        <Ionicons name={entry.value as any} size={fontSize} color={entry.color ?? colors.primary} />
      </View>
    );
  }

  // Custom text or unknown fallback
  const bg = entry?.color ?? hashColor(code);
  const label = entry?.value ?? code.slice(0, 3);

  return (
    <View style={[styles.circle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: `${bg}22` }]}>
      <Text style={[styles.customText, { fontSize: fontSize * 0.7, color: bg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  customText: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
