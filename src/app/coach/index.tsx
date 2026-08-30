import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { useAppStore, useCoach } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

export default function CoachRosterScreen() {
  const router = useRouter();
  const t = useT();
  const { athletes, loading, error } = useCoach();
  const loadCoachAthletes = useAppStore((s) => s.loadCoachAthletes);

  useEffect(() => {
    void loadCoachAthletes();
  }, [loadCoachAthletes]);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: t('nav.coaching') }} />
      <ScrollView
        contentContainerClassName="p-lg gap-md pb-24"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void loadCoachAthletes()} />
        }>
        <Text variant="caption" muted>
          {t('coach.rosterSubtitle')}
        </Text>

        {error ? (
          <View className="flex-row items-center gap-xs rounded-md bg-danger/10 px-md py-2">
            <Ionicons name="alert-circle" size={15} color={palette.danger} />
            <Text variant="caption" className="flex-1 text-danger">
              {error}
            </Text>
          </View>
        ) : null}

        {!loading && athletes.length === 0 && !error ? (
          <Text muted>{t('coach.noAthletes')}</Text>
        ) : null}

        {athletes.map((a) => (
          <Card
            key={a.id}
            onPress={() => router.push(`/coach/${a.id}`)}
            className="flex-row items-center gap-md">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-tint dark:bg-surface-alt-dark">
              <Text variant="label" className="text-brand">
                {a.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text variant="label" numberOfLines={1}>
                {a.name}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {a.email}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
