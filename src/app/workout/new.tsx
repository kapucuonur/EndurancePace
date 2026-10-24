import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
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
import { SportGlyph } from '@/components/SportGlyph';
import { StepTimeline } from '@/components/StepTimeline';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { computeWorkoutMetrics } from '@/domain/workout';
import { useT } from '@/i18n/useT';
import { longDate, shiftDays, todayISO } from '@/lib/date';
import { formatDuration } from '@/lib/format';
import { uid } from '@/lib/id';
import { useKeyboardOffset } from '@/lib/keyboard';
import { goBack } from '@/lib/nav';
import { cloneStep, moveItem } from '@/lib/steps';
import { useAppStore } from '@/store/useAppStore';
import { SPORT_LABEL } from '@/theme/sport';
import { palette } from '@/theme/tokens';
import { SPORTS, type Sport, type Step } from '@/types/domain';

// Error text is resolved via i18n at render (workoutBuilder.titleError), not shown from here.
const schema = z.object({
  title: z.string().min(2),
  sport: z.enum(SPORTS),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function leaf(type: Step['type'], seconds: number, hrZone: 1 | 2 | 3 | 4 | 5): Step {
  return {
    id: uid('st'),
    type,
    repeatCount: 1,
    children: [],
    duration: { kind: 'time', seconds },
    target: { hrZone },
  };
}

/** What each "add block" option drops in; everything is editable afterwards. */
const BLOCKS = {
  warmup: () => leaf('warmup', 10 * 60, 1),
  main: () => leaf('steady', 30 * 60, 2),
  interval: (): Step => ({
    id: uid('st'),
    type: 'interval',
    repeatCount: 5,
    children: [leaf('interval', 3 * 60, 4), leaf('recovery', 2 * 60, 1)],
  }),
  cooldown: () => leaf('cooldown', 10 * 60, 1),
} as const;
type BlockKind = keyof typeof BLOCKS;
const BLOCK_ICON: Record<BlockKind, keyof typeof Ionicons.glyphMap> = {
  warmup: 'trending-up',
  main: 'remove',
  interval: 'repeat',
  cooldown: 'trending-down',
};

/**
 * Route wrapper. When editing, wait until the workout is in the store before
 * mounting the form: on a cold load (web refresh, deep link) the snapshot
 * arrives after mount, and a form built from "not found" would show defaults
 * and save a duplicate instead of updating.
 */
export default function WorkoutBuilderRoute() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const hydrated = useAppStore((s) => s.hydrated);
  const found = useAppStore((s) => (id ? s.workouts.some((w) => w.id === id) : false));

  if (id && !found) {
    return (
      <Screen className="items-center justify-center">
        {hydrated ? (
          <Text muted>{t('workoutDetail.notFound')}</Text>
        ) : (
          <ActivityIndicator color={palette.brand} />
        )}
      </Screen>
    );
  }
  return <WorkoutBuilderScreen key={id ?? 'new'} />;
}

function WorkoutBuilderScreen() {
  const keyboardOffset = useKeyboardOffset(useHeaderHeight());
  const params = useLocalSearchParams<{
    date?: string;
    id?: string;
    assignTo?: string;
    assignName?: string;
  }>();
  const editing = Boolean(params.id);
  const assignTo = params.assignTo || undefined;
  const t = useT();

  // Read the workout being edited once, at mount (the route wrapper guarantees
  // it's loaded). Snapshotting it means later store updates don't stomp the
  // user's in-progress edits.
  const [existing] = useState(() =>
    params.id ? useAppStore.getState().workouts.find((w) => w.id === params.id) : undefined,
  );
  const createWorkout = useAppStore((s) => s.createWorkout);
  const updateWorkout = useAppStore((s) => s.updateWorkout);
  const assignWorkoutTo = useAppStore((s) => s.assignWorkoutTo);
  const thresholds = useAppStore((s) => s.athlete?.thresholds);

  const [structure, setStructure] = useState<Step[]>(() => existing?.structure ?? []);
  const [target, setTarget] = useState<'date' | 'library'>(() =>
    existing?.isTemplate && !assignTo ? 'library' : 'date',
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

  // One step (or interval-set header) open for editing at a time; the rest stay compact.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  const updateStep = (idx: number, next: Step) =>
    setStructure((s) => s.map((st, i) => (i === idx ? next : st)));
  const removeStep = (idx: number) => setStructure((s) => s.filter((_, i) => i !== idx));
  const duplicateStep = (idx: number) => {
    const copy = cloneStep(structure[idx]);
    setStructure((s) => [...s.slice(0, idx + 1), copy, ...s.slice(idx + 1)]);
    setExpandedId(copy.id);
  };
  const addStep = (step: Step) => {
    setStructure((s) => [...s, step]);
    setExpandedId(step.id);
  };

  const onSubmit = async (values: FormValues) => {
    const { durationSeconds, tss } = computeWorkoutMetrics(structure, values.sport, thresholds);
    const isLibrary = target === 'library' && !assignTo;
    const payload = {
      planId: existing?.planId ?? null,
      date: isLibrary ? null : date,
      sport: values.sport,
      title: values.title,
      description: values.description || undefined,
      structure,
      plannedDuration: durationSeconds,
      plannedTss: tss,
      status: existing?.status ?? ('planned' as const),
      isTemplate: isLibrary,
      templateCategory: isLibrary ? SPORT_LABEL[values.sport] : undefined,
      completed: existing?.completed,
    };

    try {
      if (assignTo) {
        await assignWorkoutTo(assignTo, payload);
      } else if (editing && existing) {
        await updateWorkout(existing.id, payload);
      } else {
        await createWorkout(payload);
      }
    } catch (e) {
      Alert.alert(t('workoutBuilder.couldNotSave'), e instanceof Error ? e.message : String(e));
      return;
    }
    goBack();
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: assignTo
            ? t('nav.assignWorkout')
            : editing
              ? t('nav.editWorkout')
              : t('nav.newWorkout'),
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable
              onPress={goBack}
              hitSlop={8}
              // Web's header has no leading inset, so the label would touch the edge.
              className={Platform.OS === 'web' ? 'px-md' : 'pr-md'}>
              <Text className="text-brand">{t('common.cancel')}</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
        className="flex-1">
        <ScrollView
          contentContainerClassName="p-lg gap-lg pb-lg"
          keyboardShouldPersistTaps="handled">
          {/* Title, sport, schedule */}
          <View className="gap-md">
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <View className="gap-xs">
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={t('workoutBuilder.titlePlaceholder')}
                    placeholderTextColor={palette.textFaint}
                    accessibilityLabel={t('workoutBuilder.titleLabel')}
                    className="border-b border-border pb-sm text-xl font-semibold text-fg dark:border-border-dark dark:text-fg-dark"
                  />
                  {fieldState.error ? (
                    <Text variant="caption" style={{ color: palette.danger }}>
                      {t('workoutBuilder.titleError')}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="sport"
              render={({ field }) => (
                <View className="flex-row gap-sm" accessibilityRole="radiogroup">
                  {SPORTS.map((s) => {
                    const on = field.value === s;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => field.onChange(s)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={t(`sport.${s}`)}
                        className={`flex-1 items-center gap-1 rounded-lg border py-sm active:opacity-70 ${
                          on
                            ? 'border-brand bg-brand/10'
                            : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
                        }`}>
                        <SportGlyph sport={s} size={20} />
                        <Text
                          variant="caption"
                          style={{
                            color: on ? palette.brand : undefined,
                            fontWeight: on ? '600' : '400',
                          }}>
                          {t(`sport.${s}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />

            {assignTo ? (
              <View className="flex-row items-center gap-xs self-start rounded-full bg-brand/10 px-md py-1.5">
                <Ionicons name="person" size={14} color={palette.brand} />
                <Text variant="caption" style={{ color: palette.brand }}>
                  {t('workoutBuilder.assignToLabel')}:{' '}
                  {params.assignName || t('workoutBuilder.thisAthlete')}
                </Text>
              </View>
            ) : (
              <Segmented
                options={[
                  { value: 'date', label: t('workoutBuilder.onDate') },
                  { value: 'library', label: t('workoutBuilder.library') },
                ]}
                value={target}
                onChange={setTarget}
              />
            )}
            {target === 'date' || assignTo ? (
              <View className="flex-row items-center justify-between rounded-md border border-border bg-surface px-xs py-1 dark:border-border-dark dark:bg-surface-dark">
                <Pressable
                  onPress={() => setDate((d) => shiftDays(d, -1))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('workoutBuilder.prevDay')}
                  className="p-sm">
                  <Ionicons name="chevron-back" size={20} color={palette.brand} />
                </Pressable>
                <Text variant="label">{longDate(date)}</Text>
                <Pressable
                  onPress={() => setDate((d) => shiftDays(d, 1))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('workoutBuilder.nextDay')}
                  className="p-sm">
                  <Ionicons name="chevron-forward" size={20} color={palette.brand} />
                </Pressable>
              </View>
            ) : (
              <Text variant="caption" muted>
                {t('workoutBuilder.savedAsTemplate')}
              </Text>
            )}
          </View>

          {/* Shape of the session */}
          {structure.length > 0 ? (
            <StepTimeline structure={structure} sport={watchedSport} />
          ) : null}

          {/* Steps */}
          <View className="gap-sm">
            <View className="flex-row items-baseline justify-between">
              <Text variant="heading">{t('workoutBuilder.structure')}</Text>
              {structure.length > 0 ? (
                <Text variant="caption" muted>
                  {t('workoutBuilder.tapToEdit')}
                </Text>
              ) : null}
            </View>
            {structure.map((step, idx) => {
              const actions = {
                onMoveUp: idx > 0 ? () => setStructure((s) => moveItem(s, idx, -1)) : undefined,
                onMoveDown:
                  idx < structure.length - 1
                    ? () => setStructure((s) => moveItem(s, idx, 1))
                    : undefined,
                onDuplicate: () => duplicateStep(idx),
                onRemove: () => removeStep(idx),
              };
              return step.children.length > 0 ? (
                <RepeatBlock
                  key={step.id}
                  group={step}
                  sport={watchedSport}
                  expandedId={expandedId}
                  onToggle={toggle}
                  onChange={(next) => updateStep(idx, next)}
                  {...actions}
                />
              ) : (
                <StepRow
                  key={step.id}
                  step={step}
                  sport={watchedSport}
                  expanded={expandedId === step.id}
                  onToggle={() => toggle(step.id)}
                  onChange={(next) => updateStep(idx, next)}
                  {...actions}
                />
              );
            })}

            {structure.length === 0 ? (
              <View className="items-center gap-xs rounded-lg border border-dashed border-border px-lg py-lg dark:border-border-dark">
                <Text variant="label">{t('workoutBuilder.emptyTitle')}</Text>
                <Text variant="caption" muted className="text-center">
                  {t('workoutBuilder.emptyBody')}
                </Text>
              </View>
            ) : null}

            <View className="flex-row flex-wrap gap-sm">
              {(Object.keys(BLOCKS) as BlockKind[]).map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => addStep(BLOCKS[kind]())}
                  accessibilityRole="button"
                  className="flex-row items-center gap-1.5 rounded-full border border-brand/40 bg-brand/5 px-md py-2 active:opacity-70">
                  <Ionicons name={BLOCK_ICON[kind]} size={15} color={palette.brand} />
                  <Text variant="caption" style={{ color: palette.brand, fontWeight: '600' }}>
                    {t(`workoutBuilder.add_${kind}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {metrics.hasHrEstimate ? (
              <Text variant="caption" muted>
                {t('workoutBuilder.hrEstimateNote')}
              </Text>
            ) : null}
          </View>
        </ScrollView>

        {/* Sticky footer: totals + save */}
        <View className="flex-row items-center gap-md border-t border-border bg-bg px-lg py-sm dark:border-border-dark dark:bg-bg-dark">
          <View>
            <Text variant="heading">{formatDuration(metrics.durationSeconds)}</Text>
            <Text variant="caption" muted>
              {t('workoutBuilder.footerTss', { tss: metrics.tss })}
            </Text>
          </View>
          <Button
            className="flex-1"
            label={
              assignTo
                ? t('workoutBuilder.assignWorkout')
                : editing
                  ? t('workoutBuilder.saveChanges')
                  : t('workoutBuilder.createWorkout')
            }
            onPress={handleSubmit(onSubmit)}
            disabled={structure.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
