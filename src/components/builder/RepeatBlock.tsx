import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

import { StepRow } from '@/components/builder/StepRow';
import { Text } from '@/components/ui/Text';
import { uid } from '@/lib/id';
import { palette } from '@/theme/tokens';
import type { Step } from '@/types/domain';

interface Props {
  group: Step;
  onChange: (next: Step) => void;
  onRemove: () => void;
}

/** Editor for an interval set: repeatCount x [ child steps ]. */
export function RepeatBlock({ group, onChange, onRemove }: Props) {
  const setCount = (txt: string) =>
    onChange({ ...group, repeatCount: Math.max(1, Number(txt) || 1) });

  const updateChild = (idx: number, next: Step) => {
    const children = group.children.slice();
    children[idx] = next;
    onChange({ ...group, children });
  };
  const removeChild = (idx: number) =>
    onChange({ ...group, children: group.children.filter((_, i) => i !== idx) });
  const addChild = () =>
    onChange({
      ...group,
      children: [
        ...group.children,
        {
          id: uid('st'),
          type: 'recovery',
          repeatCount: 1,
          children: [],
          duration: { kind: 'time', seconds: 60 },
          target: { hrZone: 1 },
        },
      ],
    });

  return (
    <View className="gap-sm rounded-lg border-2 border-brand/40 p-md">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-sm">
          <Ionicons name="repeat" size={18} color={palette.brand} />
          <TextInput
            value={String(group.repeatCount)}
            onChangeText={setCount}
            keyboardType="number-pad"
            className="w-10 rounded-md border border-border bg-bg px-sm py-1 text-center text-base text-fg dark:border-border-dark dark:bg-bg-dark"
          />
          <Text variant="label">× repeats</Text>
        </View>
        <Ionicons name="trash-outline" size={18} color={palette.danger} onPress={onRemove} />
      </View>

      <View className="gap-sm">
        {group.children.map((child, idx) => (
          <StepRow
            key={child.id}
            step={child}
            nested
            onChange={(next) => updateChild(idx, next)}
            onRemove={() => removeChild(idx)}
          />
        ))}
      </View>

      <Pressable
        onPress={addChild}
        className="flex-row items-center justify-center gap-xs rounded-md border border-dashed border-border py-sm dark:border-border-dark">
        <Ionicons name="add" size={16} color={palette.brand} />
        <Text variant="caption" className="text-brand">
          Add step to set
        </Text>
      </Pressable>
    </View>
  );
}
