import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/tokens';

interface Props {
  value: number;
  onChange: (next: number) => void;
  /** Size of one −/+ press for the current value (lets time steps grow as they get longer). */
  step: (current: number, dir: 1 | -1) => number;
  min?: number;
  max?: number;
  /** Text shown in the field. */
  format: (v: number) => string;
  /** Parse what the user typed; null keeps the old value. */
  parse: (txt: string) => number | null;
  suffix?: string;
  label: string;
  keyboardType?: 'number-pad' | 'numbers-and-punctuation' | 'default';
}

/** `−  [ value ]  +` control. The field is editable; it commits on blur. */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  format,
  parse,
  suffix,
  label,
  keyboardType = 'number-pad',
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const bump = (dir: 1 | -1) => {
    setDraft(null);
    onChange(clamp(value + dir * step(value, dir)));
  };
  const commit = () => {
    if (draft !== null) {
      const p = parse(draft);
      if (p !== null) onChange(clamp(p));
    }
    setDraft(null);
  };

  return (
    <View className="flex-row items-center gap-sm">
      <StepButton
        icon="remove"
        label={`${label} −`}
        onPress={() => bump(-1)}
        disabled={value <= min}
      />
      <View className="min-w-[92px] flex-row items-center justify-center gap-1 rounded-md border border-border bg-bg px-sm py-2 dark:border-border-dark dark:bg-bg-dark">
        <TextInput
          value={draft ?? format(value)}
          onChangeText={setDraft}
          onEndEditing={commit}
          onBlur={commit}
          selectTextOnFocus
          keyboardType={keyboardType}
          accessibilityLabel={label}
          className="min-w-[48px] text-center text-lg font-semibold text-fg dark:text-fg-dark"
        />
        {suffix ? (
          <Text variant="caption" muted>
            {suffix}
          </Text>
        ) : null}
      </View>
      <StepButton
        icon="add"
        label={`${label} +`}
        onPress={() => bump(1)}
        disabled={value >= max}
      />
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'add' | 'remove';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={`h-10 w-10 items-center justify-center rounded-full bg-brand/10 active:opacity-60 ${
        disabled ? 'opacity-40' : ''
      }`}>
      <Ionicons name={icon} size={20} color={palette.brand} />
    </Pressable>
  );
}
