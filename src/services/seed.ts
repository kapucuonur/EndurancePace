/**
 * Seed data: one athlete, one active training plan, one goal race, and ~2 weeks
 * of workouts across swim / bike / run (centred on "today" so the calendar has
 * both history and upcoming sessions on first launch).
 */

import { computeWorkoutMetrics } from '@/domain/workout';
import { deriveZones } from '@/domain/zones';
import { shiftDays, todayISO, weekStart } from '@/lib/date';
import { uid } from '@/lib/id';
import type {
  Athlete,
  AppSnapshot,
  RaceEvent,
  Sport,
  Step,
  StepType,
  TrainingPlan,
  Workout,
} from '@/types/domain';

const now = () => new Date().toISOString();

function step(
  type: StepType,
  opts: Partial<Step> & { seconds?: number; meters?: number },
): Step {
  const { seconds, meters, ...rest } = opts;
  return {
    id: uid('st'),
    type,
    repeatCount: 1,
    children: [],
    duration: seconds
      ? { kind: 'time', seconds }
      : meters
        ? { kind: 'distance', meters }
        : undefined,
    ...rest,
  };
}

function repeat(count: number, children: Step[], label?: string): Step {
  return {
    id: uid('st'),
    type: 'interval',
    label,
    repeatCount: count,
    children,
  };
}

// --- Workout templates -----------------------------------------------------

function easyRun(): Step[] {
  return [
    step('warmup', { seconds: 600, target: { hrZone: 1 }, label: 'Easy warmup' }),
    step('steady', { seconds: 2400, target: { hrZone: 2 }, label: 'Aerobic' }),
    step('cooldown', { seconds: 300, target: { hrZone: 1 } }),
  ];
}

function runIntervals(): Step[] {
  return [
    step('warmup', { seconds: 900, target: { hrZone: 1 } }),
    repeat(
      6,
      [
        step('interval', { seconds: 180, target: { hrZone: 4 }, label: '3 min hard' }),
        step('recovery', { seconds: 120, target: { hrZone: 1 }, label: 'jog' }),
      ],
      '6 x 3min Z4',
    ),
    step('cooldown', { seconds: 600, target: { hrZone: 1 } }),
  ];
}

function bikeEndurance(): Step[] {
  return [
    step('warmup', { seconds: 600, target: { powerZone: 2 } }),
    step('steady', { seconds: 4800, target: { powerZone: 2 }, label: 'Endurance' }),
    step('cooldown', { seconds: 600, target: { powerZone: 1 } }),
  ];
}

function bikeThreshold(): Step[] {
  return [
    step('warmup', { seconds: 900, target: { powerZone: 2 } }),
    repeat(
      3,
      [
        step('interval', { seconds: 600, target: { powerZone: 4 }, label: '10 min FTP' }),
        step('recovery', { seconds: 300, target: { powerZone: 1 } }),
      ],
      '3 x 10min Z4',
    ),
    step('cooldown', { seconds: 600, target: { powerZone: 1 } }),
  ];
}

function swimTechnique(): Step[] {
  return [
    step('warmup', { meters: 400, target: { rpe: 3 }, label: 'Warmup mix' }),
    repeat(
      8,
      [
        step('interval', { meters: 50, target: { rpe: 6 }, label: 'Drill/Swim' }),
        step('recovery', { seconds: 20, target: { rpe: 1 } }),
      ],
      '8 x 50',
    ),
    step('steady', { meters: 600, target: { rpe: 5 }, label: 'Pull' }),
    step('cooldown', { meters: 200, target: { rpe: 2 } }),
  ];
}

function swimThreshold(): Step[] {
  return [
    step('warmup', { meters: 400, target: { rpe: 3 } }),
    repeat(
      5,
      [
        step('interval', { meters: 200, target: { rpe: 7 }, label: 'CSS 200s' }),
        step('recovery', { seconds: 25, target: { rpe: 1 } }),
      ],
      '5 x 200 @ CSS',
    ),
    step('cooldown', { meters: 200, target: { rpe: 2 } }),
  ];
}

interface Plan {
  offset: number; // days from today
  sport: Sport;
  title: string;
  build: () => Step[];
  description?: string;
}

// Two training weeks: -7 .. +6 relative to today.
const WEEK_PLAN: Plan[] = [
  { offset: -7, sport: 'swim', title: 'Swim — Technique', build: swimTechnique },
  { offset: -6, sport: 'bike', title: 'Bike — Endurance', build: bikeEndurance },
  { offset: -5, sport: 'run', title: 'Run — Easy aerobic', build: easyRun },
  { offset: -4, sport: 'swim', title: 'Swim — CSS intervals', build: swimThreshold },
  { offset: -3, sport: 'bike', title: 'Bike — FTP 3x10', build: bikeThreshold },
  { offset: -2, sport: 'run', title: 'Run — Track intervals', build: runIntervals },
  { offset: -1, sport: 'bike', title: 'Bike — Long endurance', build: bikeEndurance },
  { offset: 0, sport: 'run', title: 'Run — Easy aerobic', build: easyRun },
  { offset: 1, sport: 'swim', title: 'Swim — Technique', build: swimTechnique },
  { offset: 2, sport: 'bike', title: 'Bike — FTP 3x10', build: bikeThreshold },
  { offset: 3, sport: 'run', title: 'Run — Track intervals', build: runIntervals },
  { offset: 4, sport: 'swim', title: 'Swim — CSS intervals', build: swimThreshold },
  { offset: 5, sport: 'bike', title: 'Bike — Long endurance', build: bikeEndurance },
  { offset: 6, sport: 'run', title: 'Run — Long run', build: easyRun },
];

export function buildSeed(): AppSnapshot {
  const ts = now();
  const athleteId = uid('ath');

  const thresholds = {
    ftpWatts: 265,
    runThresholdPaceSecPerKm: 258, // 4:18 /km
    cssSecPer100m: 95, // 1:35 /100m
    thresholdHr: 168,
    maxHr: 190,
  };

  const athlete: Athlete = {
    id: athleteId,
    name: 'Alex Rivera',
    disciplines: ['swim', 'bike', 'run', 'strength'],
    thresholds,
    ...deriveZones(thresholds),
    weightKg: 70,
    birthdate: '1992-04-18',
    createdAt: ts,
    updatedAt: ts,
  };

  const goalEventId = uid('evt');
  const events: RaceEvent[] = [
    {
      id: goalEventId,
      athleteId,
      name: 'Alpine Olympic Triathlon',
      date: shiftDays(todayISO(), 70),
      sport: 'run',
      priority: 'A',
      distance: 'Olympic (1.5 / 40 / 10)',
      location: 'Annecy, FR',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: uid('evt'),
      athleteId,
      name: 'Local Sprint Tri',
      date: shiftDays(todayISO(), 28),
      sport: 'run',
      priority: 'C',
      distance: 'Sprint (0.75 / 20 / 5)',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const planId = uid('pln');
  const plan: TrainingPlan = {
    id: planId,
    athleteId,
    name: 'Base → Build: Annecy',
    startDate: weekStart(shiftDays(todayISO(), -7)),
    endDate: shiftDays(todayISO(), 70),
    goalEventId,
    phase: 'build',
    blocks: [
      { phase: 'base', weeks: 4 },
      { phase: 'build', weeks: 4 },
      { phase: 'peak', weeks: 2 },
      { phase: 'taper', weeks: 1 },
    ],
    notes: 'Progressive build toward the A race. Bike-focused with 3 quality sessions/week.',
    createdAt: ts,
    updatedAt: ts,
  };

  const workouts: Workout[] = WEEK_PLAN.map((p) => {
    const structure = p.build();
    const { durationSeconds, tss } = computeWorkoutMetrics(structure, p.sport, thresholds);
    const date = shiftDays(todayISO(), p.offset);
    const isPast = p.offset < 0;
    return {
      id: uid('wko'),
      planId,
      date,
      sport: p.sport,
      title: p.title,
      description: p.description,
      structure,
      plannedDuration: durationSeconds,
      plannedTss: tss,
      status: isPast ? (p.offset === -4 ? 'skipped' : 'completed') : 'planned',
      completed:
        isPast && p.offset !== -4
          ? {
              date: shiftDays(todayISO(), p.offset) + 'T07:00:00.000Z',
              durationSeconds: Math.round(durationSeconds * (0.95 + Math.random() * 0.1)),
              actualTss: Math.round(tss * (0.95 + Math.random() * 0.1)),
              rpe: 5 + Math.floor(Math.random() * 3),
            }
          : undefined,
      isTemplate: false,
      createdAt: ts,
      updatedAt: ts,
    } satisfies Workout;
  });

  // A couple of unscheduled library templates.
  const templates: Workout[] = [
    {
      sport: 'run' as Sport,
      title: 'Run — Track intervals',
      category: 'Speed',
      build: runIntervals,
    },
    {
      sport: 'bike' as Sport,
      title: 'Bike — FTP 3x10',
      category: 'Threshold',
      build: bikeThreshold,
    },
    {
      sport: 'swim' as Sport,
      title: 'Swim — Technique',
      category: 'Technique',
      build: swimTechnique,
    },
  ].map((t) => {
    const structure = t.build();
    const { durationSeconds, tss } = computeWorkoutMetrics(structure, t.sport, thresholds);
    return {
      id: uid('wko'),
      planId: null,
      date: null,
      sport: t.sport,
      title: t.title,
      structure,
      plannedDuration: durationSeconds,
      plannedTss: tss,
      status: 'planned',
      isTemplate: true,
      templateCategory: t.category,
      createdAt: ts,
      updatedAt: ts,
    } satisfies Workout;
  });

  return {
    athlete,
    plans: [plan],
    events,
    workouts: [...workouts, ...templates],
  };
}
