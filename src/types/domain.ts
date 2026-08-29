/**
 * EndurancePace core domain model.
 *
 * These types are the contract between the UI, the Zustand store, and the
 * `services/api.ts` persistence layer. They are intentionally plain data
 * (no class instances, no methods) so records round-trip cleanly through
 * JSON / AsyncStorage and, later, a REST backend.
 *
 * Dates are stored as ISO 8601 strings:
 *  - Calendar days: `YYYY-MM-DD` (see `ISODate`)
 *  - Timestamps:    full ISO datetime (see `ISODateTime`)
 */

export type ID = string;

/** Calendar day, e.g. `2026-08-29`. */
export type ISODate = string;

/** Full timestamp, e.g. `2026-08-29T06:30:00.000Z`. */
export type ISODateTime = string;

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const SPORTS = ['swim', 'bike', 'run', 'strength'] as const;
export type Sport = (typeof SPORTS)[number];

export const PERIODIZATION_PHASES = [
  'base',
  'build',
  'peak',
  'taper',
  'race',
  'recovery',
] as const;
export type PeriodizationPhase = (typeof PERIODIZATION_PHASES)[number];

export const WORKOUT_STATUSES = ['planned', 'completed', 'skipped', 'modified'] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const STEP_TYPES = ['warmup', 'interval', 'recovery', 'cooldown', 'steady'] as const;
export type StepType = (typeof STEP_TYPES)[number];

export const RACE_PRIORITIES = ['A', 'B', 'C'] as const;
export type RacePriority = (typeof RACE_PRIORITIES)[number];

// ---------------------------------------------------------------------------
// Athlete
// ---------------------------------------------------------------------------

/** Classic 5-zone model. Each zone is a lower/upper bound in the zone's unit. */
export interface Zone {
  index: 1 | 2 | 3 | 4 | 5;
  name: string;
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. `null` means "and above" (top zone). */
  max: number | null;
}

/** HR zones are expressed in bpm. */
export type HeartRateZones = [Zone, Zone, Zone, Zone, Zone];

/** Power zones are expressed in watts. */
export type PowerZones = [Zone, Zone, Zone, Zone, Zone];

/** Pace zones are expressed in seconds-per-kilometre. */
export type PaceZones = [Zone, Zone, Zone, Zone, Zone];

export interface ThresholdValues {
  /** Functional Threshold Power for the bike, in watts. */
  ftpWatts?: number;
  /** Threshold running pace, in seconds per kilometre. */
  runThresholdPaceSecPerKm?: number;
  /** Critical Swim Speed, in seconds per 100 m. */
  cssSecPer100m?: number;
  /** Lactate-threshold / max heart rate, in bpm — drives HR zones. */
  thresholdHr?: number;
  maxHr?: number;
}

export interface Athlete {
  id: ID;
  name: string;
  /** Disciplines this athlete trains. */
  disciplines: Sport[];
  thresholds: ThresholdValues;
  /** Auto-calculated from thresholds; recomputed whenever thresholds change. */
  hrZones?: HeartRateZones;
  powerZones?: PowerZones;
  runPaceZones?: PaceZones;
  weightKg?: number;
  birthdate?: ISODate;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Training plan
// ---------------------------------------------------------------------------

/** One periodization block. Blocks are sequential from the plan's startDate. */
export interface PlanBlock {
  phase: PeriodizationPhase;
  /** Duration in whole weeks. */
  weeks: number;
}

export interface TrainingPlan {
  id: ID;
  athleteId: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  /** Target race for this plan, if any. */
  goalEventId: ID | null;
  /** Current / starting phase (kept for the list badge and older plans). */
  phase: PeriodizationPhase;
  /** Periodization breakdown. Absent on plans made before this feature. */
  blocks?: PlanBlock[];
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Events (races)
// ---------------------------------------------------------------------------

export interface RaceEvent {
  id: ID;
  athleteId: ID;
  name: string;
  date: ISODate;
  sport: Sport;
  priority: RacePriority;
  /** Free-form distance label, e.g. "Olympic", "70.3", "10K", "40km TT". */
  distance: string;
  location?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Workout structure — steps & targets
// ---------------------------------------------------------------------------

/** A step is either time-based or distance-based, never both. */
export type StepDuration =
  { kind: 'time'; seconds: number } | { kind: 'distance'; meters: number };

/** Unit a pace target is expressed in — `sec_per_km` for run, `sec_per_100m` for swim. */
export type PaceUnit = 'sec_per_km' | 'sec_per_100m';

/** How hard to go during a step. Exactly one field is set. */
export interface StepTarget {
  /** Pace range. `unit` disambiguates run (`sec_per_km`) vs swim (`sec_per_100m`). */
  paceTarget?: { unit: PaceUnit; min: number; max: number };
  /** HR zone number (1-5). */
  hrZone?: 1 | 2 | 3 | 4 | 5;
  /** Power zone number (1-5). */
  powerZone?: 1 | 2 | 3 | 4 | 5;
  /** Absolute power range in watts. */
  powerWatts?: { min: number; max: number };
  /** Rate of Perceived Exertion, 1-10. */
  rpe?: number;
}

/**
 * A single block of a workout.
 *
 * Steps form a tree: a step with `repeatCount > 1` and a non-empty
 * `children` array represents an interval set, e.g.
 * `6 x [3min @ Z4, 2min @ Z1]`. Leaf steps have no children.
 */
export interface Step {
  id: ID;
  type: StepType;
  /** Optional label shown in the builder / timeline. */
  label?: string;
  /** Only meaningful for leaf steps. */
  duration?: StepDuration;
  target?: StepTarget;
  /** Repeat this block N times. 1 = no repeat. */
  repeatCount: number;
  /** Nested steps for interval sets. Empty for leaf steps. */
  children: Step[];
}

// ---------------------------------------------------------------------------
// Workout
// ---------------------------------------------------------------------------

export interface Workout {
  id: ID;
  /** `null` for library / unscheduled workouts. */
  planId: ID | null;
  /** `null` for library / unscheduled workouts. */
  date: ISODate | null;
  sport: Sport;
  title: string;
  description?: string;
  structure: Step[];
  /** Planned total moving time in seconds (usually derived from structure). */
  plannedDuration: number;
  /** Planned Training Stress Score / load estimate. */
  plannedTss: number;
  status: WorkoutStatus;
  /** Present once the athlete logs the session. */
  completed?: {
    date: ISODateTime;
    durationSeconds?: number;
    actualTss?: number;
    rpe?: number;
    notes?: string;
  };
  /** Marks this workout as a reusable library template. */
  isTemplate: boolean;
  /** Optional grouping label for the library view. */
  templateCategory?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Garmin sync
// ---------------------------------------------------------------------------

/** Connection + last-sync state for the athlete's linked Garmin.com account. */
export interface GarminStatus {
  connected: boolean;
  garminEmail: string | null;
  /**
   * Backend session state:
   * `not_connected` | `idle` | `active` | `mfa_pending` | `expired` | `error`.
   */
  state: string;
  /** Garmin display name, once a session has been established. */
  displayName: string | null;
  lastSyncAt: ISODateTime | null;
  lastVerifiedAt: ISODateTime | null;
  /** Seconds left on a login cool-down after Garmin rate-limited us. 0 = none. */
  cooldownRemaining: number;
  lastError: string | null;
}

/** Result of `POST /me/garmin/connect` or `/connect/mfa`. */
export interface GarminConnectResult {
  status: 'connected' | 'mfa_required';
}

/**
 * Training metrics pulled from a connected Garmin account
 * (`GET /me/garmin/thresholds`). Every value is optional — Garmin exposes
 * different data per account.
 */
export interface GarminMetrics {
  /** The subset of `ThresholdValues` Garmin could supply. */
  thresholds: {
    ftpWatts?: number;
    thresholdHr?: number;
    runThresholdPaceSecPerKm?: number;
  };
  /** Display-only. Never feeds a calculation and isn't part of the domain model. */
  insights: {
    vo2MaxRunning?: number;
    vo2MaxCycling?: number;
    racePredictions?: {
      time5K?: number;
      time10K?: number;
      timeHalfMarathon?: number;
      timeMarathon?: number;
    };
  };
}

/** Result of `POST /me/garmin/sync`. */
export interface GarminSyncResult {
  status: 'ok' | 'skipped';
  /** Why a sync was skipped, e.g. `too_soon` / `already_running`. */
  reason?: string;
  /** New activities added as workouts. */
  imported: number;
  /** Existing imported workouts refreshed. */
  updated: number;
  /** Planned workouts matched to an activity and marked complete. */
  matched: number;
  /** Activities ignored (unmapped sport, etc.). */
  skipped: number;
}

// ---------------------------------------------------------------------------
// Convenience aggregates
// ---------------------------------------------------------------------------

/** Everything needed to render the app for a single athlete. */
export interface AppSnapshot {
  athlete: Athlete;
  plans: TrainingPlan[];
  events: RaceEvent[];
  workouts: Workout[];
}
