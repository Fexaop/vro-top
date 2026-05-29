import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';

// Suppress known library warnings on web — react-native-paper uses native-only
// style props (shadow*, pointerEvents, useNativeDriver) that don't map to web.
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated',
    '"shadow*" style props are deprecated',
    'useNativeDriver` is not supported',
    'Animated: `useNativeDriver`',
  ]);
}
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { AppDarkTheme, AppLightTheme } from '@/constants/m3-theme';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Stack, router } from 'expo-router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { loadFromStorage: loadAuth, isAuthenticated } = useAuthStore();
  const { loadFromStorage: loadSettings, theme: themePref } = useSettingsStore();
  const systemScheme = useColorScheme();

  useEffect(() => {
    Promise.all([loadAuth(), loadSettings()]);
  }, [loadAuth, loadSettings]);

  const scheme =
    themePref === 'system' ? (systemScheme ?? 'light') : themePref;
  const paperTheme = scheme === 'dark' ? AppDarkTheme : AppLightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        {Platform.OS !== 'web' && <AnimatedSplashOverlay />}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
