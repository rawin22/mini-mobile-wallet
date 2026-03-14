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
    const inAuthGroup = (segments[0] as string) === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/login' as any);
    } else if (isAuthenticated && inAuthGroup) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(app)/dashboard' as any);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
