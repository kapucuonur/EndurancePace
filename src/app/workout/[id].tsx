import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { SportGlyph } from '@/components/SportGlyph';
import { StepTimeline } from '@/components/StepTimeline';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { flattenSteps } from '@/domain/workout';
import { longDate } from '@/lib/date';
import { formatDistance, formatDuration, formatDurationShort, formatSpeed } from '@/lib/format';
import { goBack } from '@/lib/nav';
import { useAppStore, useWorkout } from '@/store/useAppStore';
import { SPORT_LABEL } from '@/theme/sport';
import { palette, stepColors } from '@/theme/tokens';
import type { Workout } from '@/types/domain';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const workout = useWorkout(id);
  const setWorkoutStatus = useAppStore((s) => s.setWorkoutStatus);
  const deleteWorkout = useAppStore((s) => s.deleteWorkout);

  if (!workout) {
    return (
      <Screen className="items-center justify-center">
        <Text muted>Workout not found.</Text>
      </Screen>
    );
  }

  const blocks = flattenSteps(workout.structure, workout.sport);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: SPORT_LABEL[workout.sport],
          headerRight: () => (
            <Ionicons
              name="create-outline"
              size={22}
              color={palette.brand}
              onPress={() =>
                router.push({ pathname: '/workout/new', params: { id: workout.id } })
              }
            />
          ),
        }}
      />
      <ScrollView contentContainerClassName="p-lg gap-lg pb-28">
        <View className="flex-row items-center gap-md">
          <SportGlyph sport={workout.sport} chip size={20} />
          <View className="flex-1">
            <Text variant="title">{workout.title}</Text>
            <Text variant="caption" muted>
              {workout.date ? longDate(workout.date) : 'Library template'} · {workout.status}
            </Text>
            {workout.source !== 'manual' ? (
              <View className="mt-1 flex-row items-center gap-1 self-start rounded-full bg-brand-tint px-2 py-0.5 dark:bg-surface-alt-dark">
                <Ionicons
                  name={workout.source === 'garmin' ? 'watch-outline' : 'person-outline'}
                  size={11}
                  color={palette.brand}
                />
                <Text variant="caption" className="text-brand">
                  {workout.source === 'garmin' ? 'Garmin' : 'From coach'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {workout.description ? <Text muted>{workout.description}</Text> : null}

        <View className="flex-row gap-md rounded-lg bg-surface p-md dark:bg-surface-dark">
          <Stat label="Planned" value={formatDurationShort(workout.plannedDuration)} />
          <Stat label="Planned TSS" value={String(workout.plannedTss)} />
        </View>

        {workout.completed ? <ActualCard workout={workout} /> : null}

        {workout.structure.length ? (
          <View className="gap-md">
            <Text variant="heading">Structure</Text>
            <StepTimeline structure={workout.structure} sport={workout.sport} />
          </View>
        ) : null}

        <View className="gap-sm">
          {blocks.map((b, i) => (
            <View
              key={b.stepId + i}
              className="flex-row items-center gap-md rounded-md border border-border bg-surface p-md dark:border-border-dark dark:bg-surface-dark">
              <View
                className="h-8 w-1.5 rounded-full"
                style={{ backgroundColor: stepColors[b.type] ?? palette.textFaint }}
              />
              <View className="flex-1">
                <Text variant="label" className="capitalize">
                  {b.label ?? b.type}
                </Text>
                <Text variant="caption" muted>
                  {formatDuration(b.seconds)}
                  {b.zone ? ` · Zone ${b.zone}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {!workout.isTemplate ? (
          <View className="gap-sm">
            <View className="flex-row gap-md">
              <Button
                label="Complete"
                variant={workout.status === 'completed' ? 'secondary' : 'primary'}
                onPress={() => setWorkoutStatus(workout.id, 'completed')}
                className="flex-1"
              />
              <Button
                label="Skip"
                variant={workout.status === 'skipped' ? 'secondary' : 'secondary'}
                onPress={() => setWorkoutStatus(workout.id, 'skipped')}
                className="flex-1"
              />
            </View>
            <Button
              label="Reset to planned"
              variant="ghost"
              onPress={() => setWorkoutStatus(workout.id, 'planned')}
            />
          </View>
        ) : null}

        <Button
          label="Delete workout"
          variant="danger"
          onPress={async () => {
            await deleteWorkout(workout.id);
            goBack();
          }}
        />
      </ScrollView>
    </Screen>
  );
}

/** Measured results for a logged / synced session. Shows whatever metrics are
 *  present, with the planned figure alongside duration and TSS. */
function ActualCard({ workout }: { workout: Workout }) {
  const c = workout.completed;
  if (!c) return null;

  const metrics: { label: string; value: string; sub?: string }[] = [];

  if (c.durationSeconds != null) {
    metrics.push({
      label: 'Duration',
      value: formatDurationShort(c.durationSeconds),
      sub: workout.plannedDuration
        ? `planned ${formatDurationShort(workout.plannedDuration)}`
        : undefined,
    });
  }
  if (c.distanceMeters != null) {
    metrics.push({ label: 'Distance', value: formatDistance(c.distanceMeters) });
  }
  if (c.avgSpeedMps != null) {
    const s = formatSpeed(c.avgSpeedMps, workout.sport);
    metrics.push({
      label: workout.sport === 'bike' ? 'Avg speed' : 'Avg pace',
      value: `${s.value} ${s.unit}`.trim(),
    });
  }
  if (c.actualTss != null) {
    metrics.push({
      label: 'TSS',
      value: String(Math.round(c.actualTss)),
      sub: workout.plannedTss ? `planned ${workout.plannedTss}` : undefined,
    });
  }
  if (c.avgHr != null) metrics.push({ label: 'Avg HR', value: `${Math.round(c.avgHr)} bpm` });
  if (c.maxHr != null) metrics.push({ label: 'Max HR', value: `${Math.round(c.maxHr)} bpm` });
  if (c.avgPower != null) {
    metrics.push({ label: 'Avg power', value: `${Math.round(c.avgPower)} W` });
  }
  if (c.avgCadence != null) {
    metrics.push({
      label: 'Avg cadence',
      value: `${Math.round(c.avgCadence)} ${workout.sport === 'bike' ? 'rpm' : 'spm'}`,
    });
  }
  if (c.elevationGainM != null) {
    metrics.push({ label: 'Elevation', value: `${Math.round(c.elevationGainM)} m` });
  }
  if (c.calories != null) {
    metrics.push({ label: 'Calories', value: `${Math.round(c.calories)} kcal` });
  }
  if (c.rpe != null) metrics.push({ label: 'RPE', value: String(c.rpe) });

  return (
    <View className="gap-md rounded-lg border border-success/40 bg-success/10 p-md">
      <View className="flex-row items-center gap-xs">
        <Ionicons name="checkmark-circle" size={16} color={palette.success} />
        <Text variant="label">Actual</Text>
        {workout.source === 'garmin' ? (
          <Text variant="caption" muted>
            · from Garmin
          </Text>
        ) : null}
      </View>

      {metrics.length ? (
        <View className="flex-row flex-wrap gap-y-md">
          {metrics.map((m) => (
            <View key={m.label} className="w-1/2 gap-0.5 pr-md">
              <Text variant="caption" muted>
                {m.label}
              </Text>
              <Text variant="heading">{m.value}</Text>
              {m.sub ? (
                <Text variant="caption" muted>
                  {m.sub}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text variant="caption" muted>
          Logged
        </Text>
      )}

      {c.notes ? (
        <Text variant="caption" muted>
          {c.notes}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="heading">{value}</Text>
    </View>
  );
}
