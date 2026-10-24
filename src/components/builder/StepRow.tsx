import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { ChipGroup } from '@/components/builder/ChipGroup';
import { Segmented } from '@/components/builder/Segmented';
import { Stepper } from '@/components/builder/Stepper';
import { Text } from '@/components/ui/Text';
import {
  defaultExercise,
  EXERCISE_GROUPS,
  EXERCISES,
  exerciseDef,
  type ExerciseGroup,
} from '@/domain/exercises';
import { DEFAULT_SPEED_MPS, stepSeconds } from '@/domain/workout';
import { calcPaceZones } from '@/domain/zones';
import { useT, type TranslateFn } from '@/i18n/useT';
import { formatDistance, formatDuration, formatPace, parsePace } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { palette, stepColors } from '@/theme/tokens';
import type { PaceUnit, Sport, Step, StepTarget, StepType } from '@/types/domain';

const STEP_TYPES: StepType[] = ['warmup', 'interval', 'recovery', 'steady', 'cooldown'];

/** Easy → hard, matching the step-type palette (recovery grey … interval red). */
const ZONE_COLORS = ['#9AA0AB', '#7FB3FF', '#1FA971', '#F2994A', '#EB5757'];

/** Quick picks; the stepper underneath fine-tunes anything in between. */
const TIME_PRESETS_MIN = [5, 10, 15, 20, 25, 30, 40, 45, 60, 75, 90];
const DISTANCE_PRESETS: Record<Sport, number[]> = {
  run: [400, 800, 1000, 2000, 3000, 5000, 10000],
  swim: [50, 100, 200, 300, 400, 800],
  bike: [10000, 20000, 30000, 40000, 50000, 60000, 80000, 100000, 120000, 150000, 180000],
  strength: [],
};
/** Fallback pace list (no threshold set): run /km, swim /100m. */
function paceList(sport: Sport): number[] {
  const [from, to, stepS] = sport === 'swim' ? [80, 150, 5] : [210, 420, 15];
  const out: number[] = [];
  for (let p = from; p <= to; p += stepS) out.push(p);
  return out;
}

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

/** "m:ss" / "h:mm:ss", or a bare number meaning minutes. */
function parseDuration(txt: string): number | null {
  const parts = txt.trim().split(':');
  if (parts.length === 1) {
    const mins = Number(parts[0]);
    return Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null;
  }
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0) || null;
}

/** Finer steps for short efforts, coarser ones for long blocks. */
function timeStep(current: number, dir: 1 | -1): number {
  const v = dir === -1 ? current - 1 : current;
  if (v < 120) return 15;
  if (v < 600) return 30;
  if (v < 1800) return 60;
  return 300;
}
function distanceStep(sport: Sport) {
  return (current: number, dir: 1 | -1): number => {
    const v = dir === -1 ? current - 1 : current;
    if (sport === 'swim') return v < 400 ? 25 : 100;
    if (sport === 'bike') return v < 20000 ? 1000 : 5000;
    if (v < 1000) return 100;
    return v < 10000 ? 500 : 1000;
  };
}

/** Expected-speed quick picks for bike distance steps (km/h). */
const BIKE_SPEEDS = [22, 25, 28, 30, 32, 35, 38];
const DEFAULT_BIKE_KMH = Math.round(DEFAULT_SPEED_MPS.bike * 3.6);

/** Swim distances are set in metres; run and bike in kilometres. */
function distanceUnit(sport: Sport): 'm' | 'km' {
  return sport === 'swim' ? 'm' : 'km';
}
function formatDistanceValue(meters: number, unit: 'm' | 'km'): string {
  if (unit === 'm') return String(Math.round(meters));
  const km = meters / 1000;
  return Number.isInteger(km) ? String(km) : km.toFixed(km < 10 ? 2 : 1).replace(/0+$/, '');
}
/** Accepts "5", "5.5", "5,5", "800m", "10km"; a bare number is in `unit`. */
function parseDistance(txt: string, unit: 'm' | 'km'): number | null {
  const m = txt
    .trim()
    .toLowerCase()
    .replace(',', '.')
    .match(/^(\d+(?:\.\d+)?)\s*(km|k|m)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2] === 'm' ? 'm' : m[2] ? 'km' : unit;
  const meters = u === 'm' ? n : n * 1000;
  return meters > 0 ? Math.round(meters) : null;
}

/** One-line summary of a step's target, e.g. "Z2", "4:30–5:00/km", "200–260 W". */
export function targetSummary(step: Step, sport: Sport, t: TranslateFn): string {
  if (step.exercise) return weightLabel(step.exercise.weightKg, t);
  const tg = step.target;
  if (tg?.paceTarget) {
    const suffix =
      tg.paceTarget.unit === 'sec_per_100m' ? t('units.per100m') : t('units.perKm');
    return `${formatPace(tg.paceTarget.max)}–${formatPace(tg.paceTarget.min)}${suffix}`;
  }
  if (tg?.powerWatts) return `${tg.powerWatts.min}–${tg.powerWatts.max} ${t('units.watts')}`;
  if (typeof tg?.rpe === 'number') return `${t('stepRow.targetRpe')} ${tg.rpe}`;
  return `Z${tg?.hrZone ?? 2}`;
}

function weightLabel(kg: number | undefined, t: TranslateFn): string {
  return kg ? `${kg} ${t('stepRow.kg')}` : t('stepRow.bodyweight');
}

function durationSummary(step: Step, t: TranslateFn): string {
  if (step.exercise) {
    const hold = exerciseDef(step.exercise.key)?.hold;
    return `${step.exercise.sets}×${step.exercise.reps}${hold ? t('stepRow.secShort') : ''}`;
  }
  if (step.duration?.kind === 'distance') return formatDistance(step.duration.meters);
  return formatDuration(step.duration?.kind === 'time' ? step.duration.seconds : 0);
}

export interface StepActions {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

interface Props extends StepActions {
  step: Step;
  sport: Sport;
  onChange: (next: Step) => void;
  expanded: boolean;
  onToggle: () => void;
  nested?: boolean;
}

/**
 * A leaf step. Collapsed it's a one-line summary ("Warm-up · 10:00 · Z2");
 * tapped open it shows the editor plus move/duplicate/delete actions.
 */
export function StepRow({
  step,
  sport,
  onChange,
  expanded,
  onToggle,
  nested,
  ...actions
}: Props) {
  const t = useT();
  const color = step.exercise ? palette.brand : (stepColors[step.type] ?? palette.textMuted);
  const title = step.exercise ? t(`exercise.${step.exercise.key}`) : t(`stepType.${step.type}`);

  return (
    <View
      className={`overflow-hidden rounded-lg border ${
        expanded ? 'border-brand/50' : 'border-border dark:border-border-dark'
      } ${nested ? 'bg-bg dark:bg-bg-dark' : 'bg-surface dark:bg-surface-dark'}`}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${durationSummary(step, t)}, ${targetSummary(step, sport, t)}`}
        className="flex-row items-center gap-md py-md pr-md active:opacity-70">
        <View style={{ width: 5, alignSelf: 'stretch', backgroundColor: color }} />
        <Text variant="label" className="flex-1" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="label">{durationSummary(step, t)}</Text>
        <View className="min-w-[56px] items-center rounded-full bg-surface-alt px-sm py-0.5 dark:bg-surface-alt-dark">
          <Text variant="caption" numberOfLines={1}>
            {targetSummary(step, sport, t)}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={palette.textFaint}
        />
      </Pressable>

      {expanded ? (
        <View className="gap-md border-t border-border px-md pb-md pt-md dark:border-border-dark">
          {step.exercise ? (
            <ExerciseEditor step={step} onChange={onChange} />
          ) : (
            <StepEditor step={step} sport={sport} onChange={onChange} />
          )}
          <ActionBar {...actions} />
        </View>
      ) : null}
    </View>
  );
}

function StepEditor({
  step,
  sport,
  onChange,
}: {
  step: Step;
  sport: Sport;
  onChange: (next: Step) => void;
}) {
  const t = useT();
  const dMode = durationMode(step);
  const seconds = step.duration?.kind === 'time' ? step.duration.seconds : 0;
  const meters = step.duration?.kind === 'distance' ? step.duration.meters : 0;
  const speedKmh = step.duration?.kind === 'distance' ? step.duration.speedKmh : undefined;
  const unit = distanceUnit(sport);
  const setMeters = (m: number) =>
    onChange({ ...step, duration: { kind: 'distance', meters: m, speedKmh } });

  const options = targetOptions(sport, t);
  const detected = targetMode(step);
  // If the sport changed under a step whose target no longer applies, show the
  // zone editor rather than a dead option. Data is coerced when the user picks.
  const tMode: TargetMode = options.some((o) => o.value === detected) ? detected : 'zone';
  const paceUnit: PaceUnit = sport === 'swim' ? 'sec_per_100m' : 'sec_per_km';
  const paceSuffix = sport === 'swim' ? t('units.per100m') : t('units.perKm');

  const setDurationMode = (mode: DurationMode) =>
    onChange({
      ...step,
      duration:
        mode === 'time'
          ? { kind: 'time', seconds: seconds || 300 }
          : {
              kind: 'distance',
              meters: meters || { swim: 100, bike: 20000, run: 5000, strength: 1000 }[sport],
            },
    });

  const setTargetMode = (mode: TargetMode) => {
    const tg = step.target;
    let target: StepTarget;
    if (mode === 'zone') target = { hrZone: tg?.hrZone ?? 2 };
    else if (mode === 'rpe') target = { rpe: tg?.rpe ?? 5 };
    else if (mode === 'power')
      target = { powerWatts: tg?.powerWatts ?? { min: 200, max: 260 } };
    else
      target = {
        paceTarget:
          tg?.paceTarget?.unit === paceUnit
            ? tg.paceTarget
            : { unit: paceUnit, ...defaultPace(paceUnit) },
      };
    onChange({ ...step, target });
  };

  const pace = step.target?.paceTarget ?? { unit: paceUnit, ...defaultPace(paceUnit) };
  const setPace = (bound: 'min' | 'max', secs: number) =>
    onChange({ ...step, target: { paceTarget: { ...pace, unit: paceUnit, [bound]: secs } } });

  const watts = step.target?.powerWatts ?? { min: 200, max: 260 };
  const setWatts = (bound: 'min' | 'max', w: number) =>
    onChange({ ...step, target: { powerWatts: { ...watts, [bound]: w } } });

  return (
    <>
      <Section label={t('stepRow.type')}>
        <ChipGroup
          options={STEP_TYPES.map((v) => ({
            value: v,
            label: t(`stepType.${v}`),
            color: stepColors[v],
          }))}
          value={step.type}
          onChange={(type) => onChange({ ...step, type })}
        />
      </Section>

      <Section label={t('stepRow.durationLabel')}>
        <Segmented
          options={[
            { value: 'time', label: t('stepRow.time') },
            { value: 'distance', label: t('stepRow.distance') },
          ]}
          value={dMode}
          onChange={setDurationMode}
        />
        {dMode === 'time' ? (
          <>
            <ChipGroup
              options={TIME_PRESETS_MIN.map((m) => ({
                value: String(m * 60),
                label: t('stepRow.minutesShort', { count: m }),
              }))}
              value={String(seconds)}
              onChange={(v) =>
                onChange({ ...step, duration: { kind: 'time', seconds: Number(v) } })
              }
            />
            <Stepper
              label={t('stepRow.time')}
              value={seconds}
              min={15}
              step={timeStep}
              format={formatDuration}
              parse={parseDuration}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              onChange={(s) => onChange({ ...step, duration: { kind: 'time', seconds: s } })}
            />
          </>
        ) : (
          <>
            {DISTANCE_PRESETS[sport].length ? (
              <ChipGroup
                options={DISTANCE_PRESETS[sport].map((m) => ({
                  value: String(m),
                  label: formatDistance(m),
                }))}
                value={String(meters)}
                onChange={(v) => setMeters(Number(v))}
              />
            ) : null}
            <Stepper
              label={t('stepRow.distance')}
              value={meters}
              min={25}
              step={distanceStep(sport)}
              format={(m) => formatDistanceValue(m, unit)}
              parse={(txt) => parseDistance(txt, unit)}
              suffix={unit === 'm' ? t('units.metres') : t('units.km')}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              onChange={setMeters}
            />
            {sport === 'bike' ? (
              <View className="gap-xs">
                <Text variant="caption" muted>
                  {t('stepRow.avgSpeed')}
                </Text>
                <ChipGroup
                  options={BIKE_SPEEDS.map((v) => ({
                    value: String(v),
                    label: `${v} ${t('units.kmh')}`,
                  }))}
                  value={String(speedKmh ?? DEFAULT_BIKE_KMH)}
                  onChange={(v) =>
                    onChange({
                      ...step,
                      duration: { kind: 'distance', meters, speedKmh: Number(v) },
                    })
                  }
                />
              </View>
            ) : null}
            <Text variant="caption" muted>
              {sport === 'bike'
                ? t('stepRow.atThisSpeed', {
                    duration: formatDuration(stepSeconds(step, sport)),
                    speed: speedKmh ?? DEFAULT_BIKE_KMH,
                  })
                : t(tMode === 'pace' ? 'stepRow.atThisPace' : 'stepRow.atThisEffort', {
                    duration: formatDuration(stepSeconds(step, sport)),
                  })}
            </Text>
          </>
        )}
      </Section>

      <Section label={t('stepRow.target')}>
        <Segmented options={options} value={tMode} onChange={setTargetMode} />
        {tMode === 'zone' ? (
          <ChipGroup
            options={[1, 2, 3, 4, 5].map((z) => ({
              value: String(z),
              label: `Z${z}`,
              color: ZONE_COLORS[z - 1],
            }))}
            value={String(step.target?.hrZone ?? 2)}
            onChange={(v) => onChange({ ...step, target: { hrZone: Number(v) as 1 } })}
          />
        ) : tMode === 'rpe' ? (
          <Stepper
            label={t('stepRow.targetRpe')}
            value={step.target?.rpe ?? 5}
            min={1}
            max={10}
            step={() => 1}
            format={String}
            parse={(txt) => (Number(txt) ? Math.round(Number(txt)) : null)}
            suffix="/ 10"
            onChange={(rpe) => onChange({ ...step, target: { rpe } })}
          />
        ) : tMode === 'pace' ? (
          <View className="gap-sm">
            <PacePresets
              sport={sport}
              current={pace}
              onPick={(min, max) =>
                onChange({ ...step, target: { paceTarget: { unit: paceUnit, min, max } } })
              }
            />
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
              value={watts.min}
              onCommit={(w) => setWatts('min', w)}
              suffix={t('units.watts')}
            />
            <Text variant="caption" muted>
              {t('common.to')}
            </Text>
            <NumBox
              value={watts.max}
              onCommit={(w) => setWatts('max', w)}
              suffix={t('units.watts')}
            />
          </View>
        )}
      </Section>
    </>
  );
}

/** Strength: pick a movement, then sets × reps, load and rest. */
function ExerciseEditor({ step, onChange }: { step: Step; onChange: (next: Step) => void }) {
  const t = useT();
  const ex = step.exercise!;
  const def = exerciseDef(ex.key);
  const [group, setGroup] = useState<ExerciseGroup>(def?.group ?? 'legs');
  const set = (patch: Partial<typeof ex>) =>
    onChange({ ...step, exercise: { ...ex, ...patch } });
  const pick = (key: string) => {
    const next = defaultExercise(key);
    // Keep the load and rest the athlete already dialled in when swapping movement.
    onChange({
      ...step,
      exercise: {
        ...next,
        weightKg: exerciseDef(key)?.bodyweight ? undefined : ex.weightKg,
        restSec: ex.restSec,
      },
    });
  };
  const intParse = (txt: string) => (Number(txt) > 0 ? Math.round(Number(txt)) : null);

  return (
    <>
      <Section label={t('stepRow.exerciseLabel')}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-xs">
          {EXERCISE_GROUPS.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGroup(g)}
              accessibilityRole="tab"
              accessibilityState={{ selected: g === group }}
              className={`rounded-md px-md py-1.5 ${g === group ? 'bg-brand' : 'bg-surface-alt dark:bg-surface-alt-dark'}`}>
              <Text
                variant="caption"
                style={g === group ? { color: '#fff', fontWeight: '600' } : undefined}>
                {t(`exerciseGroup.${g}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ChipGroup
          options={EXERCISES.filter((e) => e.group === group).map((e) => ({
            value: e.key,
            label: t(`exercise.${e.key}`),
          }))}
          value={ex.key}
          onChange={pick}
        />
      </Section>

      <View className="flex-row flex-wrap gap-x-lg gap-y-md">
        <Section label={t('stepRow.sets')}>
          <Stepper
            label={t('stepRow.sets')}
            value={ex.sets}
            min={1}
            max={20}
            step={() => 1}
            format={String}
            parse={intParse}
            onChange={(sets) => set({ sets })}
          />
        </Section>
        <Section label={def?.hold ? t('stepRow.holdSeconds') : t('stepRow.reps')}>
          <Stepper
            label={def?.hold ? t('stepRow.holdSeconds') : t('stepRow.reps')}
            value={ex.reps}
            min={1}
            max={300}
            step={() => (def?.hold ? 5 : 1)}
            format={String}
            parse={intParse}
            suffix={def?.hold ? t('stepRow.secShort') : undefined}
            onChange={(reps) => set({ reps })}
          />
        </Section>
      </View>

      <Section label={t('stepRow.load')}>
        <Stepper
          label={t('stepRow.load')}
          value={ex.weightKg ?? 0}
          min={0}
          max={500}
          step={() => 2.5}
          format={(kg) => (kg ? String(kg) : t('stepRow.bodyweight'))}
          parse={(txt) => {
            const n = Number(txt.replace(',', '.'));
            return Number.isFinite(n) && n >= 0 ? Math.round(n * 2) / 2 : null;
          }}
          suffix={ex.weightKg ? t('stepRow.kg') : undefined}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          onChange={(kg) => set({ weightKg: kg || undefined })}
        />
      </Section>

      <Section label={t('stepRow.rest')}>
        <ChipGroup
          options={[30, 60, 90, 120, 180].map((sec) => ({
            value: String(sec),
            label:
              sec < 60 || sec % 60
                ? `${sec} ${t('stepRow.secShort')}`
                : t('stepRow.minutesShort', { count: sec / 60 }),
          }))}
          value={String(ex.restSec)}
          onChange={(v) => set({ restSec: Number(v) })}
        />
      </Section>
      <Text variant="caption" muted>
        {t('stepRow.exerciseTime', { duration: formatDuration(stepSeconds(step, 'strength')) })}
      </Text>
    </>
  );
}

/**
 * Pace quick picks. With a threshold pace (run) or CSS (swim) in the profile
 * these are the athlete's own pace zones; otherwise a plain list of paces.
 */
function PacePresets({
  sport,
  current,
  onPick,
}: {
  sport: Sport;
  current: { min: number; max: number };
  onPick: (min: number, max: number) => void;
}) {
  const t = useT();
  const thresholds = useAppStore((s) => s.athlete?.thresholds);
  const threshold =
    sport === 'swim' ? thresholds?.cssSecPer100m : thresholds?.runThresholdPaceSecPerKm;
  const zones = threshold ? calcPaceZones(threshold) : undefined;
  const suffix = sport === 'swim' ? t('units.per100m') : t('units.perKm');

  const options = zones
    ? zones.map((z) => {
        // Zone 1 is open-ended on the slow side; give it a sensible bound.
        const max = z.max ?? Math.round(z.min * 1.15);
        return {
          key: `z${z.index}`,
          label: `${t(`stepRow.paceZone${z.index}`)} ${formatPace(max)}–${formatPace(z.min)}`,
          min: z.min,
          max,
        };
      })
    : paceList(sport).map((p) => ({
        key: String(p),
        label: formatPace(p),
        min: p,
        max: p + (sport === 'swim' ? 5 : 10),
      }));

  return (
    <View className="gap-xs">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-xs">
        {options.map((o) => {
          const on = current.min === o.min && current.max === o.max;
          return (
            <Pressable
              key={o.key}
              onPress={() => onPick(o.min, o.max)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              className={`rounded-full border px-md py-1.5 active:opacity-70 ${
                on
                  ? 'border-brand bg-brand/10'
                  : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
              }`}>
              <Text
                variant="caption"
                style={{
                  color: on ? palette.brand : undefined,
                  fontWeight: on ? '600' : '400',
                }}>
                {o.label}
                {zones ? '' : suffix}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!zones ? (
        <Text variant="caption" muted>
          {t(sport === 'swim' ? 'stepRow.setCssHint' : 'stepRow.setThresholdHint')}
        </Text>
      ) : null}
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-sm">
      <Text variant="caption" muted className="uppercase tracking-wide">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Move / duplicate / delete, shared by leaf steps and interval sets. */
export function ActionBar({ onMoveUp, onMoveDown, onDuplicate, onRemove }: StepActions) {
  const t = useT();
  return (
    <View className="flex-row items-center justify-between border-t border-border pt-sm dark:border-border-dark">
      <View className="flex-row gap-xs">
        <IconAction icon="arrow-up" label={t('stepRow.moveUp')} onPress={onMoveUp} />
        <IconAction icon="arrow-down" label={t('stepRow.moveDown')} onPress={onMoveDown} />
        <IconAction icon="copy-outline" label={t('stepRow.duplicate')} onPress={onDuplicate} />
      </View>
      <IconAction icon="trash-outline" label={t('common.delete')} onPress={onRemove} danger />
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const color = danger ? palette.danger : palette.brand;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className={`h-10 flex-row items-center gap-1 rounded-md px-sm active:opacity-60 ${
        onPress ? '' : 'opacity-30'
      }`}>
      <Ionicons name={icon} size={18} color={color} />
      {danger ? (
        <Text variant="caption" style={{ color }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Number field that commits on blur, so typing "2" on the way to "250" isn't fought. */
function NumBox({
  value,
  onCommit,
  suffix,
}: {
  value: number;
  onCommit: (n: number) => void;
  suffix?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && Number(draft) > 0) onCommit(Math.round(Number(draft)));
    setDraft(null);
  };
  return (
    <View className="flex-row items-center gap-xs rounded-md border border-border bg-bg px-md py-2 dark:border-border-dark dark:bg-bg-dark">
      <TextInput
        value={draft ?? String(value)}
        onChangeText={setDraft}
        onEndEditing={commit}
        onBlur={commit}
        selectTextOnFocus
        keyboardType="number-pad"
        className="min-w-[44px] text-base text-fg dark:text-fg-dark"
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
    <View className="rounded-md border border-border bg-bg px-md py-2 dark:border-border-dark dark:bg-bg-dark">
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
