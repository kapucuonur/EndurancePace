/**
 * Global app store (Zustand).
 *
 * The store is a thin cache over `services/api.ts`: it holds the loaded
 * snapshot and exposes actions that call the API and then reconcile local
 * state. Screens read from here; they never touch the API directly for writes
 * that should update the UI.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import api, { type NewEvent, type NewPlan, type NewWorkout } from '@/services/api';
import * as auth from '@/services/auth';
import { USE_MOCK_API } from '@/services/config';
import { getTokenSync, loadToken, setUnauthorizedHandler } from '@/services/session';
import type {
  Athlete,
  ID,
  ISODate,
  RaceEvent,
  ThresholdValues,
  TrainingPlan,
  Workout,
} from '@/types/domain';

interface SessionState {
  /** JWT (or the mock placeholder). `null` = signed out. */
  token: string | null;
  /** True once the initial token check has run — gate waits for this. */
  ready: boolean;
  /** Last auth error, for the login screen. */
  error: string | null;
  busy: boolean;
}

interface AppState {
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  session: SessionState;

  athlete: Athlete | null;
  plans: TrainingPlan[];
  events: RaceEvent[];
  workouts: Workout[];

  // auth
  initSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;

  // lifecycle
  hydrate: () => Promise<void>;
  resetToSeed: () => Promise<void>;

  // athlete
  updateThresholds: (t: ThresholdValues) => Promise<void>;
  updateAthlete: (patch: Partial<Athlete>) => Promise<void>;

  // workouts
  createWorkout: (input: NewWorkout) => Promise<Workout>;
  updateWorkout: (id: ID, patch: Partial<Workout>) => Promise<void>;
  deleteWorkout: (id: ID) => Promise<void>;
  setWorkoutStatus: (id: ID, status: Workout['status']) => Promise<void>;
  scheduleFromTemplate: (templateId: ID, date: ISODate, planId?: ID | null) => Promise<Workout>;

  // plans
  createPlan: (input: NewPlan) => Promise<TrainingPlan>;
  updatePlan: (id: ID, patch: Partial<TrainingPlan>) => Promise<void>;
  deletePlan: (id: ID) => Promise<void>;

  // events
  createEvent: (input: NewEvent) => Promise<RaceEvent>;
  deleteEvent: (id: ID) => Promise<void>;
}

const upsert = <T extends { id: ID }>(list: T[], item: T): T[] => {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx < 0) return [...list, item];
  const next = list.slice();
  next[idx] = item;
  return next;
};

const EMPTY_DATA = {
  athlete: null,
  plans: [] as TrainingPlan[],
  events: [] as RaceEvent[],
  workouts: [] as Workout[],
  hydrated: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  loading: false,
  error: null,

  session: { token: null, ready: false, error: null, busy: false },

  athlete: null,
  plans: [],
  events: [],
  workouts: [],

  initSession: async () => {
    setUnauthorizedHandler(() => {
      void get().signOut();
    });
    const token = USE_MOCK_API ? 'mock-session' : await loadToken();
    set({ session: { token, ready: true, error: null, busy: false } });
    if (token) await get().hydrate();
  },

  signIn: async (email, password) => {
    set((s) => ({ session: { ...s.session, busy: true, error: null } }));
    try {
      await auth.signIn(email, password);
      const token = USE_MOCK_API ? 'mock-session' : getTokenSync();
      set((s) => ({ session: { ...s.session, token, busy: false, error: null } }));
      await get().hydrate();
    } catch (e) {
      set((s) => ({
        session: {
          ...s.session,
          busy: false,
          error: e instanceof Error ? e.message : 'Sign in failed',
        },
      }));
      throw e;
    }
  },

  signUp: async (email, password, name) => {
    set((s) => ({ session: { ...s.session, busy: true, error: null } }));
    try {
      await auth.signUp(email, password, name);
      const token = USE_MOCK_API ? 'mock-session' : getTokenSync();
      set((s) => ({ session: { ...s.session, token, busy: false, error: null } }));
      await get().hydrate();
    } catch (e) {
      set((s) => ({
        session: {
          ...s.session,
          busy: false,
          error: e instanceof Error ? e.message : 'Sign up failed',
        },
      }));
      throw e;
    }
  },

  signOut: async () => {
    await auth.signOut();
    set({
      ...EMPTY_DATA,
      session: { token: null, ready: true, error: null, busy: false },
      loading: false,
      error: null,
    });
  },

  hydrate: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const snap = await api.getSnapshot();
      set({
        athlete: snap.athlete,
        plans: snap.plans,
        events: snap.events,
        workouts: snap.workouts,
        hydrated: true,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load' });
    }
  },

  resetToSeed: async () => {
    set({ loading: true, error: null });
    const snap = await api.resetToSeed();
    set({
      athlete: snap.athlete,
      plans: snap.plans,
      events: snap.events,
      workouts: snap.workouts,
      hydrated: true,
      loading: false,
    });
  },

  updateThresholds: async (t) => {
    const athlete = await api.updateThresholds(t);
    set({ athlete });
  },

  updateAthlete: async (patch) => {
    const athlete = await api.updateAthlete(patch);
    set({ athlete });
  },

  createWorkout: async (input) => {
    const w = await api.createWorkout(input);
    set((s) => ({ workouts: upsert(s.workouts, w) }));
    return w;
  },

  updateWorkout: async (id, patch) => {
    const w = await api.updateWorkout(id, patch);
    set((s) => ({ workouts: upsert(s.workouts, w) }));
  },

  deleteWorkout: async (id) => {
    await api.deleteWorkout(id);
    set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
  },

  setWorkoutStatus: async (id, status) => {
    const patch: Partial<Workout> =
      status === 'completed'
        ? { status, completed: { date: new Date().toISOString() } }
        : { status };
    const w = await api.updateWorkout(id, patch);
    set((s) => ({ workouts: upsert(s.workouts, w) }));
  },

  scheduleFromTemplate: async (templateId, date, planId = null) => {
    const w = await api.scheduleFromTemplate(templateId, date, planId);
    set((s) => ({ workouts: upsert(s.workouts, w) }));
    return w;
  },

  createPlan: async (input) => {
    const p = await api.createPlan(input);
    set((s) => ({ plans: upsert(s.plans, p) }));
    return p;
  },

  updatePlan: async (id, patch) => {
    const p = await api.updatePlan(id, patch);
    set((s) => ({ plans: upsert(s.plans, p) }));
  },

  deletePlan: async (id) => {
    await api.deletePlan(id);
    const snap = await api.getSnapshot(); // workouts were detached server-side
    set({ plans: snap.plans, workouts: snap.workouts });
  },

  createEvent: async (input) => {
    const e = await api.createEvent(input);
    set((s) => ({ events: upsert(s.events, e) }));
    return e;
  },

  deleteEvent: async (id) => {
    await api.deleteEvent(id);
    const snap = await api.getSnapshot();
    set({ events: snap.events, plans: snap.plans });
  },
}));

// ---------------------------------------------------------------------------
// Selectors / derived hooks
// ---------------------------------------------------------------------------

// Selectors that derive a fresh array/object must go through `useShallow` —
// Zustand v5 compares snapshots with Object.is, so a new reference every call
// would re-render forever.

export const useAthlete = () => useAppStore((s) => s.athlete);

export function useWorkoutsInRange(startISO: ISODate, endISO: ISODate): Workout[] {
  return useAppStore(
    useShallow((s) =>
      s.workouts.filter(
        (w) => !w.isTemplate && w.date && w.date >= startISO && w.date <= endISO,
      ),
    ),
  );
}

export function useWorkoutsByDay(dateISO: ISODate): Workout[] {
  return useAppStore(
    useShallow((s) => s.workouts.filter((w) => !w.isTemplate && w.date === dateISO)),
  );
}

export function useWorkout(id: ID | undefined): Workout | undefined {
  return useAppStore((s) => s.workouts.find((w) => w.id === id));
}

export const useLibraryWorkouts = () =>
  useAppStore(useShallow((s) => s.workouts.filter((w) => w.isTemplate)));

export const usePlans = () => useAppStore((s) => s.plans);
export const useEvents = () => useAppStore((s) => s.events);
