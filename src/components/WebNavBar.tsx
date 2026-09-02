import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@/i18n';
import { useT } from '@/i18n/useT';
import { useAppStore, useLocale } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

const TAB_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'calendar',
  plans: 'map',
  library: 'library',
  messages: 'chatbubble-ellipses',
  profile: 'person',
};

/**
 * Web top navbar: the tab links on the left, a hamburger on the right that
 * opens a language menu. On native this is never mounted — `(tabs)/_layout`
 * only passes it as `tabBar` on web — but we guard anyway.
 */
export function WebNavBar(props: BottomTabBarProps) {
  if (Platform.OS !== 'web') return <BottomTabBar {...props} />;
  return <Bar {...props} />;
}

function Bar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useT();
  const locale = useLocale();
  const setLocale = useAppStore((s) => s.setLocale);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View className="relative z-50">
      <View className="h-14 flex-row items-center border-b border-border bg-bg px-lg dark:border-border-dark dark:bg-bg-dark">
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const label =
            typeof options.title === 'string' && options.title ? options.title : route.name;
          const color = focused ? palette.brand : palette.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-row items-center gap-1.5 rounded-md px-md py-2 active:opacity-70">
              <Ionicons
                name={TAB_ICON[route.name] ?? 'ellipse-outline'}
                size={17}
                color={color}
              />
              <Text
                variant="label"
                style={{ color }}
                className={focused ? 'font-semibold' : undefined}>
                {label}
              </Text>
            </Pressable>
          );
        })}

        <View className="flex-1" />

        <Pressable
          onPress={() => setMenuOpen((o) => !o)}
          hitSlop={8}
          className="flex-row items-center gap-1 rounded-md px-sm py-2 active:opacity-70">
          <Text variant="caption" muted>
            {LOCALE_LABELS[locale]}
          </Text>
          <Ionicons
            name={menuOpen ? 'chevron-up' : 'menu'}
            size={18}
            color={palette.textMuted}
          />
        </Pressable>
      </View>

      {menuOpen ? (
        <>
          {/* Click-away backdrop + dropdown are `fixed` (web) so they sit above
              the page and escape any clipping by the navigator container. */}
          <Pressable
            onPress={() => setMenuOpen(false)}
            style={{ position: 'fixed' as 'absolute', inset: 0 }}
          />
          <View
            style={{ position: 'fixed' as 'absolute', top: 52, right: 12 }}
            className="min-w-[168px] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg dark:border-border-dark dark:bg-surface-dark">
            <Text variant="caption" muted className="px-md pb-1 pt-1.5">
              {t('profile.language')}
            </Text>
            {SUPPORTED_LOCALES.map((loc) => {
              const on = loc === locale;
              return (
                <Pressable
                  key={loc}
                  onPress={() => {
                    void setLocale(loc);
                    setMenuOpen(false);
                  }}
                  className="flex-row items-center justify-between px-md py-2 active:bg-brand-tint dark:active:bg-surface-alt-dark">
                  <Text variant="label" className={on ? 'text-brand' : undefined}>
                    {LOCALE_LABELS[loc]}
                  </Text>
                  {on ? <Ionicons name="checkmark" size={15} color={palette.brand} /> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}
