import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#ffffff',
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    />
  );
}
