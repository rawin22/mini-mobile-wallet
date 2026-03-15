import React from 'react';
import { type ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, radius, shadows, colors } from '../../src/theme';

interface GradientCardProps {
  colors?: readonly string[];
  style?: ViewStyle;
  children: React.ReactNode;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  colors: gradientColors = gradients.card,
  style,
  children,
}) => (
  <LinearGradient
    colors={gradientColors as [string, string, ...string[]]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.card, style]}
  >
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    ...shadows.card,
  },
});
