import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';

import { Segmented } from '@/components/builder/Segmented';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/tokens';
import type { Step, StepType } from '@/types/domain';

const STEP_TYPE_OPTS: { value: StepType; label: string }[] = [
  { value: 'warmup', label: 'W/U' },
  { value: 'interval', label: 'Work' },
  { value: 'recovery', label: 'Rec' },
  { value: 'steady', label: 'Steady' },
  { value: 'cooldown', label: 'C/D' },
];

type DurationMode = 'time' | 'distance';
type TargetMode = 'zone' | 'rpe';

function durationMode(step: Step): DurationMode {
  return step.duration?.kind === 'distance' ? 'distance' : 'time';
}
function targetMode(step: Step): TargetMode {
  return typeof step.target?.rpe === 'number' ? 'rpe' : 'zone';
}

interface Props {
  step: Step;
  onChange: (next: Step) => void;
  onRemove: () => void;
  nested?: boolean;
}

/** Editor for a single leaf step (type / duration / target). */
export function StepRow({ step, onChange, onRemove, nested }: Props) {
  const dMode = durationMode(step);
  const tMode = targetMode(step);
  const seconds = step.duration?.kind === 'time' ? step.duration.seconds : 0;
  const meters = step.duration?.kind === 'distance' ? step.duration.meters : 0;

  const setType = (type: StepType) => onChange({ ...step, type });

  const setDurationMode = (mode: DurationMode) =>
    onChange({
      ...step,
      duration:
        mode === 'time'
          ? { kind: 'time', seconds: seconds || 300 }
          : { kind: 'distance', meters: meters || 400 },
    });

  const setMinutes = (txt: string) => {
    const mins = Number(txt) || 0;
    const secs = seconds % 60;
    onChange({ ...step, duration: { kind: 'time', seconds: mins * 60 + secs } });
  };
  const setSeconds = (txt: string) => {
    const secs = Math.min(59, Number(txt) || 0);
    const mins = Math.floor(seconds / 60);
    onChange({ ...step, duration: { kind: 'time', seconds: mins * 60 + secs } });
  };
  const setMeters = (txt: string) =>
    onChange({ ...step, duration: { kind: 'distance', meters: Number(txt) || 0 } });

  const setTargetMode = (mode: TargetMode) =>
    onChange({
      ...step,
      target:
        mode === 'zone' ? { hrZone: step.target?.hrZone ?? 2 } : { rpe: step.target?.rpe ?? 5 },
    });
  const setZone = (z: number) => onChange({ ...step, target: { hrZone: z as 1 } });
  const setRpe = (txt: string) =>
    onChange({ ...step, target: { rpe: Math.min(10, Math.max(1, Number(txt) || 1)) } });

  return (
    <View
      className={`gap-sm rounded-md border border-border p-md dark:border-border-dark ${
        nested ? 'bg-surface-alt dark:bg-surface-alt-dark' : 'bg-surface dark:bg-surface-dark'
      }`}>
      <View className="flex-row items-center justify-between">
        <Text variant="label" className="capitalize">
          {step.type}
        </Text>
        <Ionicons name="trash-outline" size={18} color={palette.danger} onPress={onRemove} />
      </View>

      <Segmented options={STEP_TYPE_OPTS} value={step.type} onChange={setType} />

      <Segmented
        options={[
          { value: 'time', label: 'Time' },
          { value: 'distance', label: 'Distance' },
        ]}
        value={dMode}
        onChange={setDurationMode}
      />

      {dMode === 'time' ? (
        <View className="flex-row items-center gap-sm">
          <NumBox
            value={String(Math.floor(seconds / 60))}
            onChangeText={setMinutes}
            suffix="min"
          />
          <NumBox value={String(seconds % 60)} onChangeText={setSeconds} suffix="sec" />
        </View>
      ) : (
        <NumBox value={String(meters)} onChangeText={setMeters} suffix="m" />
      )}

      <Segmented
        options={[
          { value: 'zone', label: 'HR Zone' },
          { value: 'rpe', label: 'RPE' },
        ]}
        value={tMode}
        onChange={setTargetMode}
      />
      {tMode === 'zone' ? (
        <Segmented
          options={[1, 2, 3, 4, 5].map((z) => ({ value: String(z), label: `Z${z}` }))}
          value={String(step.target?.hrZone ?? 2)}
          onChange={(v) => setZone(Number(v))}
        />
      ) : (
        <NumBox value={String(step.target?.rpe ?? 5)} onChangeText={setRpe} suffix="/ 10" />
      )}
    </View>
  );
}

function NumBox({
  value,
  onChangeText,
  suffix,
}: {
  value: string;
  onChangeText: (t: string) => void;
  suffix?: string;
}) {
  return (
    <View className="flex-row items-center gap-xs rounded-md border border-border bg-bg px-md py-1.5 dark:border-border-dark dark:bg-bg-dark">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        className="min-w-[44px] text-base text-fg dark:text-fg-dark"
        placeholderTextColor={palette.textFaint}
      />
      {suffix ? (
        <Text variant="caption" muted>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}
