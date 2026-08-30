import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { PhaseTimeline } from '@/components/plan/PhaseTimeline';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { currentPhase } from '@/domain/plan';
import { useT } from '@/i18n/useT';
import { daysBetween, longDate, todayISO } from '@/lib/date';
import { useAppStore, useEvents, usePlans } from '@/store/useAppStore';
import { PHASE_COLOR } from '@/theme/phase';
import { palette } from '@/theme/tokens';

export default function PlanOverviewScreen() {
  const router = useRouter();
  const t = useT();
  const plans = usePlans();
  const events = useEvents();
  const workouts = useAppStore((s) => s.workouts);

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-lg py-sm">
        <Text variant="title">{t('plans.title')}</Text>
        <Pressable
          onPress={() => router.push('/plan/new')}
          className="h-10 w-10 items-center justify-center rounded-full bg-brand">
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-lg gap-md pb-24">
        {plans.length === 0 ? (
          <Text muted>{t('plans.empty')}</Text>
        ) : (
          plans.map((plan) => {
            const goal = events.find((e) => e.id === plan.goalEventId);
            const count = workouts.filter((w) => w.planId === plan.id).length;
            const daysToEnd = daysBetween(todayISO(), plan.endDate);
            return (
              <Card
                key={plan.id}
                onPress={() => router.push(`/plan/${plan.id}`)}
                className="gap-sm">
                <View className="flex-row items-center justify-between">
                  <Text variant="heading" className="flex-1">
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
                {plan.blocks?.length ? <PhaseTimeline plan={plan} compact /> : null}
                <View className="flex-row gap-md">
                  <Text variant="caption" muted>
                    {t('plans.workoutsCount', { count })}
                  </Text>
                  {daysToEnd >= 0 ? (
                    <Text variant="caption" muted>
                      {t('plans.daysRemaining', { count: daysToEnd })}
                    </Text>
                  ) : null}
                </View>
                {goal ? (
                  <View className="flex-row items-center gap-xs">
                    <Ionicons name="flag" size={13} color={palette.brand} />
                    <Text variant="caption" className="text-brand">
                      {t('plans.goalRace', { name: goal.name, priority: goal.priority })}
                    </Text>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        <Text variant="heading" className="mt-md">
          {t('plans.upcomingRaces')}
        </Text>
        {events
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e) => (
            <Card key={e.id} className="flex-row items-center justify-between">
              <View>
                <Text variant="label">{e.name}</Text>
                <Text variant="caption" muted>
                  {longDate(e.date)} · {e.distance}
                </Text>
              </View>
              <Badge
                label={`${e.priority}`}
                color={e.priority === 'A' ? palette.danger : palette.textMuted}
              />
            </Card>
          ))}
      </ScrollView>
    </Screen>
  );
}
