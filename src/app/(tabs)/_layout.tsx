import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

import { WebNavBar } from '@/components/WebNavBar';
import { useT } from '@/i18n/useT';
import { useUnreadMessageCount } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

const isWeb = Platform.OS === 'web';

export default function TabsLayout() {
  const dark = useColorScheme() === 'dark';
  const t = useT();
  const unread = useUnreadMessageCount();
  return (
    <Tabs
      // Web gets a custom top navbar (tab links + a language menu); phones keep
      // the native thumb-friendly bottom bar.
      tabBar={isWeb ? (props) => <WebNavBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWeb ? 'top' : 'bottom',
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: dark ? palette.textMutedDark : palette.textMuted,
        tabBarStyle: {
          backgroundColor: dark ? palette.bgDark : palette.bg,
          borderTopColor: dark ? palette.borderDark : palette.border,
        },
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
        name="messages"
        options={{
          title: t('nav.messages'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" color={color} size={size} />
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
