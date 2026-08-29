import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { RepeatBlock } from '@/components/builder/RepeatBlock';
import { Segmented } from '@/components/builder/Segmented';
import { StepRow } from '@/components/builder/StepRow';
import { StepTimeline } from '@/components/StepTimeline';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { computeWorkoutMetrics } from '@/domain/workout';
import { longDate, shiftDays, todayISO } from '@/lib/date';
import { formatDurationShort, formatDuration } from '@/lib/format';
import { uid } from '@/lib/id';
import { useAppStore } from '@/store/useAppStore';
import { SPORT_LABEL } from '@/theme/sport';
import { palette } from '@/theme/tokens';
import { SPORTS, type Sport, type Step } from '@/types/domain';

const schema = z.object({
  title: z.string().min(2, 'Give the workout a title'),
  sport: z.enum(SPORTS),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function newLeaf(type: Step['type'] = 'steady'): Step {
  return {
    id: uid('st'),
    type,
    repeatCount: 1,
    children: [],
    duration: { kind: 'time', seconds: 600 },
    target: { hrZone: 2 },
  };
}

function newRepeat(): Step {
  return {
    id: uid('st'),
    type: 'interval',
    repeatCount: 6,
    children: [
      {
        id: uid('st'),
        type: 'interval',
        repeatCount: 1,
        children: [],
        duration: { kind: 'time', seconds: 180 },
        target: { hrZone: 4 },
      },
      {
        id: uid('st'),
        type: 'recovery',
        repeatCount: 1,
        children: [],
        duration: { kind: 'time', seconds: 120 },
        target: { hrZone: 1 },
      },
    ],
  };
}

export default function WorkoutBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; id?: string }>();
  const editing = Boolean(params.id);

  // Read the workout being edited once, at mount. Screens that link here
  // (Detail, Library) already have data loaded, so `existing` is available
  // synchronously; snapshotting it means later store updates don't stomp the
  // user's in-progress edits.
  const [existing] = useState(() =>
    params.id ? useAppStore.getState().workouts.find((w) => w.id === params.id) : undefined,
  );
  const createWorkout = useAppStore((s) => s.createWorkout);
  const updateWorkout = useAppStore((s) => s.updateWorkout);
  const thresholds = useAppStore((s) => s.athlete?.thresholds);

  const [structure, setStructure] = useState<Step[]>(
    () => existing?.structure ?? [newLeaf('warmup'), newRepeat(), newLeaf('cooldown')],
  );
  const [target, setTarget] = useState<'date' | 'library'>(() =>
    existing?.isTemplate ? 'library' : 'date',
  );
  const [date, setDate] = useState<string>(() => existing?.date ?? params.date ?? todayISO());

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: existing?.title ?? '',
      sport: existing?.sport ?? 'run',
      description: existing?.description ?? '',
    },
  });

  const watchedSport = (useWatch({ control, name: 'sport' }) as Sport) ?? 'run';

  const metrics = useMemo(
    () => computeWorkoutMetrics(structure, watchedSport, thresholds),
    [structure, watchedSport, thresholds],
  );

  const updateStep = (idx: number, next: Step) =>
    setStructure((s) => s.map((st, i) => (i === idx ? next : st)));
  const removeStep = (idx: number) => setStructure((s) => s.filter((_, i) => i !== idx));

  const onSubmit = async (values: FormValues) => {
    const { durationSeconds, tss } = computeWorkoutMetrics(structure, values.sport, thresholds);
    const payload = {
      planId: existing?.planId ?? null,
      date: target === 'date' ? date : null,
      sport: values.sport,
      title: values.title,
      description: values.description || undefined,
      structure,
      plannedDuration: durationSeconds,
      plannedTss: tss,
      status: existing?.status ?? ('planned' as const),
      isTemplate: target === 'library',
      templateCategory: target === 'library' ? SPORT_LABEL[values.sport] : undefined,
      completed: existing?.completed,
    };

    if (editing && existing) {
      await updateWorkout(existing.id, payload);
    } else {
      await createWorkout(payload);
    }
    router.back();
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: editing ? 'Edit Workout' : 'New Workout',
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
        <ScrollView contentContainerClassName="p-lg gap-lg pb-40">
          {/* Metadata */}
          <View className="gap-sm">
            <Text variant="label" muted>
              Title
            </Text>
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="e.g. Bike — FTP 3x10"
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

          <View className="gap-sm">
            <Text variant="label" muted>
              Sport
            </Text>
            <Controller
              control={control}
              name="sport"
              render={({ field }) => (
                <Segmented
                  options={SPORTS.map((s) => ({ value: s, label: SPORT_LABEL[s] }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </View>

          <View className="gap-sm">
            <Text variant="label" muted>
              Schedule
            </Text>
            <Segmented
              options={[
                { value: 'date', label: 'On a date' },
                { value: 'library', label: 'Library' },
              ]}
              value={target}
              onChange={setTarget}
            />
            {target === 'date' ? (
              <View className="flex-row items-center justify-between rounded-md border border-border bg-surface px-sm py-2 dark:border-border-dark dark:bg-surface-dark">
                <Pressable
                  onPress={() => setDate((d) => shiftDays(d, -1))}
                  hitSlop={12}
                  className="p-sm">
                  <Ionicons name="chevron-back" size={20} color={palette.brand} />
                </Pressable>
                <Text variant="label">{longDate(date)}</Text>
                <Pressable
                  onPress={() => setDate((d) => shiftDays(d, 1))}
                  hitSlop={12}
                  className="p-sm">
                  <Ionicons name="chevron-forward" size={20} color={palette.brand} />
                </Pressable>
              </View>
            ) : (
              <Text variant="caption" muted>
                Saved as a reusable template in the Library.
              </Text>
            )}
          </View>

          {/* Live metrics */}
          <View className="gap-xs rounded-lg bg-brand/10 p-md">
            <View className="flex-row gap-md">
              <Metric label="Duration" value={formatDuration(metrics.durationSeconds)} />
              <Metric label="Est. TSS" value={String(metrics.tss)} />
              <Metric label="Blocks" value={String(metrics.blocks.length)} />
            </View>
            {metrics.hasHrEstimate ? (
              <Text variant="caption" muted>
                TSS is an hrTSS-style estimate for HR-zone steps — HR lag makes it rough on
                short, hard intervals.
              </Text>
            ) : null}
          </View>

          {structure.length > 0 ? (
            <StepTimeline structure={structure} sport={watchedSport} />
          ) : null}

          {/* Steps */}
          <View className="gap-md">
            <Text variant="heading">Structure</Text>
            {structure.map((step, idx) =>
              step.children.length > 0 ? (
                <RepeatBlock
                  key={step.id}
                  group={step}
                  sport={watchedSport}
                  onChange={(next) => updateStep(idx, next)}
                  onRemove={() => removeStep(idx)}
                />
              ) : (
                <StepRow
                  key={step.id}
                  step={step}
                  sport={watchedSport}
                  onChange={(next) => updateStep(idx, next)}
                  onRemove={() => removeStep(idx)}
                />
              ),
            )}

            <View className="flex-row gap-md">
              <Pressable
                onPress={() => setStructure((s) => [...s, newLeaf()])}
                className="flex-1 flex-row items-center justify-center gap-xs rounded-md border border-dashed border-border py-md dark:border-border-dark">
                <Ionicons name="add" size={16} color={palette.brand} />
                <Text variant="caption" className="text-brand">
                  Step
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStructure((s) => [...s, newRepeat()])}
                className="flex-1 flex-row items-center justify-center gap-xs rounded-md border border-dashed border-border py-md dark:border-border-dark">
                <Ionicons name="repeat" size={16} color={palette.brand} />
                <Text variant="caption" className="text-brand">
                  Interval set
                </Text>
              </Pressable>
            </View>
          </View>

          <Button
            label={editing ? 'Save changes' : 'Create workout'}
            onPress={handleSubmit(onSubmit)}
          />
          <Text variant="caption" muted className="text-center">
            {formatDurationShort(metrics.durationSeconds)} planned
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="heading">{value}</Text>
    </View>
  );
}
