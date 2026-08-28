import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { blockRanges, totalWeeks } from '@/domain/plan';
import { daysBetween, todayISO } from '@/lib/date';
import { PHASE_LABEL, PHASE_COLOR } from '@/theme/phase';
import type { TrainingPlan } from '@/types/domain';

interface Props {
  plan: TrainingPlan;
  /** Show the "today" marker line. */
  showToday?: boolean;
  /** Bar only, no per-block labels. */
  compact?: boolean;
}

/** Read-only proportional periodization strip. */
export function PhaseTimeline({ plan, showToday = true, compact = false }: Props) {
  const blocks = plan.blocks ?? [];
  const total = totalWeeks(blocks);
  if (blocks.length === 0 || total === 0) return null;

  const ranges = blockRanges(plan);
  const spanDays = daysBetween(ranges[0].startDate, ranges[ranges.length - 1].endDate) + 1;
  const today = todayISO();
  const elapsed = daysBetween(ranges[0].startDate, today);
  const todayPct =
    showToday && elapsed >= 0 && elapsed <= spanDays ? (elapsed / spanDays) * 100 : null;

  return (
    <View className="gap-xs">
      <View className="relative py-1">
        <View className="h-2.5 flex-row overflow-hidden rounded-full">
          {blocks.map((b, i) => (
            <View
              key={i}
              style={{
                flexGrow: Math.max(0, b.weeks),
                flexBasis: 0,
                backgroundColor: PHASE_COLOR[b.phase],
              }}
            />
          ))}
        </View>
        {todayPct !== null ? (
          <View
            className="absolute top-0 h-[18px] w-0.5 rounded-full bg-fg dark:bg-fg-dark"
            style={{ left: `${todayPct}%` }}
          />
        ) : null}
      </View>

      {!compact ? (
        <View className="flex-row flex-wrap gap-x-md gap-y-xs">
          {blocks.map((b, i) => (
            <View key={i} className="flex-row items-center gap-xs">
              <View
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: PHASE_COLOR[b.phase] }}
              />
              <Text variant="caption" muted>
                {PHASE_LABEL[b.phase]} · {b.weeks}w
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
