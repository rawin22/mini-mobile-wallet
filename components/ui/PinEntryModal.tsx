import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../../src/utils/storage';
import { colors, spacing, typography, radius } from '../../src/theme';

interface PinEntryModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const PIN_LENGTH = 6;

export const PinEntryModal: React.FC<PinEntryModalProps> = ({
  visible,
  onSuccess,
  onCancel,
  title = 'Enter PIN',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
    }
  }, [visible]);

  // Lockout countdown
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const id = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          setAttempts(0);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutRemaining]);

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
    if (lockoutRemaining > 0) return;
    setError('');
    const next = pin + digit;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      if (storage.verifyPin(next)) {
        setPin('');
        setAttempts(0);
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        shake();
        if (newAttempts >= MAX_ATTEMPTS) {
          setError(`Too many attempts. Wait ${LOCKOUT_SECONDS}s.`);
          setLockoutRemaining(LOCKOUT_SECONDS);
        } else {
          setError(`Incorrect PIN (${MAX_ATTEMPTS - newAttempts} tries left)`);
        }
        setPin('');
      }
    }
  }, [pin, attempts, lockoutRemaining, onSuccess, shake]);

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const isLocked = lockoutRemaining > 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="shield-checkmark-outline" size={40} color={colors.primary} />
            <Text style={styles.title}>{title}</Text>
            {isLocked && (
              <Text style={styles.lockout}>Locked — {lockoutRemaining}s</Text>
            )}
          </View>

          {/* PIN dots */}
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < pin.length && styles.dotFilled]}
              />
            ))}
          </Animated.View>

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          {/* Numeric keypad */}
          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key) => {
              if (key === '') return <View key="empty" style={styles.key} />;
              if (key === 'back') {
                return (
                  <Pressable key="back" style={styles.key} onPress={handleBackspace} disabled={isLocked}>
                    <Ionicons name="backspace-outline" size={24} color={colors.textSecondary} />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                  onPress={() => handleDigit(key)}
                  disabled={isLocked}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Cancel */}
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary, marginTop: spacing.sm },
  lockout: { fontSize: typography.caption, color: colors.danger, marginTop: spacing.xs },

  dotsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: colors.borderLight,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },

  error: { color: colors.danger, fontSize: typography.caption, marginBottom: spacing.sm, textAlign: 'center' },

  keypad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 240, justifyContent: 'center',
  },
  key: {
    width: 72, height: 56,
    alignItems: 'center', justifyContent: 'center',
    margin: spacing.xs,
    borderRadius: radius.md,
  },
  keyPressed: { backgroundColor: colors.surfaceAlt },
  keyText: { fontSize: 24, fontWeight: '500', color: colors.textPrimary },

  cancelBtn: { marginTop: spacing.md, padding: spacing.sm },
  cancelText: { fontSize: typography.body, color: colors.textSecondary },
});
