import { Redirect } from 'expo-router';

// Root index — auth gate in _layout.tsx handles routing
export default function Index() {
  return <Redirect href={'/(auth)/login' as any} />;
}
