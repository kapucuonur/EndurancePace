/**
 * API abstraction layer.
 * ----------------------------------------------------------------------------
 * The whole app talks to `api` (the default export) and never to AsyncStorage
 * or `fetch` directly.
 *
 *   - `RestApi`  — real FastAPI backend (endurancepace-api). Default.
 *   - `MockApi`  — in-memory + AsyncStorage, seeded sample data. Kept for
 *                  offline/demo work; enable with `EXPO_PUBLIC_USE_MOCK_API=true`.
 *
 * Which one is used is decided by the single `const api` line at the bottom.
 * Screens, stores and hooks depend on the `EnduranceApi` interface only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { deriveZones } from '@/domain/zones';
import { API_BASE_URL, USE_MOCK_API } from '@/services/config';
import { buildSeed } from '@/services/seed';
import { ApiError, apiFetch } from '@/services/session';
import type {
  AppSnapshot,
  Athlete,
  CoachAthlete,
  GarminConnectResult,
  GarminMetrics,
  GarminStatus,
  GarminSyncResult,
  ID,
  ISODate,
  RaceEvent,
  ThresholdValues,
  TrainingPlan,
  Workout,
} from '@/types/domain';

const STORAGE_KEY = 'endurancepace:snapshot:v1';

// Simulated network latency for the mock, so loading states are exercised.
const LATENCY_MS = 120;
const delay = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));
const nowTs = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

export interface EnduranceApi {
  /** Full dataset for the current athlete. */
  getSnapshot(): Promise<AppSnapshot>;
  /** Wipe persisted data and re-seed. Dev convenience. */
  resetToSeed(): Promise<AppSnapshot>;

  // Athlete
  updateAthlete(patch: Partial<Athlete>): Promise<Athlete>;
  updateThresholds(thresholds: ThresholdValues): Promise<Athlete>;

  // Plans
  listPlans(): Promise<TrainingPlan[]>;
  createPlan(input: NewPlan): Promise<TrainingPlan>;
  updatePlan(id: ID, patch: Partial<TrainingPlan>): Promise<TrainingPlan>;
  deletePlan(id: ID): Promise<void>;

  // Events
  listEvents(): Promise<RaceEvent[]>;
  createEvent(input: NewEvent): Promise<RaceEvent>;
  updateEvent(id: ID, patch: Partial<RaceEvent>): Promise<RaceEvent>;
  deleteEvent(id: ID): Promise<void>;

  // Workouts
  listWorkouts(): Promise<Workout[]>;
  listWorkoutsInRange(startISO: ISODate, endISO: ISODate): Promise<Workout[]>;
  listLibraryWorkouts(): Promise<Workout[]>;
  getWorkout(id: ID): Promise<Workout | undefined>;
  createWorkout(input: NewWorkout): Promise<Workout>;
  updateWorkout(id: ID, patch: Partial<Workout>): Promise<Workout>;
  deleteWorkout(id: ID): Promise<void>;
  /** Copy a library template onto a date as a planned workout. */
  scheduleFromTemplate(templateId: ID, dateISO: ISODate, planId?: ID | null): Promise<Workout>;

  // Garmin — link a Garmin.com account and pull activities on demand.
  garminStatus(): Promise<GarminStatus>;
  /** Start a login. `mfa_required` means call `garminCompleteMfa` next. */
  garminConnect(email: string, password: string): Promise<GarminConnectResult>;
  garminCompleteMfa(code: string): Promise<GarminConnectResult>;
  garminDisconnect(): Promise<void>;
  /** Import the last `days` (default 30 server-side) of activities as workouts. */
  garminSync(days?: number): Promise<GarminSyncResult>;
  /** Preview training thresholds + insights from the linked Garmin account. */
  garminFetchMetrics(): Promise<GarminMetrics>;

  // Coach — only usable when the current athlete's `role` is `'coach'`.
  /** Every other athlete, as an assignable roster. */
  listCoachAthletes(): Promise<CoachAthlete[]>;
  /** Full dataset for one athlete the coach is managing. */
  coachAthleteSnapshot(athleteId: ID): Promise<AppSnapshot>;
  /** Create a `source: 'coach'` workout on the athlete's calendar. */
  assignWorkout(athleteId: ID, input: NewWorkout): Promise<Workout>;
  /** Edit a workout this coach previously assigned. */
  updateAssignedWorkout(
    athleteId: ID,
    workoutId: ID,
    patch: Partial<Workout>,
  ): Promise<Workout>;
  /** Withdraw a workout this coach assigned. */
  withdrawAssignedWorkout(athleteId: ID, workoutId: ID): Promise<void>;
}

/** Garmin sync only works against the live backend, not the mock layer. */
const GARMIN_NEEDS_BACKEND =
  'Garmin sync needs the live backend. Set EXPO_PUBLIC_USE_MOCK_API=false to use it.';

/** Coaching is a live-backend feature (needs real multi-athlete data). */
const COACH_NEEDS_BACKEND =
  'Coaching needs the live backend. Set EXPO_PUBLIC_USE_MOCK_API=false to use it.';

export type NewPlan = Omit<TrainingPlan, 'id' | 'createdAt' | 'updatedAt'>;
export type NewEvent = Omit<RaceEvent, 'id' | 'createdAt' | 'updatedAt'>;
// `source` is server-owned — always `'manual'` for app-built workouts.
export type NewWorkout = Omit<Workout, 'id' | 'createdAt' | 'updatedAt' | 'source'>;

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------

class MockApi implements EnduranceApi {
  private cache: AppSnapshot | null = null;

  private async load(): Promise<AppSnapshot> {
    if (this.cache) return this.cache;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.cache = JSON.parse(raw) as AppSnapshot;
        return this.cache;
      }
    } catch {
      // fall through to seeding
    }
    this.cache = buildSeed();
    await this.persist();
    return this.cache;
  }

  private async persist(): Promise<void> {
    if (!this.cache) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch {
      // Non-fatal for the mock; in-memory cache still serves the session.
    }
  }

  private async mutate<T>(fn: (s: AppSnapshot) => T): Promise<T> {
    const snapshot = await this.load();
    const result = fn(snapshot);
    await this.persist();
    return result;
  }

  async getSnapshot(): Promise<AppSnapshot> {
    await delay();
    const s = await this.load();
    return structuredCloneSafe(s);
  }

  async resetToSeed(): Promise<AppSnapshot> {
    await delay();
    this.cache = buildSeed();
    await this.persist();
    return structuredCloneSafe(this.cache);
  }

  // --- Athlete ---

  async updateAthlete(patch: Partial<Athlete>): Promise<Athlete> {
    await delay();
    return this.mutate((s) => {
      s.athlete = { ...s.athlete, ...patch, updatedAt: nowTs() };
      return structuredCloneSafe(s.athlete);
    });
  }

  async updateThresholds(thresholds: ThresholdValues): Promise<Athlete> {
    await delay();
    return this.mutate((s) => {
      const merged = { ...s.athlete.thresholds, ...thresholds };
      s.athlete = {
        ...s.athlete,
        thresholds: merged,
        ...deriveZones(merged),
        updatedAt: nowTs(),
      };
      return structuredCloneSafe(s.athlete);
    });
  }

  // --- Plans ---

  async listPlans(): Promise<TrainingPlan[]> {
    await delay();
    const s = await this.load();
    return structuredCloneSafe(s.plans);
  }

  async createPlan(input: NewPlan): Promise<TrainingPlan> {
    await delay();
    return this.mutate((s) => {
      const plan: TrainingPlan = {
        ...input,
        id: makeId('pln'),
        createdAt: nowTs(),
        updatedAt: nowTs(),
      };
      s.plans.push(plan);
      return structuredCloneSafe(plan);
    });
  }

  async updatePlan(id: ID, patch: Partial<TrainingPlan>): Promise<TrainingPlan> {
    await delay();
    return this.mutate((s) => {
      const idx = s.plans.findIndex((p) => p.id === id);
      if (idx < 0) throw new Error(`Plan ${id} not found`);
      s.plans[idx] = { ...s.plans[idx], ...patch, updatedAt: nowTs() };
      return structuredCloneSafe(s.plans[idx]);
    });
  }

  async deletePlan(id: ID): Promise<void> {
    await delay();
    await this.mutate((s) => {
      s.plans = s.plans.filter((p) => p.id !== id);
      // Detach workouts from the deleted plan rather than deleting them.
      s.workouts = s.workouts.map((w) => (w.planId === id ? { ...w, planId: null } : w));
    });
  }

  // --- Events ---

  async listEvents(): Promise<RaceEvent[]> {
    await delay();
    const s = await this.load();
    return structuredCloneSafe(s.events);
  }

  async createEvent(input: NewEvent): Promise<RaceEvent> {
    await delay();
    return this.mutate((s) => {
      const evt: RaceEvent = {
        ...input,
        id: makeId('evt'),
        createdAt: nowTs(),
        updatedAt: nowTs(),
      };
      s.events.push(evt);
      return structuredCloneSafe(evt);
    });
  }

  async updateEvent(id: ID, patch: Partial<RaceEvent>): Promise<RaceEvent> {
    await delay();
    return this.mutate((s) => {
      const idx = s.events.findIndex((e) => e.id === id);
      if (idx < 0) throw new Error(`Event ${id} not found`);
      s.events[idx] = { ...s.events[idx], ...patch, updatedAt: nowTs() };
      return structuredCloneSafe(s.events[idx]);
    });
  }

  async deleteEvent(id: ID): Promise<void> {
    await delay();
    await this.mutate((s) => {
      s.events = s.events.filter((e) => e.id !== id);
      s.plans = s.plans.map((p) => (p.goalEventId === id ? { ...p, goalEventId: null } : p));
    });
  }

  // --- Workouts ---

  async listWorkouts(): Promise<Workout[]> {
    await delay();
    const s = await this.load();
    return structuredCloneSafe(s.workouts);
  }

  async listWorkoutsInRange(startISO: ISODate, endISO: ISODate): Promise<Workout[]> {
    await delay();
    const s = await this.load();
    return structuredCloneSafe(
      s.workouts.filter(
        (w) => w.date && !w.isTemplate && w.date >= startISO && w.date <= endISO,
      ),
    );
  }

  async listLibraryWorkouts(): Promise<Workout[]> {
    await delay();
    const s = await this.load();
    return structuredCloneSafe(s.workouts.filter((w) => w.isTemplate));
  }

  async getWorkout(id: ID): Promise<Workout | undefined> {
    await delay();
    const s = await this.load();
    const w = s.workouts.find((x) => x.id === id);
    return w ? structuredCloneSafe(w) : undefined;
  }

  async createWorkout(input: NewWorkout): Promise<Workout> {
    await delay();
    return this.mutate((s) => {
      const workout: Workout = {
        ...input,
        id: makeId('wko'),
        source: 'manual',
        createdAt: nowTs(),
        updatedAt: nowTs(),
      };
      s.workouts.push(workout);
      return structuredCloneSafe(workout);
    });
  }

  async updateWorkout(id: ID, patch: Partial<Workout>): Promise<Workout> {
    await delay();
    return this.mutate((s) => {
      const idx = s.workouts.findIndex((w) => w.id === id);
      if (idx < 0) throw new Error(`Workout ${id} not found`);
      s.workouts[idx] = { ...s.workouts[idx], ...patch, updatedAt: nowTs() };
      return structuredCloneSafe(s.workouts[idx]);
    });
  }

  async deleteWorkout(id: ID): Promise<void> {
    await delay();
    await this.mutate((s) => {
      s.workouts = s.workouts.filter((w) => w.id !== id);
    });
  }

  async scheduleFromTemplate(
    templateId: ID,
    dateISO: ISODate,
    planId: ID | null = null,
  ): Promise<Workout> {
    await delay();
    return this.mutate((s) => {
      const tpl = s.workouts.find((w) => w.id === templateId);
      if (!tpl) throw new Error(`Template ${templateId} not found`);
      const workout: Workout = {
        ...structuredCloneSafe(tpl),
        id: makeId('wko'),
        planId,
        date: dateISO,
        status: 'planned',
        isTemplate: false,
        templateCategory: undefined,
        completed: undefined,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      };
      s.workouts.push(workout);
      return structuredCloneSafe(workout);
    });
  }

  // --- Garmin (unsupported in mock mode) ---

  async garminStatus(): Promise<GarminStatus> {
    await delay();
    return {
      connected: false,
      garminEmail: null,
      state: 'not_connected',
      displayName: null,
      lastSyncAt: null,
      lastVerifiedAt: null,
      cooldownRemaining: 0,
      lastError: null,
    };
  }

  async garminConnect(): Promise<GarminConnectResult> {
    throw new Error(GARMIN_NEEDS_BACKEND);
  }

  async garminCompleteMfa(): Promise<GarminConnectResult> {
    throw new Error(GARMIN_NEEDS_BACKEND);
  }

  async garminDisconnect(): Promise<void> {
    // no-op — nothing is ever connected in mock mode
  }

  async garminSync(): Promise<GarminSyncResult> {
    throw new Error(GARMIN_NEEDS_BACKEND);
  }

  async garminFetchMetrics(): Promise<GarminMetrics> {
    throw new Error(GARMIN_NEEDS_BACKEND);
  }

  // --- Coach (unsupported in mock mode) ---

  async listCoachAthletes(): Promise<CoachAthlete[]> {
    return [];
  }

  async coachAthleteSnapshot(): Promise<AppSnapshot> {
    throw new Error(COACH_NEEDS_BACKEND);
  }

  async assignWorkout(): Promise<Workout> {
    throw new Error(COACH_NEEDS_BACKEND);
  }

  async updateAssignedWorkout(): Promise<Workout> {
    throw new Error(COACH_NEEDS_BACKEND);
  }

  async withdrawAssignedWorkout(): Promise<void> {
    throw new Error(COACH_NEEDS_BACKEND);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(prefix: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const base =
    g.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${base}`;
}

/** JSON round-trip clone — avoids handing callers a reference into the cache. */
function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// REST implementation (endurancepace-api)
// ---------------------------------------------------------------------------
//
// Endpoints map 1:1 to this interface; response shapes are already this app's
// domain types (the backend emits camelCase to match), so no reshaping here.

class RestApi implements EnduranceApi {
  private req<T>(path: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(API_BASE_URL, path, init);
  }

  private static body(data: unknown): RequestInit {
    return { body: JSON.stringify(data) };
  }

  private static qs(params: Record<string, string | undefined>): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null) usp.set(k, v);
    const s = usp.toString();
    return s ? `?${s}` : '';
  }

  getSnapshot(): Promise<AppSnapshot> {
    return this.req('/me/snapshot');
  }

  resetToSeed(): Promise<AppSnapshot> {
    return this.req('/me/reset', { method: 'POST' });
  }

  updateAthlete(patch: Partial<Athlete>): Promise<Athlete> {
    return this.req('/me/athlete', { method: 'PATCH', ...RestApi.body(patch) });
  }

  updateThresholds(thresholds: ThresholdValues): Promise<Athlete> {
    return this.req('/me/athlete/thresholds', { method: 'PUT', ...RestApi.body(thresholds) });
  }

  listPlans(): Promise<TrainingPlan[]> {
    return this.req('/plans');
  }

  createPlan(input: NewPlan): Promise<TrainingPlan> {
    return this.req('/plans', { method: 'POST', ...RestApi.body(input) });
  }

  updatePlan(id: ID, patch: Partial<TrainingPlan>): Promise<TrainingPlan> {
    return this.req(`/plans/${id}`, { method: 'PATCH', ...RestApi.body(patch) });
  }

  deletePlan(id: ID): Promise<void> {
    return this.req(`/plans/${id}`, { method: 'DELETE' });
  }

  listEvents(): Promise<RaceEvent[]> {
    return this.req('/events');
  }

  createEvent(input: NewEvent): Promise<RaceEvent> {
    return this.req('/events', { method: 'POST', ...RestApi.body(input) });
  }

  updateEvent(id: ID, patch: Partial<RaceEvent>): Promise<RaceEvent> {
    return this.req(`/events/${id}`, { method: 'PATCH', ...RestApi.body(patch) });
  }

  deleteEvent(id: ID): Promise<void> {
    return this.req(`/events/${id}`, { method: 'DELETE' });
  }

  listWorkouts(): Promise<Workout[]> {
    return this.req('/workouts');
  }

  listWorkoutsInRange(startISO: ISODate, endISO: ISODate): Promise<Workout[]> {
    return this.req(`/workouts${RestApi.qs({ start: startISO, end: endISO })}`);
  }

  listLibraryWorkouts(): Promise<Workout[]> {
    return this.req('/workouts?template=true');
  }

  async getWorkout(id: ID): Promise<Workout | undefined> {
    try {
      return await this.req<Workout>(`/workouts/${id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return undefined;
      throw err;
    }
  }

  createWorkout(input: NewWorkout): Promise<Workout> {
    return this.req('/workouts', { method: 'POST', ...RestApi.body(input) });
  }

  updateWorkout(id: ID, patch: Partial<Workout>): Promise<Workout> {
    return this.req(`/workouts/${id}`, { method: 'PATCH', ...RestApi.body(patch) });
  }

  deleteWorkout(id: ID): Promise<void> {
    return this.req(`/workouts/${id}`, { method: 'DELETE' });
  }

  scheduleFromTemplate(
    templateId: ID,
    dateISO: ISODate,
    planId: ID | null = null,
  ): Promise<Workout> {
    return this.req(`/workouts/${templateId}/schedule`, {
      method: 'POST',
      ...RestApi.body({ date: dateISO, planId }),
    });
  }

  // --- Garmin ---

  garminStatus(): Promise<GarminStatus> {
    return this.req('/me/garmin/status');
  }

  garminConnect(email: string, password: string): Promise<GarminConnectResult> {
    return this.req('/me/garmin/connect', {
      method: 'POST',
      ...RestApi.body({ garminEmail: email, garminPassword: password }),
    });
  }

  garminCompleteMfa(code: string): Promise<GarminConnectResult> {
    return this.req('/me/garmin/connect/mfa', {
      method: 'POST',
      ...RestApi.body({ mfaCode: code }),
    });
  }

  garminDisconnect(): Promise<void> {
    return this.req('/me/garmin/connect', { method: 'DELETE' });
  }

  garminSync(days?: number): Promise<GarminSyncResult> {
    return this.req(`/me/garmin/sync${RestApi.qs({ days: days?.toString() })}`, {
      method: 'POST',
    });
  }

  garminFetchMetrics(): Promise<GarminMetrics> {
    return this.req('/me/garmin/thresholds');
  }

  // --- Coach ---

  listCoachAthletes(): Promise<CoachAthlete[]> {
    return this.req('/coach/athletes');
  }

  coachAthleteSnapshot(athleteId: ID): Promise<AppSnapshot> {
    return this.req(`/coach/athletes/${athleteId}/snapshot`);
  }

  assignWorkout(athleteId: ID, input: NewWorkout): Promise<Workout> {
    return this.req(`/coach/athletes/${athleteId}/workouts`, {
      method: 'POST',
      ...RestApi.body(input),
    });
  }

  updateAssignedWorkout(
    athleteId: ID,
    workoutId: ID,
    patch: Partial<Workout>,
  ): Promise<Workout> {
    return this.req(`/coach/athletes/${athleteId}/workouts/${workoutId}`, {
      method: 'PATCH',
      ...RestApi.body(patch),
    });
  }

  withdrawAssignedWorkout(athleteId: ID, workoutId: ID): Promise<void> {
    return this.req(`/coach/athletes/${athleteId}/workouts/${workoutId}`, {
      method: 'DELETE',
    });
  }
}

// ---------------------------------------------------------------------------

const api: EnduranceApi = USE_MOCK_API ? new MockApi() : new RestApi();

export default api;
