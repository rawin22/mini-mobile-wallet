import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { useAuth } from '../src/hooks/useAuth';
import { loadSavedEnvironment } from '../src/api/config';
import { storage } from '../src/utils/storage';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => { loadSavedEnvironment(); }, []);

  // Check onboarding status — called on mount and can be re-invoked
  const checkOnboarding = useCallback(async () => {
    const completed = await storage.isOnboardingCompleted();
    console.log('[AuthGate] Onboarding completed?', completed);
    setNeedsOnboarding(!completed);
    setOnboardingChecked(true);
  }, []);

  useEffect(() => { checkOnboarding(); }, [checkOnboarding]);

  useEffect(() => {
    if (isLoading || !onboardingChecked) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const inOnboardingGroup = (segments[0] as string) === '(onboarding)';

    console.log('[AuthGate] segments:', segments.join('/'),
      '| needsOnboarding:', needsOnboarding,
      '| isAuthenticated:', isAuthenticated);

    // If we think onboarding is needed but we're no longer in the
    // onboarding group, re-read the flag — the intro screen may have
    // just written it. Don't redirect until the re-read resolves.
    if (needsOnboarding && !inOnboardingGroup) {
      checkOnboarding();
      return;
    }

    // Don't redirect if in onboarding
    if (inOnboardingGroup) return;

    // Only redirect unauthenticated users to login. Authenticated redirects
    // (login → dashboard, signup → get-verified) are handled by each screen
    // individually to avoid racing with post-signup navigation.
    if (!isAuthenticated && !inAuthGroup) {
      console.log('[AuthGate] Not authenticated, redirecting to login');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/login' as any);
    }
  }, [isAuthenticated, isLoading, segments, router, onboardingChecked, needsOnboarding, checkOnboarding]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </LanguageProvider>
  );
}
