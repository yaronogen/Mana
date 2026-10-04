import '@/i18n';
import { usePreferences } from '@/stores/preferences';
import { useProfile } from '@/stores/profile';
import { useManaTheme } from '@/theme/useManaTheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export { ErrorBoundary } from 'expo-router';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function RootLayout() {
  const hydrated = usePreferences((state) => state.hydrated);
  const hydrate = usePreferences((state) => state.hydrate);
  const { colors, isDark } = useManaTheme();

  const hydrateProfile = useProfile((state) => state.hydrate);

  useEffect(() => { void hydrate(); void hydrateProfile(); }, [hydrate, hydrateProfile]);

  if (!hydrated) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primaryText} /></View>;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, headerStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add" options={{ title: '', headerBackTitle: ' ' }} />
          <Stack.Screen name="paste" options={{ title: '', headerBackTitle: ' ' }} />
          <Stack.Screen name="editor" options={{ title: '', headerBackTitle: ' ' }} />
          <Stack.Screen name="import-review" options={{ title: '', headerBackTitle: ' ' }} />
          <Stack.Screen name="profile" options={{ title: '', headerBackTitle: ' ' }} />
          <Stack.Screen name="billing" options={{ title: '', headerBackTitle: ' ' }} />
          <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
