import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { PhaseTimeline } from '@/components/plan/PhaseTimeline';
import { Badge } from '@/components/ui/Badge';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { WorkoutCard } from '@/components/WorkoutCard';
import { currentPhase } from '@/domain/plan';
import { useT } from '@/i18n/useT';
import { longDate, todayISO } from '@/lib/date';
import { useAppStore, useEvents, usePlans } from '@/store/useAppStore';
import { PHASE_COLOR } from '@/theme/phase';
import { sportColor } from '@/theme/sport';
import { palette } from '@/theme/tokens';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const plan = usePlans().find((p) => p.id === id);
  const events = useEvents();
  const allWorkouts = useAppStore((s) => s.workouts);
  const workouts = useMemo(() => allWorkouts.filter((w) => w.planId === id), [allWorkouts, id]);

  const marked = useMemo(() => {
    const m: Record<string, { dots: { key: string; color: string }[] }> = {};
    for (const w of workouts) {
      if (!w.date) continue;
      (m[w.date] ??= { dots: [] }).dots.push({ key: w.id, color: sportColor(w.sport) });
    }
    return m;
  }, [workouts]);

  if (!plan) {
    return (
      <Screen className="items-center justify-center">
        <Text muted>{t('planDetail.notFound')}</Text>
      </Screen>
    );
  }

  const goal = events.find((e) => e.id === plan.goalEventId);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: plan.name }} />
      <ScrollView contentContainerClassName="p-lg gap-lg pb-24">
        <View className="flex-row items-center gap-sm">
          <Text variant="title" className="flex-1">
            {plan.name}
          </Text>
          <Badge
            label={t(`phase.${currentPhase(plan, todayISO())}`)}
            color={PHASE_COLOR[currentPhase(plan, todayISO())]}
          />
        </View>
        <Text variant="caption" muted>
          {longDate(plan.startDate)} → {longDate(plan.endDate)}
        </Text>

        {plan.blocks?.length ? (
          <View className="gap-xs">
            <Text variant="label" muted>
              {t('planDetail.periodization')}
            </Text>
            <PhaseTimeline plan={plan} />
          </View>
        ) : null}

        {plan.notes ? <Text muted>{plan.notes}</Text> : null}
        {goal ? (
          <Text variant="caption" className="text-brand">
            {t('planDetail.goal', { name: goal.name, date: longDate(goal.date) })}
          </Text>
        ) : null}

        <Calendar
          current={plan.startDate}
          minDate={plan.startDate}
          maxDate={plan.endDate}
          markingType="multi-dot"
          markedDates={marked}
          onDayPress={(d) => {
            const w = workouts.find((x) => x.date === d.dateString);
            if (w) router.push(`/workout/${w.id}`);
          }}
          theme={{ arrowColor: palette.brand, todayTextColor: palette.brand }}
        />

        <Text variant="heading">
          {t('planDetail.workoutsCount', { count: workouts.length })}
        </Text>
        <View className="gap-sm">
          {workouts
            .slice()
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
            .map((w) => (
              <WorkoutCard
                key={w.id}
                workout={w}
                onPress={() => router.push(`/workout/${w.id}`)}
              />
            ))}
        </View>

        {/* TODO: implement plan editing, phase timeline, and weekly load targets */}
      </ScrollView>
    </Screen>
  );
}
