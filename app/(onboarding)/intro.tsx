import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, type ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PagerView from 'react-native-pager-view';
import { useLanguage } from '../../src/hooks/useLanguage';
import { storage } from '../../src/utils/storage';
import { colors, spacing, typography, radius, gradients } from '../../src/theme';

interface Slide {
  icon: string;
  titleKey: string;
  descKey: string;
  titleFallback: string;
  descFallback: string;
  color: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'wallet',
    titleKey: 'onboarding.welcome',
    descKey: 'onboarding.welcomeDesc',
    titleFallback: 'Welcome to WinstantPay',
    descFallback: 'Your mobile wallet for global payments and currency exchange.',
    color: colors.primary,
  },
  {
    icon: 'bar-chart-outline',
    titleKey: 'onboarding.dashboardTitle',
    descKey: 'onboarding.dashboardDesc',
    titleFallback: 'Your Balances',
    descFallback: 'View all your currency accounts at a glance. Tap any account to see its statement.',
    color: '#3B82F6',
  },
  {
    icon: 'send-outline',
    titleKey: 'onboarding.payTitle',
    descKey: 'onboarding.payDesc',
    titleFallback: 'Send Payments',
    descFallback: 'Send instant payments to anyone with a PayID. Fast, secure, and easy.',
    color: colors.accent,
  },
  {
    icon: 'swap-horizontal-outline',
    titleKey: 'onboarding.exchangeTitle',
    descKey: 'onboarding.exchangeDesc',
    titleFallback: 'Exchange Currencies',
    descFallback: 'Convert between currencies at live market rates. Get quotes and book deals instantly.',
    color: colors.warning,
  },
  {
    icon: 'shield-checkmark-outline',
    titleKey: 'onboarding.securityTitle',
    descKey: 'onboarding.securityDesc',
    titleFallback: 'Secure Transactions',
    descFallback: 'Protect your payments and exchanges with a 6-digit PIN code.',
    color: '#8B5CF6',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingIntroScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const isLastSlide = currentPage === SLIDES.length - 1;

  const handleDone = async () => {
    console.log('[Onboarding] Setting onboarding completed...');
    await storage.setOnboardingCompleted();
    // Verify it was actually saved
    const check = await storage.isOnboardingCompleted();
    console.log('[Onboarding] Verified saved?', check);
    router.replace('/(auth)/login' as any);
  };

  const handleNext = () => {
    if (isLastSlide) {
      handleDone();
    } else {
      pagerRef.current?.setPage(currentPage + 1);
    }
  };

  return (
    <LinearGradient colors={gradients.onboarding} style={styles.container}>
      {/* Skip button */}
      {!isLastSlide && (
        <Pressable style={styles.skipBtn} onPress={handleDone}>
          <Text style={styles.skipText}>{t('onboarding.skip') || 'Skip'}</Text>
        </Pressable>
      )}

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: `${slide.color}22` }]}>
              <Ionicons name={slide.icon as any} size={64} color={slide.color} />
            </View>
            <Text style={styles.slideTitle}>
              {t(slide.titleKey) || slide.titleFallback}
            </Text>
            <Text style={styles.slideDesc}>
              {t(slide.descKey) || slide.descFallback}
            </Text>
          </View>
        ))}
      </PagerView>

      {/* Bottom area: dots + button */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentPage ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {isLastSlide
              ? (t('onboarding.getStarted') || 'Get Started')
              : (t('onboarding.next') || 'Next')}
          </Text>
          {!isLastSlide && (
            <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: 'absolute', top: 56, right: spacing.lg, zIndex: 10,
    padding: spacing.sm,
  },
  skipText: { fontSize: typography.body, color: colors.textSecondary },

  pager: { flex: 1 },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  slideTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDesc: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },

  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: colors.textMuted },

  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  nextBtnText: { fontSize: typography.body, fontWeight: '600', color: colors.textPrimary },
});
