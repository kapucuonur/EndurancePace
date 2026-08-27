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
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  const scheme = useColorScheme();
  const initSession = useAppStore((s) => s.initSession);
  const ready = useAppStore((s) => s.session.ready);
  const token = useAppStore((s) => s.session.token);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void initSession();
  }, [initSession]);

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
                options={{ presentation: 'modal', title: 'New Workout' }}
              />
              <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
              <Stack.Screen
                name="plan/new"
                options={{ presentation: 'modal', title: 'New Plan' }}
              />
              <Stack.Screen name="plan/[id]" options={{ title: 'Plan' }} />
              <Stack.Screen name="trends" options={{ title: 'Fitness Trends' }} />
            </Stack>
          ) : (
            <View className="flex-1 bg-bg dark:bg-bg-dark" />
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
