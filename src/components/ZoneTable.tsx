import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { formatPace } from '@/lib/format';
import type { Zone } from '@/types/domain';

interface Props {
  title: string;
  zones: readonly Zone[] | undefined;
  unit: 'bpm' | 'w' | 'pace';
  /** Pace label suffix, e.g. "/km" or "/100m". */
  paceSuffix?: string;
}

export function ZoneTable({ title, zones, unit, paceSuffix }: Props) {
  return (
    <View className="gap-xs rounded-lg border border-border bg-surface p-md dark:border-border-dark dark:bg-surface-dark">
      <Text variant="label">{title}</Text>
      {!zones ? (
        <Text variant="caption" muted>
          Set the matching threshold to calculate.
        </Text>
      ) : (
        zones.map((z) => (
          <View key={z.index} className="flex-row items-center justify-between py-0.5">
            <Text variant="caption" className="w-10 font-semibold text-brand">
              Z{z.index}
            </Text>
            <Text variant="caption" muted className="flex-1">
              {z.name}
            </Text>
            <Text variant="caption">{formatRange(z, unit, paceSuffix)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function formatRange(z: Zone, unit: Props['unit'], paceSuffix?: string): string {
  if (unit === 'pace') {
    const fast = formatPace(z.min);
    const slow = z.max ? formatPace(z.max) : null;
    return slow ? `${fast}–${slow}${paceSuffix ?? ''}` : `< ${fast}${paceSuffix ?? ''}`;
  }
  const suffix = unit === 'bpm' ? ' bpm' : ' W';
  if (z.max == null) return `${z.min}+${suffix}`;
  return `${z.min}–${z.max}${suffix}`;
}
