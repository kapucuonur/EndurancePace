import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { ChipGroup } from '@/components/builder/ChipGroup';
import { Segmented } from '@/components/builder/Segmented';
import { Stepper } from '@/components/builder/Stepper';
import { Text } from '@/components/ui/Text';
import { stepSeconds } from '@/domain/workout';
import { useT, type TranslateFn } from '@/i18n/useT';
import { formatDistance, formatDuration, formatPace, parsePace } from '@/lib/format';
import { palette, stepColors } from '@/theme/tokens';
import type { PaceUnit, Sport, Step, StepTarget, StepType } from '@/types/domain';

const STEP_TYPES: StepType[] = ['warmup', 'interval', 'recovery', 'steady', 'cooldown'];

/** Easy → hard, matching the step-type palette (recovery grey … interval red). */
const ZONE_COLORS = ['#9AA0AB', '#7FB3FF', '#1FA971', '#F2994A', '#EB5757'];

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
    if (v < 1000) return 100;
    return sport === 'bike' ? 5000 : 500;
  };
}

/** One-line summary of a step's target, e.g. "Z2", "4:30–5:00/km", "200–260 W". */
export function targetSummary(step: Step, sport: Sport, t: TranslateFn): string {
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

function durationSummary(step: Step): string {
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
  const color = stepColors[step.type] ?? palette.textMuted;

  return (
    <View
      className={`overflow-hidden rounded-lg border ${
        expanded ? 'border-brand/50' : 'border-border dark:border-border-dark'
      } ${nested ? 'bg-bg dark:bg-bg-dark' : 'bg-surface dark:bg-surface-dark'}`}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${t(`stepType.${step.type}`)}, ${durationSummary(step)}, ${targetSummary(step, sport, t)}`}
        className="flex-row items-center gap-md py-md pr-md active:opacity-70">
        <View style={{ width: 5, alignSelf: 'stretch', backgroundColor: color }} />
        <Text variant="label" className="flex-1" numberOfLines={1}>
          {t(`stepType.${step.type}`)}
        </Text>
        <Text variant="label">{durationSummary(step)}</Text>
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
          <StepEditor step={step} sport={sport} onChange={onChange} />
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
          : { kind: 'distance', meters: meters || (sport === 'swim' ? 100 : 1000) },
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
        ) : (
          <>
            <Stepper
              label={t('stepRow.distance')}
              value={meters}
              min={25}
              step={distanceStep(sport)}
              format={(m) => String(m)}
              parse={(txt) => {
                const n = Number(txt);
                return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
              }}
              suffix={t('units.metres')}
              onChange={(m) => onChange({ ...step, duration: { kind: 'distance', meters: m } })}
            />
            <Text variant="caption" muted>
              {t(tMode === 'pace' ? 'stepRow.atThisPace' : 'stepRow.atThisEffort', {
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
