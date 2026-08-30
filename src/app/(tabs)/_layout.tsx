import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

import { useT } from '@/i18n/useT';
import { palette } from '@/theme/tokens';

const isWeb = Platform.OS === 'web';

export default function TabsLayout() {
  const dark = useColorScheme() === 'dark';
  const t = useT();
  const border = dark ? palette.borderDark : palette.border;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // A top navbar reads better on the web; keep the thumb-friendly
        // bottom bar on phones.
        tabBarPosition: isWeb ? 'top' : 'bottom',
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: dark ? palette.textMutedDark : palette.textMuted,
        tabBarStyle: {
          backgroundColor: dark ? palette.bgDark : palette.bg,
          borderTopColor: border,
          ...(isWeb
            ? { borderBottomColor: border, borderBottomWidth: 1, borderTopWidth: 0 }
            : null),
        },
        ...(isWeb
          ? {
              tabBarItemStyle: { flex: 0, paddingHorizontal: 20 },
              tabBarLabelPosition: 'beside-icon' as const,
            }
          : null),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.calendar'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t('nav.plans'),
          tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('nav.library'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
