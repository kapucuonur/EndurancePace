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
import { formatDuration, formatDurationShort } from '@/lib/format';
import { useAppStore, useWorkout } from '@/store/useAppStore';
import { SPORT_LABEL } from '@/theme/sport';
import { palette, stepColors } from '@/theme/tokens';

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
          </View>
        </View>

        {workout.description ? <Text muted>{workout.description}</Text> : null}

        <View className="flex-row gap-md rounded-lg bg-surface p-md dark:bg-surface-dark">
          <Stat label="Planned" value={formatDurationShort(workout.plannedDuration)} />
          <Stat label="Planned TSS" value={String(workout.plannedTss)} />
        </View>

        {workout.completed ? (
          <View className="gap-xs rounded-lg border border-success/40 bg-success/10 p-md">
            <View className="flex-row items-center gap-xs">
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <Text variant="label">Completed</Text>
            </View>
            <Text variant="caption" muted>
              {[
                workout.completed.durationSeconds &&
                  formatDurationShort(workout.completed.durationSeconds),
                workout.completed.actualTss != null && `${workout.completed.actualTss} TSS`,
                workout.completed.rpe != null && `RPE ${workout.completed.rpe}`,
              ]
                .filter(Boolean)
                .join(' · ') || 'Logged'}
            </Text>
            {workout.completed.notes ? (
              <Text variant="caption" muted>
                {workout.completed.notes}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="gap-md">
          <Text variant="heading">Structure</Text>
          <StepTimeline structure={workout.structure} sport={workout.sport} />
        </View>

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
            router.back();
          }}
        />
      </ScrollView>
    </Screen>
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
