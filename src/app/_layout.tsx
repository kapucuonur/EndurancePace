import '@/global.css';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  const scheme = useColorScheme();
  const t = useT();
  const initSession = useAppStore((s) => s.initSession);
  const initLocale = useAppStore((s) => s.initLocale);
  const ready = useAppStore((s) => s.session.ready);
  const token = useAppStore((s) => s.session.token);
  const loadUnreadMessageCount = useAppStore((s) => s.loadUnreadMessageCount);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void initLocale();
    void initSession();
  }, [initLocale, initSession]);

  // Keep the Messages tab badge current: poll while signed in, and refresh
  // whenever the app returns to the foreground.
  useEffect(() => {
    if (!token) return;
    void loadUnreadMessageCount();
    const timer = setInterval(() => void loadUnreadMessageCount(), 30_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void loadUnreadMessageCount();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [token, loadUnreadMessageCount]);

  // Auth gate: bounce between /login and the tabs based on the token.
  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === 'login';
    if (!token && !onLogin) router.replace('/login');
    else if (token && onLogin) router.replace('/(tabs)');
  }, [ready, token, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          {ready ? (
            <Stack screenOptions={{ headerShadowVisible: false }}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="workout/new"
                options={{ presentation: 'modal', title: t('nav.newWorkout') }}
              />
              <Stack.Screen name="workout/[id]" options={{ title: t('nav.workout') }} />
              <Stack.Screen
                name="plan/new"
                options={{ presentation: 'modal', title: t('nav.newPlan') }}
              />
              <Stack.Screen name="plan/[id]" options={{ title: t('nav.plan') }} />
              <Stack.Screen name="trends" options={{ title: t('nav.fitnessTrends') }} />
              <Stack.Screen name="garmin" options={{ title: t('nav.garminConnect') }} />
              <Stack.Screen name="coach/index" options={{ title: t('nav.coaching') }} />
              <Stack.Screen name="coach/[athleteId]" options={{ title: t('nav.athlete') }} />
              <Stack.Screen
                name="messages/[partnerId]"
                options={{ title: t('nav.messages') }}
              />
            </Stack>
          ) : (
            <View className="flex-1 bg-bg dark:bg-bg-dark" />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
