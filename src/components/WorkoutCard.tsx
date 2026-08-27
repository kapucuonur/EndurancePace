import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { SportGlyph } from '@/components/SportGlyph';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
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
  const statusIcon = STATUS_ICON[workout.status];
  return (
    <Card onPress={onPress} className="flex-row items-center gap-md">
      <SportGlyph sport={workout.sport} chip size={16} />
      <View className="flex-1">
        <Text variant="heading" numberOfLines={1}>
          {workout.title}
        </Text>
        <Text variant="caption" muted>
          {formatDurationShort(workout.plannedDuration)} · {workout.plannedTss} TSS
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
