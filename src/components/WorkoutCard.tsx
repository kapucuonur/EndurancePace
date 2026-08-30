import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { SportGlyph } from '@/components/SportGlyph';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { formatDurationShort } from '@/lib/format';
import type { Workout } from '@/types/domain';

const STATUS_ICON: Record<Workout['status'], keyof typeof Ionicons.glyphMap | null> = {
  planned: null,
  completed: 'checkmark-circle',
  skipped: 'close-circle',
  modified: 'create',
};

const STATUS_COLOR: Record<Workout['status'], string> = {
  planned: '#9AA0AB',
  completed: '#1FA971',
  skipped: '#E5484D',
  modified: '#E8A13A',
};

export function WorkoutCard({ workout, onPress }: { workout: Workout; onPress?: () => void }) {
  const t = useT();
  const statusIcon = STATUS_ICON[workout.status];
  // For a logged session prefer the logged numbers; fall back to the plan.
  const done = workout.status === 'completed' ? workout.completed : undefined;
  const duration = done?.durationSeconds ?? workout.plannedDuration;
  const tss = done?.actualTss ?? workout.plannedTss;
  // Only call it "actual" when the TSS shown is genuinely the logged one.
  const isActual = done?.actualTss != null;
  return (
    <Card onPress={onPress} className="flex-row items-center gap-md">
      <SportGlyph sport={workout.sport} chip size={16} />
      <View className="flex-1">
        <Text variant="heading" numberOfLines={1}>
          {workout.title}
        </Text>
        <Text variant="caption" muted>
          {formatDurationShort(duration)} · {tss} {t('units.tss')}
          {isActual ? ` · ${t('common.actualTag')}` : ''}
        </Text>
      </View>
      {statusIcon ? (
        <Ionicons name={statusIcon} size={20} color={STATUS_COLOR[workout.status]} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#9AA0AB" />
      )}
    </Card>
  );
}
