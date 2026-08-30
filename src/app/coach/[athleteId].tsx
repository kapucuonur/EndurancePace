import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

import { SportGlyph } from '@/components/SportGlyph';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT, type TranslateFn } from '@/i18n/useT';
import { longDate, todayISO } from '@/lib/date';
import { formatDurationShort } from '@/lib/format';
import api from '@/services/api';
import { palette } from '@/theme/tokens';
import type { AppSnapshot, Workout } from '@/types/domain';

export default function CoachAthleteScreen() {
  const router = useRouter();
  const t = useT();
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!athleteId) return;
    try {
      setError(null);
      setSnapshot(await api.coachAthleteSnapshot(athleteId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  // Refetch whenever the screen regains focus (e.g. after assigning a workout).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const athlete = snapshot?.athlete;
  const scheduled = (snapshot?.workouts ?? [])
    .filter((w) => !w.isTemplate && w.date)
    .sort((a, b) => (a.date! < b.date! ? 1 : -1));
  const today = todayISO();
  const upcoming = scheduled.filter((w) => w.date! >= today).reverse();
  const past = scheduled.filter((w) => w.date! < today);

  const withdraw = (w: Workout) =>
    Alert.alert(
      t('coach.withdrawTitle'),
      t('coach.withdrawBody', {
        title: w.title,
        name: athlete?.name ?? t('workoutBuilder.thisAthlete'),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('coach.withdraw'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.withdrawAssignedWorkout(athleteId!, w.id);
              await load();
            } catch (e) {
              Alert.alert(
                t('coach.couldNotWithdraw'),
                e instanceof Error ? e.message : String(e),
              );
            }
          },
        },
      ],
    );

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: athlete?.name ?? t('nav.athlete') }} />
      <ScrollView
        contentContainerClassName="p-lg gap-lg pb-28"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
        {loading && !snapshot ? (
          <ActivityIndicator color={palette.brand} />
        ) : error ? (
          <View className="flex-row items-center gap-xs rounded-md bg-danger/10 px-md py-2">
            <Ionicons name="alert-circle" size={15} color={palette.danger} />
            <Text variant="caption" className="flex-1 text-danger">
              {error}
            </Text>
          </View>
        ) : (
          <>
            <Button
              label={t('coach.assignWorkout')}
              onPress={() =>
                router.push({
                  pathname: '/workout/new',
                  params: { assignTo: athleteId, assignName: athlete?.name ?? '' },
                })
              }
            />

            <Section
              t={t}
              title={t('coach.upcoming')}
              workouts={upcoming}
              onWithdraw={withdraw}
            />
            <Section
              t={t}
              title={t('coach.recent')}
              workouts={past.slice(0, 12)}
              onWithdraw={withdraw}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({
  t,
  title,
  workouts,
  onWithdraw,
}: {
  t: TranslateFn;
  title: string;
  workouts: Workout[];
  onWithdraw: (w: Workout) => void;
}) {
  return (
    <View className="gap-sm">
      <Text variant="heading">{title}</Text>
      {workouts.length === 0 ? (
        <Text variant="caption" muted>
          {t('coach.nothingHere')}
        </Text>
      ) : (
        workouts.map((w) => {
          const done = w.status === 'completed' ? w.completed : undefined;
          const fromCoach = w.source === 'coach';
          return (
            <View
              key={w.id}
              className="flex-row items-center gap-md rounded-md border border-border bg-surface p-md dark:border-border-dark dark:bg-surface-dark">
              <SportGlyph sport={w.sport} chip size={14} />
              <View className="flex-1">
                <Text variant="label" numberOfLines={1}>
                  {w.title}
                </Text>
                <Text variant="caption" muted>
                  {t('coach.workoutLine', {
                    date: w.date ? longDate(w.date) : '—',
                    duration: formatDurationShort(done?.durationSeconds ?? w.plannedDuration),
                    tss: done?.actualTss ?? w.plannedTss,
                    status: t(`status.${w.status}`),
                  })}
                </Text>
              </View>
              {fromCoach ? (
                <View className="rounded-full bg-brand-tint px-2 py-0.5 dark:bg-surface-alt-dark">
                  <Text variant="caption" className="text-brand">
                    {t('coach.yours')}
                  </Text>
                </View>
              ) : null}
              {fromCoach && w.status === 'planned' ? (
                <Pressable onPress={() => onWithdraw(w)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={17} color={palette.danger} />
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}
