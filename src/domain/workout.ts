/**
 * Derived metrics for a workout's `structure` (array of nested Steps):
 *  - total planned moving time
 *  - a planned-TSS estimate
 *  - a flattened list of leaf blocks for the visual timeline
 *
 * TSS here is an *estimate* from planned intensity, not a measured value.
 * The model: TSS = Σ (durationHours · IF²) · 100, where IF (Intensity Factor)
 * is inferred per-sport from each step's target:
 *
 *   bike + powerWatts   → IF = targetWatts / FTP
 *   run  + paceTarget   → IF = thresholdPace / targetPace   (pace is 1/speed)
 *   swim + paceTarget   → IF = CSS / targetPace
 *   hrZone / powerZone  → representative IF per 5-zone number (a coarse
 *                         "hrTSS"-style approximation — HR lags on short reps)
 *   rpe                 → rpe / 10
 *
 * When the athlete has no matching threshold yet, ratio-based targets fall
 * back to a flat estimate so the number is never NaN.
 */

import type { Sport, Step, StepTarget, ThresholdValues } from '@/types/domain';

/** Representative Intensity Factor for each 5-zone number. */
const ZONE_IF = [0.55, 0.7, 0.83, 0.95, 1.1];

/** Fallback IF when a ratio-based target has no threshold to divide by. */
const PACE_FALLBACK_IF = 0.8;
const WATTS_FALLBACK_IF = 0.85;

/** Clamp bounds for ratio-derived IF, per sport family. */
const BIKE_IF_RANGE: [number, number] = [0.3, 1.5];
const ENDURANCE_IF_RANGE: [number, number] = [0.3, 1.3];

/** Fallback speeds (m/s) used to time distance-based steps with no pace target. */
const DEFAULT_SPEED_MPS: Record<Sport, number> = {
  swim: 1.1, // ~1:30 /100m
  bike: 8.3, // ~30 km/h
  run: 3.3, // ~5:00 /km
  strength: 0,
};

function clamp(n: number, [lo, hi]: [number, number]): number {
  return Math.min(hi, Math.max(lo, n));
}

function midpoint(range: { min: number; max: number }): number {
  return (range.min + range.max) / 2;
}

export interface TimelineBlock {
  stepId: string;
  type: Step['type'];
  label?: string;
  seconds: number;
  /** Planned distance in metres when the step is distance-based, else undefined. */
  distanceMeters?: number;
  /** The step's intensity target, verbatim, for rendering "how hard / how fast". */
  target?: StepTarget;
  /** Zone number 1-5 if the target maps to one, else undefined. */
  zone?: number;
  /** IF used for this block. */
  intensityFactor: number;
  /** True when IF came from an HR-zone target (coarser, HR-lag caveat). */
  isHrEstimate: boolean;
  /** Set-repeat index this block belongs to, for grouping in the UI. */
  repeatGroup?: string;
}

function ifFromTarget(
  target: StepTarget | undefined,
  sport: Sport,
  thresholds?: ThresholdValues,
): number {
  if (!target) return 0.6;

  // Zone-based: shared table. powerZone deliberately needs no FTP — multiplying
  // by FTP then dividing by FTP cancels; the zone % already ≈ IF.
  if (target.hrZone) return ZONE_IF[target.hrZone - 1];
  if (target.powerZone) return ZONE_IF[target.powerZone - 1];

  // Absolute watts (bike): ratio to FTP.
  if (target.powerWatts) {
    const ftp = thresholds?.ftpWatts;
    if (!ftp) return WATTS_FALLBACK_IF;
    return clamp(midpoint(target.powerWatts) / ftp, BIKE_IF_RANGE);
  }

  // Pace target (run / swim): IF = threshold pace / target pace (inverse of
  // speed, so a faster — smaller — target pace yields a higher IF).
  if (target.paceTarget) {
    const targetPace = midpoint(target.paceTarget);
    if (targetPace <= 0) return PACE_FALLBACK_IF;
    const threshold =
      target.paceTarget.unit === 'sec_per_100m'
        ? thresholds?.cssSecPer100m
        : thresholds?.runThresholdPaceSecPerKm;
    if (!threshold) return PACE_FALLBACK_IF;
    return clamp(threshold / targetPace, ENDURANCE_IF_RANGE);
  }

  if (typeof target.rpe === 'number') return Math.min(1.15, target.rpe / 10);
  return 0.6;
}

function zoneFromTarget(target: StepTarget | undefined): number | undefined {
  return target?.hrZone ?? target?.powerZone;
}

/** Planned seconds for a step: its time, or distance ÷ (pace target or sport default). */
export function stepSeconds(step: Step, sport: Sport): number {
  if (!step.duration) return 0;
  if (step.duration.kind === 'time') return step.duration.seconds;

  // distance-based: convert via the pace target midpoint or a sport default
  const pace = step.target?.paceTarget;
  if (pace) {
    const mid = midpoint(pace);
    return pace.unit === 'sec_per_100m'
      ? (step.duration.meters / 100) * mid
      : (step.duration.meters / 1000) * mid;
  }
  const speed = DEFAULT_SPEED_MPS[sport] || 3;
  return step.duration.meters / speed;
}

/**
 * Walk the step tree, expanding `repeatCount`, and return a flat list of leaf
 * blocks in execution order.
 */
export function flattenSteps(
  structure: Step[],
  sport: Sport,
  thresholds?: ThresholdValues,
): TimelineBlock[] {
  const out: TimelineBlock[] = [];

  const visit = (step: Step, repeatGroup?: string) => {
    const reps = Math.max(1, step.repeatCount ?? 1);
    const groupId = reps > 1 && step.children.length > 0 ? step.id : repeatGroup;

    for (let r = 0; r < reps; r++) {
      if (step.children.length > 0) {
        step.children.forEach((child) => visit(child, groupId));
      } else {
        out.push({
          stepId: reps > 1 ? `${step.id}#${r + 1}` : step.id,
          type: step.type,
          label: step.label,
          seconds: Math.round(stepSeconds(step, sport)),
          distanceMeters: step.duration?.kind === 'distance' ? step.duration.meters : undefined,
          target: step.target,
          zone: zoneFromTarget(step.target),
          intensityFactor: ifFromTarget(step.target, sport, thresholds),
          isHrEstimate: step.target?.hrZone != null,
          repeatGroup: groupId,
        });
      }
    }
  };

  structure.forEach((s) => visit(s));
  return out;
}

export function totalDurationSeconds(structure: Step[], sport: Sport): number {
  return flattenSteps(structure, sport).reduce((sum, b) => sum + b.seconds, 0);
}

export function estimateTss(
  structure: Step[],
  sport: Sport,
  thresholds?: ThresholdValues,
): number {
  return computeWorkoutMetrics(structure, sport, thresholds).tss;
}

export interface WorkoutMetrics {
  durationSeconds: number;
  tss: number;
  blocks: TimelineBlock[];
  /** True when any block's IF came from an HR zone (show the hrTSS caveat). */
  hasHrEstimate: boolean;
}

export function computeWorkoutMetrics(
  structure: Step[],
  sport: Sport,
  thresholds?: ThresholdValues,
): WorkoutMetrics {
  const blocks = flattenSteps(structure, sport, thresholds);
  const durationSeconds = blocks.reduce((s, b) => s + b.seconds, 0);
  const tss = blocks.reduce((s, b) => s + (b.seconds / 3600) * b.intensityFactor ** 2 * 100, 0);
  return {
    durationSeconds,
    tss: Math.round(tss),
    blocks,
    hasHrEstimate: blocks.some((b) => b.isHrEstimate),
  };
}
