import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { flattenSteps } from '@/domain/workout';
import { formatDuration } from '@/lib/format';
import { stepColors } from '@/theme/tokens';
import type { Sport, Step } from '@/types/domain';

interface Props {
  structure: Step[];
  sport: Sport;
}

/** Horizontal bar of colored blocks, each proportional to its duration. */
export function StepTimeline({ structure, sport }: Props) {
  const blocks = flattenSteps(structure, sport);
  const total = blocks.reduce((s, b) => s + b.seconds, 0) || 1;

  return (
    <View className="gap-sm">
      <View className="h-14 flex-row overflow-hidden rounded-md">
        {blocks.map((b, i) => (
          <View
            key={b.stepId + i}
            style={{
              flexGrow: b.seconds / total,
              flexBasis: 0,
              backgroundColor: stepColors[b.type] ?? '#9AA0AB',
            }}
            className="border-r border-white/40"
          />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-x-md gap-y-xs">
        {dedupeLegend(blocks).map((t) => (
          <View key={t} className="flex-row items-center gap-xs">
            <View
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: stepColors[t] ?? '#9AA0AB' }}
            />
            <Text variant="caption" muted className="capitalize">
              {t}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" muted>
        Total {formatDuration(total)} · {blocks.length} blocks
      </Text>
    </View>
  );
}

function dedupeLegend(blocks: { type: string }[]): string[] {
  return Array.from(new Set(blocks.map((b) => b.type)));
}
