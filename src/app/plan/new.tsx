import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { PhaseAllocator } from '@/components/plan/PhaseAllocator';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import {
  blockRanges,
  currentPhase,
  defaultBlocks,
  totalWeeks,
  weeksBetween,
} from '@/domain/plan';
import { longDate, shiftDays, shiftWeeks, todayISO, weekStart } from '@/lib/date';
import { useAppStore, useAthlete, useEvents } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';
import type { PlanBlock } from '@/types/domain';

const schema = z.object({ name: z.string().min(2, 'Name your plan') });
type FormValues = z.infer<typeof schema>;

export default function NewPlanScreen() {
  const router = useRouter();
  const athlete = useAthlete();
  const events = useEvents();
  const createPlan = useAppStore((s) => s.createPlan);

  const [startDate, setStartDate] = useState(() => weekStart(todayISO()));
  const [goalEventId, setGoalEventId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<PlanBlock[]>(() => defaultBlocks(8));
  const [touchedBlocks, setTouchedBlocks] = useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  const goalEvent = events.find((e) => e.id === goalEventId) ?? null;
  const targetWeeks = goalEvent ? weeksBetween(startDate, goalEvent.date) : undefined;

  const total = totalWeeks(blocks);
  const endDate = shiftDays(shiftWeeks(startDate, total), -1);

  // Selecting a race (or changing the start before you've edited blocks) reseeds
  // the breakdown to fit the weeks-until-race.
  const pickEvent = (id: string | null) => {
    setGoalEventId(id);
    const ev = events.find((e) => e.id === id);
    if (ev && !touchedBlocks) setBlocks(defaultBlocks(weeksBetween(startDate, ev.date)));
  };
  const shiftStart = (days: number) => {
    const next = shiftDays(startDate, days);
    setStartDate(next);
    if (goalEvent && !touchedBlocks) {
      setBlocks(defaultBlocks(weeksBetween(next, goalEvent.date)));
    }
  };
  const editBlocks = (b: PlanBlock[]) => {
    setTouchedBlocks(true);
    setBlocks(b);
  };

  const phaseNow = useMemo(
    () => currentPhase({ startDate, blocks, phase: blocks[0]?.phase ?? 'base' }, todayISO()),
    [startDate, blocks],
  );

  const onSubmit = async (values: FormValues) => {
    if (!athlete || blocks.length === 0) return;
    await createPlan({
      athleteId: athlete.id,
      name: values.name,
      startDate,
      endDate,
      goalEventId,
      phase: phaseNow,
      blocks,
    });
    router.back();
  };

  const ranges = blockRanges({ startDate, blocks });

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="pr-md">
              <Text className="text-brand">Cancel</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView contentContainerClassName="p-lg gap-xl pb-40">
          <Text variant="title">New Training Plan</Text>

          {/* Name */}
          <View className="gap-sm">
            <Text variant="label" muted>
              Name
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="e.g. Base → Build: Spring 70.3"
                    placeholderTextColor={palette.textFaint}
                    className="rounded-md border border-border bg-surface px-md py-3 text-base text-fg dark:border-border-dark dark:bg-surface-dark dark:text-fg-dark"
                  />
                  {fieldState.error ? (
                    <Text variant="caption" className="text-danger">
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </>
              )}
            />
          </View>

          {/* Goal race */}
          <View className="gap-sm">
            <Text variant="label" muted>
              Goal race
            </Text>
            <Pressable
              onPress={() => pickEvent(null)}
              className={`rounded-md border px-md py-3 ${
                goalEventId === null
                  ? 'border-brand bg-brand/10'
                  : 'border-border dark:border-border-dark'
              }`}>
              <Text>No goal race</Text>
            </Pressable>
            {events.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => pickEvent(e.id)}
                className={`rounded-md border px-md py-3 ${
                  goalEventId === e.id
                    ? 'border-brand bg-brand/10'
                    : 'border-border dark:border-border-dark'
                }`}>
                <Text>{e.name}</Text>
                <Text variant="caption" muted>
                  {longDate(e.date)} · {e.priority} race
                  {goalEventId === e.id && targetWeeks ? ` · ${targetWeeks} weeks out` : ''}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Start date */}
          <View className="gap-sm">
            <Text variant="label" muted>
              Starts
            </Text>
            <View className="flex-row items-center justify-between rounded-md border border-border bg-surface px-sm py-2 dark:border-border-dark dark:bg-surface-dark">
              <Pressable onPress={() => shiftStart(-7)} hitSlop={12} className="p-sm">
                <Ionicons name="chevron-back" size={20} color={palette.brand} />
              </Pressable>
              <Text variant="label">{longDate(startDate)}</Text>
              <Pressable onPress={() => shiftStart(7)} hitSlop={12} className="p-sm">
                <Ionicons name="chevron-forward" size={20} color={palette.brand} />
              </Pressable>
            </View>
          </View>

          {/* Phase breakdown */}
          <View className="gap-sm">
            <Text variant="heading">Periodization</Text>
            <PhaseAllocator blocks={blocks} onChange={editBlocks} targetWeeks={targetWeeks} />
          </View>

          {/* Derived schedule */}
          <View className="gap-xs rounded-lg bg-surface p-md dark:bg-surface-dark">
            <View className="flex-row justify-between">
              <Text variant="caption" muted>
                Plan runs
              </Text>
              <Text variant="caption">
                {longDate(startDate)} → {longDate(endDate)}
              </Text>
            </View>
            {ranges.map((r) => (
              <View key={r.index} className="flex-row justify-between">
                <Text variant="caption" muted className="capitalize">
                  {r.block.phase}
                </Text>
                <Text variant="caption">
                  {longDate(r.startDate)} → {longDate(r.endDate)}
                </Text>
              </View>
            ))}
          </View>

          <Button
            label="Create plan"
            onPress={handleSubmit(onSubmit)}
            disabled={blocks.length === 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
