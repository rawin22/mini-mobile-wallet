import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { useAuth } from '../src/hooks/useAuth';
import { loadSavedEnvironment } from '../src/api/config';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => { loadSavedEnvironment(); }, []);

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = (segments[0] as string) ?? '';
    const inAppGroup = firstSegment === '(app)';
    const inAuthGroup = firstSegment === '(auth)';
    const inOnboardingGroup = firstSegment === '(onboarding)';

    console.log('[AuthGate] segment0:', JSON.stringify(firstSegment),
      '| isAuthenticated:', isAuthenticated);

    // Don't redirect if user is viewing the intro tour
    if (inOnboardingGroup) return;

    // Authenticated → must be in app group, otherwise redirect to dashboard
    if (isAuthenticated && !inAppGroup) {
      console.log('[AuthGate] Authenticated but not in app, redirecting to dashboard');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(app)/dashboard' as any);
      return;
    }

    // Not authenticated → must be in auth group, otherwise redirect to login
    if (!isAuthenticated && !inAuthGroup) {
      console.log('[AuthGate] Not authenticated, redirecting to login');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/login' as any);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(onboarding)" />
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
