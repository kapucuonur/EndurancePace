import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Stepper } from '@/components/builder/Stepper';
import { ActionBar, StepRow, type StepActions } from '@/components/builder/StepRow';
import { Text } from '@/components/ui/Text';
import { stepSeconds } from '@/domain/workout';
import { useT } from '@/i18n/useT';
import { formatDuration } from '@/lib/format';
import { uid } from '@/lib/id';
import { cloneStep, moveItem } from '@/lib/steps';
import { palette } from '@/theme/tokens';
import type { Sport, Step } from '@/types/domain';

interface Props extends StepActions {
  group: Step;
  sport: Sport;
  onChange: (next: Step) => void;
  /** The one step id open for editing anywhere in the workout (or null). */
  expandedId: string | null;
  onToggle: (id: string) => void;
}

/** An interval set: `N ×` header, its steps indented underneath. */
export function RepeatBlock({
  group,
  sport,
  onChange,
  expandedId,
  onToggle,
  ...actions
}: Props) {
  const t = useT();
  const headerOpen = expandedId === group.id;
  const roundSeconds = group.children.reduce((sum, c) => sum + stepSeconds(c, sport), 0);

  const setChildren = (children: Step[]) => onChange({ ...group, children });
  const updateChild = (idx: number, next: Step) =>
    setChildren(group.children.map((c, i) => (i === idx ? next : c)));
  const addChild = () => {
    const child: Step = {
      id: uid('st'),
      type: 'recovery',
      repeatCount: 1,
      children: [],
      duration: { kind: 'time', seconds: 60 },
      target: { hrZone: 1 },
    };
    setChildren([...group.children, child]);
    onToggle(child.id);
  };

  return (
    <View className="gap-sm rounded-lg border border-brand/30 bg-brand/5 p-sm">
      <Pressable
        onPress={() => onToggle(group.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded: headerOpen }}
        className="flex-row items-center gap-sm px-xs py-xs active:opacity-70">
        <Ionicons name="repeat" size={18} color={palette.brand} />
        <Text variant="label" style={{ color: palette.brand }}>
          {t('stepRow.repeatTimes', { count: group.repeatCount })}
        </Text>
        <Text variant="caption" muted className="flex-1">
          {t('stepRow.perRound', { duration: formatDuration(roundSeconds) })}
        </Text>
        <Ionicons
          name={headerOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={palette.textFaint}
        />
      </Pressable>

      {headerOpen ? (
        <View className="gap-sm px-xs">
          <Stepper
            label={t('stepRow.repeatLabel')}
            value={group.repeatCount}
            min={1}
            max={50}
            step={() => 1}
            format={String}
            parse={(txt) => (Number(txt) ? Math.round(Number(txt)) : null)}
            suffix="×"
            onChange={(repeatCount) => onChange({ ...group, repeatCount })}
          />
          <ActionBar {...actions} />
        </View>
      ) : null}

      <View className="gap-sm border-l-2 border-brand/30 pl-sm">
        {group.children.map((child, idx) => (
          <StepRow
            key={child.id}
            step={child}
            sport={sport}
            nested
            expanded={expandedId === child.id}
            onToggle={() => onToggle(child.id)}
            onChange={(next) => updateChild(idx, next)}
            onMoveUp={
              idx > 0 ? () => setChildren(moveItem(group.children, idx, -1)) : undefined
            }
            onMoveDown={
              idx < group.children.length - 1
                ? () => setChildren(moveItem(group.children, idx, 1))
                : undefined
            }
            onDuplicate={() => {
              const copy = cloneStep(child);
              const children = group.children.slice();
              children.splice(idx + 1, 0, copy);
              setChildren(children);
              onToggle(copy.id);
            }}
            onRemove={() => setChildren(group.children.filter((_, i) => i !== idx))}
          />
        ))}
        <Pressable
          onPress={addChild}
          accessibilityRole="button"
          className="flex-row items-center justify-center gap-xs rounded-md border border-dashed border-brand/40 py-sm active:opacity-70">
          <Ionicons name="add" size={16} color={palette.brand} />
          <Text variant="caption" style={{ color: palette.brand }}>
            {t('stepRow.addStepToSet')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
