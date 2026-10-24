import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/tokens';

interface Props<T extends string> {
  options: readonly { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}

/** Wrapping single-select chips. A `color` adds a dot (step type / zone). */
export function ChipGroup<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row flex-wrap gap-xs" accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            aria-checked={on}
            className={`flex-row items-center gap-1.5 rounded-full border px-md py-1.5 active:opacity-70 ${
              on
                ? 'border-brand bg-brand/10'
                : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
            }`}>
            {o.color ? (
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.color }}
              />
            ) : null}
            <Text
              variant="caption"
              style={{ color: on ? palette.brand : undefined, fontWeight: on ? '600' : '400' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
