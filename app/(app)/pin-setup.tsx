import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../../src/utils/storage';
import { useLanguage } from '../../src/hooks/useLanguage';
import { colors, spacing, typography, radius } from '../../src/theme';

const PIN_LENGTH = 6;
type Step = 'enter' | 'confirm';

export default function PinSetupScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleDigit = useCallback((digit: string) => {
    setError('');
    const next = pin + digit;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      if (step === 'enter') {
        setFirstPin(next);
        setPin('');
        setStep('confirm');
      } else {
        // confirm step
        if (next === firstPin) {
          storage.setPin(next);
          router.back();
        } else {
          shake();
          setError(t('pin.pinMismatch') || 'PINs do not match. Try again.');
          setPin('');
          setStep('enter');
          setFirstPin('');
        }
      }
    }
  }, [pin, step, firstPin, shake, router, t]);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const title = step === 'enter'
    ? (t('pin.setPin') || 'Set Your PIN')
    : (t('pin.confirmPin') || 'Confirm Your PIN');

  const subtitle = step === 'enter'
    ? 'Choose a 6-digit PIN to secure transactions'
    : 'Enter the same PIN again to confirm';

  return (
    <View style={styles.container}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.content}>
        <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* PIN dots */}
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </Animated.View>

        {/* Step indicator */}
        <View style={styles.stepsRow}>
          <View style={[styles.stepDot, step === 'enter' && styles.stepDotActive]} />
          <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
        </View>

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        {/* Numeric keypad */}
        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key) => {
            if (key === '') return <View key="empty" style={styles.key} />;
            if (key === 'back') {
              return (
                <Pressable key="back" style={styles.key} onPress={handleBackspace}>
                  <Ionicons name="backspace-outline" size={24} color={colors.textSecondary} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                onPress={() => handleDigit(key)}
              >
                <Text style={styles.keyText}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { padding: spacing.md },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl },

  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { fontSize: typography.small, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.xl },

  dotsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: colors.borderLight,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },

  stepsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary, width: 20 },

  error: { color: colors.danger, fontSize: typography.caption, marginBottom: spacing.sm, textAlign: 'center' },

  keypad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 240, justifyContent: 'center',
  },
  key: {
    width: 72, height: 56,
    alignItems: 'center', justifyContent: 'center',
    margin: spacing.xs, borderRadius: radius.md,
  },
  keyPressed: { backgroundColor: colors.surfaceAlt },
  keyText: { fontSize: 24, fontWeight: '500', color: colors.textPrimary },
});
