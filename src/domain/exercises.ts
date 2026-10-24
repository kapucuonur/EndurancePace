import type { StepExercise } from '@/types/domain';

/**
 * Strength exercise catalog: common gym movements, weighted toward what
 * endurance athletes actually program (single-leg work, posterior chain,
 * core). Names live in i18n under `exercise.<key>`; `hold` means `reps` is a
 * hold time in seconds.
 */
export type ExerciseGroup = 'legs' | 'posterior' | 'push' | 'pull' | 'core' | 'power';

export interface ExerciseDef {
  key: string;
  group: ExerciseGroup;
  sets: number;
  reps: number;
  hold?: boolean;
  /** Bodyweight by default (no load to fill in). */
  bodyweight?: boolean;
}

export const EXERCISE_GROUPS: ExerciseGroup[] = [
  'legs',
  'posterior',
  'push',
  'pull',
  'core',
  'power',
];

export const EXERCISES: ExerciseDef[] = [
  { key: 'back_squat', group: 'legs', sets: 4, reps: 8 },
  { key: 'front_squat', group: 'legs', sets: 4, reps: 6 },
  { key: 'goblet_squat', group: 'legs', sets: 3, reps: 10 },
  { key: 'bulgarian_split_squat', group: 'legs', sets: 3, reps: 8 },
  { key: 'lunge', group: 'legs', sets: 3, reps: 10 },
  { key: 'step_up', group: 'legs', sets: 3, reps: 10 },
  { key: 'leg_press', group: 'legs', sets: 3, reps: 12 },
  { key: 'calf_raise', group: 'legs', sets: 3, reps: 15 },
  { key: 'deadlift', group: 'posterior', sets: 4, reps: 5 },
  { key: 'romanian_deadlift', group: 'posterior', sets: 3, reps: 8 },
  { key: 'hip_thrust', group: 'posterior', sets: 3, reps: 10 },
  { key: 'glute_bridge', group: 'posterior', sets: 3, reps: 12, bodyweight: true },
  { key: 'single_leg_rdl', group: 'posterior', sets: 3, reps: 8 },
  { key: 'kettlebell_swing', group: 'posterior', sets: 3, reps: 15 },
  { key: 'bench_press', group: 'push', sets: 4, reps: 8 },
  { key: 'overhead_press', group: 'push', sets: 3, reps: 8 },
  { key: 'push_up', group: 'push', sets: 3, reps: 15, bodyweight: true },
  { key: 'dips', group: 'push', sets: 3, reps: 10, bodyweight: true },
  { key: 'pull_up', group: 'pull', sets: 3, reps: 6, bodyweight: true },
  { key: 'lat_pulldown', group: 'pull', sets: 3, reps: 10 },
  { key: 'barbell_row', group: 'pull', sets: 4, reps: 8 },
  { key: 'dumbbell_row', group: 'pull', sets: 3, reps: 10 },
  { key: 'face_pull', group: 'pull', sets: 3, reps: 15 },
  { key: 'plank', group: 'core', sets: 3, reps: 45, hold: true, bodyweight: true },
  { key: 'side_plank', group: 'core', sets: 3, reps: 30, hold: true, bodyweight: true },
  { key: 'dead_bug', group: 'core', sets: 3, reps: 12, bodyweight: true },
  { key: 'hanging_leg_raise', group: 'core', sets: 3, reps: 10, bodyweight: true },
  { key: 'russian_twist', group: 'core', sets: 3, reps: 20, bodyweight: true },
  { key: 'pallof_press', group: 'core', sets: 3, reps: 12 },
  { key: 'box_jump', group: 'power', sets: 4, reps: 5, bodyweight: true },
  { key: 'jump_squat', group: 'power', sets: 3, reps: 8, bodyweight: true },
  { key: 'skipping', group: 'power', sets: 3, reps: 30, hold: true, bodyweight: true },
];

const BY_KEY = new Map(EXERCISES.map((e) => [e.key, e]));

export function exerciseDef(key: string): ExerciseDef | undefined {
  return BY_KEY.get(key);
}

/** Seconds of work per rep for non-hold exercises (controlled tempo). */
const SECONDS_PER_REP = 3;

/** Planned time: every set's work plus the rest after it. */
export function exerciseSeconds(ex: StepExercise): number {
  const def = BY_KEY.get(ex.key);
  const work = def?.hold ? ex.reps : ex.reps * SECONDS_PER_REP;
  return ex.sets * (work + ex.restSec);
}

/** A fresh exercise prescription with the catalog's default sets/reps. */
export function defaultExercise(key: string): StepExercise {
  const def = BY_KEY.get(key);
  return { key, sets: def?.sets ?? 3, reps: def?.reps ?? 10, restSec: 90 };
}
