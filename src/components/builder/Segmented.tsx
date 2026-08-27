import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, className }: Props<T>) {
  return (
    <View
      className={`flex-row rounded-md border border-border bg-surface p-0.5 dark:border-border-dark dark:bg-surface-dark ${
        className ?? ''
      }`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`flex-1 items-center rounded-sm px-sm py-1.5 ${
              active ? 'bg-brand' : ''
            }`}>
            <Text
              variant="caption"
              className={
                active ? 'font-semibold text-white' : 'text-muted dark:text-muted-dark'
              }>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
