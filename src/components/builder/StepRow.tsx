import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';

import { Segmented } from '@/components/builder/Segmented';
import { Text } from '@/components/ui/Text';
import { stepSeconds } from '@/domain/workout';
import { useT, type TranslateFn } from '@/i18n/useT';
import { formatDuration, formatPace, parsePace } from '@/lib/format';
import { palette } from '@/theme/tokens';
import type { PaceUnit, Sport, Step, StepTarget, StepType } from '@/types/domain';

const STEP_TYPE_OPTS: { value: StepType; labelKey: string }[] = [
  { value: 'warmup', labelKey: 'stepRow.typeWarmup' },
  { value: 'interval', labelKey: 'stepRow.typeWork' },
  { value: 'recovery', labelKey: 'stepRow.typeRecovery' },
  { value: 'steady', labelKey: 'stepRow.typeSteady' },
  { value: 'cooldown', labelKey: 'stepRow.typeCooldown' },
];

type DurationMode = 'time' | 'distance';
type TargetMode = 'zone' | 'pace' | 'power' | 'rpe';

/** Which target kinds make sense for a sport. HR Zone + RPE are universal. */
function targetOptions(sport: Sport, t: TranslateFn): { value: TargetMode; label: string }[] {
  const opts: { value: TargetMode; label: string }[] = [
    { value: 'zone', label: t('stepRow.targetHrZone') },
  ];
  if (sport === 'bike') opts.push({ value: 'power', label: t('stepRow.targetPower') });
  if (sport === 'run' || sport === 'swim') {
    opts.push({ value: 'pace', label: t('stepRow.targetPace') });
  }
  opts.push({ value: 'rpe', label: t('stepRow.targetRpe') });
  return opts;
}

function durationMode(step: Step): DurationMode {
  return step.duration?.kind === 'distance' ? 'distance' : 'time';
}
function targetMode(step: Step): TargetMode {
  const t = step.target;
  if (t?.paceTarget) return 'pace';
  if (t?.powerWatts) return 'power';
  if (typeof t?.rpe === 'number') return 'rpe';
  return 'zone';
}

/** Sensible starting pace range (seconds) per sport unit. */
function defaultPace(unit: PaceUnit): { min: number; max: number } {
  return unit === 'sec_per_100m' ? { min: 100, max: 120 } : { min: 240, max: 300 };
}

interface Props {
  step: Step;
  sport: Sport;
  onChange: (next: Step) => void;
  onRemove: () => void;
  nested?: boolean;
}

/** Editor for a single leaf step (type / duration / target). */
export function StepRow({ step, sport, onChange, onRemove, nested }: Props) {
  const t = useT();
  const dMode = durationMode(step);
  const seconds = step.duration?.kind === 'time' ? step.duration.seconds : 0;
  const meters = step.duration?.kind === 'distance' ? step.duration.meters : 0;

  const options = targetOptions(sport, t);
  const detected = targetMode(step);
  // If the sport changed under a step whose target no longer applies, show the
  // zone editor rather than a dead segment. Data is coerced when the user picks.
  const tMode: TargetMode = options.some((o) => o.value === detected) ? detected : 'zone';
  const paceUnit: PaceUnit = sport === 'swim' ? 'sec_per_100m' : 'sec_per_km';
  const paceSuffix = sport === 'swim' ? '/100m' : '/km';

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

  const setTargetMode = (mode: TargetMode) => {
    const t = step.target;
    let target: StepTarget;
    if (mode === 'zone') target = { hrZone: t?.hrZone ?? 2 };
    else if (mode === 'rpe') target = { rpe: t?.rpe ?? 5 };
    else if (mode === 'power') target = { powerWatts: t?.powerWatts ?? { min: 200, max: 260 } };
    else
      target = {
        paceTarget:
          t?.paceTarget?.unit === paceUnit
            ? t.paceTarget
            : { unit: paceUnit, ...defaultPace(paceUnit) },
      };
    onChange({ ...step, target });
  };

  const setZone = (z: number) => onChange({ ...step, target: { hrZone: z as 1 } });
  const setRpe = (txt: string) =>
    onChange({ ...step, target: { rpe: Math.min(10, Math.max(1, Number(txt) || 1)) } });

  const pace = step.target?.paceTarget ?? { unit: paceUnit, ...defaultPace(paceUnit) };
  const setPace = (bound: 'min' | 'max', secs: number) =>
    onChange({
      ...step,
      target: { paceTarget: { ...pace, unit: paceUnit, [bound]: secs } },
    });

  const watts = step.target?.powerWatts ?? { min: 200, max: 260 };
  const setWatts = (bound: 'min' | 'max', w: number) =>
    onChange({ ...step, target: { powerWatts: { ...watts, [bound]: w } } });

  return (
    <View
      className={`gap-sm rounded-md border border-border p-md dark:border-border-dark ${
        nested ? 'bg-surface-alt dark:bg-surface-alt-dark' : 'bg-surface dark:bg-surface-dark'
      }`}>
      <View className="flex-row items-center justify-between">
        <Text variant="label">{t(`stepType.${step.type}`)}</Text>
        <Ionicons name="trash-outline" size={18} color={palette.danger} onPress={onRemove} />
      </View>

      <Segmented
        options={STEP_TYPE_OPTS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        value={step.type}
        onChange={setType}
      />

      <Segmented
        options={[
          { value: 'time', label: t('stepRow.time') },
          { value: 'distance', label: t('stepRow.distance') },
        ]}
        value={dMode}
        onChange={setDurationMode}
      />

      {dMode === 'time' ? (
        <View className="flex-row items-center gap-sm">
          <NumBox
            value={String(Math.floor(seconds / 60))}
            onChangeText={setMinutes}
            suffix={t('stepRow.min')}
          />
          <NumBox
            value={String(seconds % 60)}
            onChangeText={setSeconds}
            suffix={t('stepRow.sec')}
          />
        </View>
      ) : (
        <View className="gap-xs">
          <NumBox value={String(meters)} onChangeText={setMeters} suffix={t('units.metres')} />
          <Text variant="caption" muted>
            {tMode === 'pace'
              ? t('stepRow.atThisPace', {
                  duration: formatDuration(stepSeconds(step, sport)),
                })
              : t('stepRow.atThisEffort', {
                  duration: formatDuration(stepSeconds(step, sport)),
                })}
          </Text>
        </View>
      )}

      <Segmented options={options} value={tMode} onChange={setTargetMode} />

      {tMode === 'zone' ? (
        <Segmented
          options={[1, 2, 3, 4, 5].map((z) => ({ value: String(z), label: `Z${z}` }))}
          value={String(step.target?.hrZone ?? 2)}
          onChange={(v) => setZone(Number(v))}
        />
      ) : tMode === 'rpe' ? (
        <NumBox value={String(step.target?.rpe ?? 5)} onChangeText={setRpe} suffix="/ 10" />
      ) : tMode === 'pace' ? (
        <View className="gap-xs">
          <View className="flex-row items-center gap-sm">
            <PaceBox
              key={`slow-${paceUnit}`}
              seconds={pace.max}
              onCommit={(s) => setPace('max', s)}
            />
            <Text variant="caption" muted>
              {t('common.to')}
            </Text>
            <PaceBox
              key={`fast-${paceUnit}`}
              seconds={pace.min}
              onCommit={(s) => setPace('min', s)}
            />
            <Text variant="caption" muted>
              {paceSuffix}
            </Text>
          </View>
          <Text variant="caption" muted>
            {t('stepRow.slowerFaster')}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-sm">
          <NumBox
            value={String(watts.min)}
            onChangeText={(v) => setWatts('min', Number(v) || 0)}
            suffix="w"
          />
          <Text variant="caption" muted>
            {t('common.to')}
          </Text>
          <NumBox
            value={String(watts.max)}
            onChangeText={(v) => setWatts('max', Number(v) || 0)}
            suffix="w"
          />
        </View>
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

/**
 * `m:ss` text field for one pace bound. Commits a complete `m:ss` as the user
 * types; on blur it parses whatever's there (incl. a bare seconds count) and
 * snaps the text back to canonical form.
 */
function PaceBox({ seconds, onCommit }: { seconds: number; onCommit: (s: number) => void }) {
  const [txt, setTxt] = useState(() => formatPace(seconds));
  const commit = (raw: string) => {
    const p = parsePace(raw);
    if (p !== null && p >= 20) {
      onCommit(p);
      return p;
    }
    return null;
  };
  return (
    <View className="rounded-md border border-border bg-bg px-md py-1.5 dark:border-border-dark dark:bg-bg-dark">
      <TextInput
        value={txt}
        onChangeText={(v) => {
          setTxt(v);
          if (/^\d{1,3}:\d{2}$/.test(v.trim())) commit(v);
        }}
        onEndEditing={() => setTxt(formatPace(commit(txt) ?? seconds))}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
        placeholder="4:30"
        placeholderTextColor={palette.textFaint}
        className="min-w-[52px] text-base text-fg dark:text-fg-dark"
      />
    </View>
  );
}
