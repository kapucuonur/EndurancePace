import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { totalWeeks } from '@/domain/plan';
import { useT } from '@/i18n/useT';
import { PHASE_COLOR } from '@/theme/phase';
import { palette } from '@/theme/tokens';
import { PERIODIZATION_PHASES, type PeriodizationPhase, type PlanBlock } from '@/types/domain';

interface Props {
  blocks: PlanBlock[];
  onChange: (blocks: PlanBlock[]) => void;
  /** Weeks the goal race implies, for the mismatch hint. */
  targetWeeks?: number;
}

function nextPhase(p: PeriodizationPhase): PeriodizationPhase {
  const i = PERIODIZATION_PHASES.indexOf(p);
  return PERIODIZATION_PHASES[(i + 1) % PERIODIZATION_PHASES.length];
}

export function PhaseAllocator({ blocks, onChange, targetWeeks }: Props) {
  const t = useT();
  const total = totalWeeks(blocks);

  const set = (idx: number, patch: Partial<PlanBlock>) =>
    onChange(blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const remove = (idx: number) => onChange(blocks.filter((_, i) => i !== idx));
  const add = () => onChange([...blocks, { phase: 'build', weeks: 2 }]);

  const diff = targetWeeks != null ? total - targetWeeks : 0;

  return (
    <View className="gap-md">
      {/* proportional preview */}
      <View className="h-3 flex-row overflow-hidden rounded-full">
        {blocks.length === 0 ? (
          <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark" />
        ) : (
          blocks.map((b, i) => (
            <View
              key={i}
              style={{
                flexGrow: Math.max(0.001, b.weeks),
                flexBasis: 0,
                backgroundColor: PHASE_COLOR[b.phase],
              }}
            />
          ))
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="label">{t('phaseAllocator.weeksTotal', { count: total })}</Text>
        {targetWeeks != null && diff !== 0 ? (
          <Text variant="caption" className="text-warning">
            {diff > 0
              ? t('phaseAllocator.pastRace', { count: diff })
              : t('phaseAllocator.shortRace', { count: -diff })}
          </Text>
        ) : targetWeeks != null ? (
          <Text variant="caption" className="text-success">
            {t('phaseAllocator.matchesRace')}
          </Text>
        ) : null}
      </View>

      <View className="gap-sm">
        {blocks.map((b, i) => (
          <View
            key={i}
            className="flex-row items-center gap-sm rounded-md border border-border bg-surface p-sm dark:border-border-dark dark:bg-surface-dark">
            <View
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: PHASE_COLOR[b.phase] }}
            />
            <Pressable
              onPress={() => set(i, { phase: nextPhase(b.phase) })}
              className="flex-1"
              hitSlop={6}>
              <Text variant="label">{t(`phase.${b.phase}`)}</Text>
            </Pressable>

            <Pressable
              onPress={() => set(i, { weeks: Math.max(1, b.weeks - 1) })}
              hitSlop={8}
              className="p-xs">
              <Ionicons name="remove-circle-outline" size={22} color={palette.brand} />
            </Pressable>
            <Text variant="label" className="w-12 text-center">
              {t('units.weeksShort', { count: b.weeks })}
            </Text>
            <Pressable
              onPress={() => set(i, { weeks: b.weeks + 1 })}
              hitSlop={8}
              className="p-xs">
              <Ionicons name="add-circle-outline" size={22} color={palette.brand} />
            </Pressable>
            <Pressable onPress={() => remove(i)} hitSlop={8} className="p-xs">
              <Ionicons name="trash-outline" size={18} color={palette.danger} />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        onPress={add}
        className="flex-row items-center justify-center gap-xs rounded-md border border-dashed border-border py-sm dark:border-border-dark">
        <Ionicons name="add" size={16} color={palette.brand} />
        <Text variant="caption" className="text-brand">
          {t('phaseAllocator.addPhase')}
        </Text>
      </Pressable>

      <Text variant="caption" muted>
        {t('phaseAllocator.hint')}
      </Text>
    </View>
  );
}
