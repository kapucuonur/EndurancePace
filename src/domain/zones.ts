/**
 * Training-zone calculators.
 *
 * These implement widely-used 5-zone models so the Athlete Profile screen can
 * show auto-computed zones from a handful of threshold inputs. The exact
 * boundaries vary by coach/methodology — the percentages below follow the
 * common Coggan (power) and Friel-style (HR / pace) conventions, compressed
 * to five zones.
 */

import type {
  HeartRateZones,
  PaceZones,
  PowerZones,
  ThresholdValues,
  Zone,
} from '@/types/domain';

const HR_ZONE_NAMES = ['Recovery', 'Aerobic', 'Tempo', 'Threshold', 'VO2 Max'] as const;
const POWER_ZONE_NAMES = [
  'Active Recovery',
  'Endurance',
  'Tempo',
  'Threshold',
  'VO2 / Anaerobic',
] as const;
const PACE_ZONE_NAMES = ['Easy', 'Endurance', 'Tempo', 'Threshold', 'Interval'] as const;

/** Fraction of threshold HR (LTHR) at each zone's lower edge. */
const HR_LOWER_PCT = [0, 0.82, 0.89, 0.94, 1.0];

/** Fraction of FTP at each zone's lower edge. */
const POWER_LOWER_PCT = [0, 0.55, 0.75, 0.9, 1.05];

/**
 * Multiplier applied to threshold pace (sec/distance) at each zone's *slow*
 * edge. Larger multiplier = slower. Index 0 is the slowest (Easy) zone.
 */
const PACE_SLOW_MULT = [1.5, 1.28, 1.13, 1.05, 1.0];

function round(n: number): number {
  return Math.round(n);
}

/**
 * Build ascending numeric zones (HR, power) from a threshold value and a set
 * of lower-edge percentages.
 */
function buildAscendingZones(
  threshold: number,
  lowerPct: number[],
  names: readonly string[],
): [Zone, Zone, Zone, Zone, Zone] {
  const zones = lowerPct.map((pct, i) => {
    const min = i === 0 ? 0 : round(threshold * pct);
    const max = i === lowerPct.length - 1 ? null : round(threshold * lowerPct[i + 1]) - 1;
    return {
      index: (i + 1) as Zone['index'],
      name: names[i],
      min,
      max,
    } satisfies Zone;
  });
  return zones as [Zone, Zone, Zone, Zone, Zone];
}

export function calcHrZones(thresholds: ThresholdValues): HeartRateZones | undefined {
  const lthr = thresholds.thresholdHr;
  if (!lthr || lthr <= 0) return undefined;
  return buildAscendingZones(lthr, HR_LOWER_PCT, HR_ZONE_NAMES);
}

export function calcPowerZones(thresholds: ThresholdValues): PowerZones | undefined {
  const ftp = thresholds.ftpWatts;
  if (!ftp || ftp <= 0) return undefined;
  return buildAscendingZones(ftp, POWER_LOWER_PCT, POWER_ZONE_NAMES);
}

/**
 * Pace zones from a threshold pace. `thresholdPace` and the returned bounds are
 * in the same unit (sec/km for run, sec/100m for swim). For pace, a *smaller*
 * number is faster, so zone `min` is the fast edge and `max` is the slow edge.
 * Zone 1 is the slowest; zone 5 the fastest.
 */
export function calcPaceZones(thresholdPace: number): PaceZones | undefined {
  if (!thresholdPace || thresholdPace <= 0) return undefined;
  const zones = PACE_SLOW_MULT.map((slowMult, i) => {
    const fastMult = i === PACE_SLOW_MULT.length - 1 ? 0.85 : PACE_SLOW_MULT[i + 1];
    return {
      index: (i + 1) as Zone['index'],
      name: PACE_ZONE_NAMES[i],
      // min = fast edge (smaller sec), max = slow edge (larger sec)
      min: round(thresholdPace * fastMult),
      max: i === 0 ? null : round(thresholdPace * slowMult),
    } satisfies Zone;
  });
  return zones as PaceZones;
}

export function calcRunPaceZones(thresholds: ThresholdValues): PaceZones | undefined {
  return thresholds.runThresholdPaceSecPerKm
    ? calcPaceZones(thresholds.runThresholdPaceSecPerKm)
    : undefined;
}

export function calcSwimPaceZones(thresholds: ThresholdValues): PaceZones | undefined {
  return thresholds.cssSecPer100m ? calcPaceZones(thresholds.cssSecPer100m) : undefined;
}

/** Recompute every zone set from the athlete's current thresholds. */
export function deriveZones(thresholds: ThresholdValues): {
  hrZones?: HeartRateZones;
  powerZones?: PowerZones;
  runPaceZones?: PaceZones;
} {
  return {
    hrZones: calcHrZones(thresholds),
    powerZones: calcPowerZones(thresholds),
    runPaceZones: calcRunPaceZones(thresholds),
  };
}
