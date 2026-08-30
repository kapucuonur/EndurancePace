# EndurancePace

A focused, lightweight training-planning app for endurance athletes (triathlon / running /
cycling) — think TrainingPeaks, trimmed to the essentials. Built with Expo + React Native.

Plan structured workouts, periodize a season, pull completed activities in from Garmin, and —
if you coach — assign workouts onto other athletes' calendars. Six UI languages.

---

## Quick start

```bash
npm install
npm start            # Expo dev server — press i / a / w
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (flat config)
npm run format       # prettier --write src
```

First launch seeds ~2 weeks of sample workouts (swim/bike/run), one athlete, an active
training plan, and two races. **Profile → "Reset demo data"** re-seeds at any time (only
when the backend allows it).

> **Note on charts / dev builds.** `victory-native` (v42, Skia-based) is installed for the
> Fitness Trends screen but requires a custom dev build. The Trends screen currently renders
> the same Performance-Management-Chart series with `react-native-svg` so it works in Expo Go
> today. See `src/app/trends.tsx` for the one-component swap.

---

## Architecture decisions

### Navigation — Expo Router (file-based)

Chosen over hand-wired React Navigation because the file tree _is_ the route map, which keeps
boilerplate low. Under the hood it still uses React Navigation (native-stack + bottom-tabs),
which Expo Router 57 vendors and re-exports.

```
src/app/
  _layout.tsx            Root Stack. Hydrates the store, loads the locale, sets nav theme.
  (tabs)/
    _layout.tsx          Tab bar — bottom on phones, top navbar on web (tabBarPosition)
    index.tsx            Calendar / Home  — weekly strip + day list + month grid
    plans.tsx            Plan Overview + upcoming races
    library.tsx          Reusable workout templates, grouped by sport
    profile.tsx          Thresholds + zones + language + Garmin + Coaching entry points
  workout/
    new.tsx              Workout Builder (create; ?id= → edit; ?date= → prefill;
                         ?assignTo= → coach assigns to an athlete)                 [modal]
    [id].tsx             Workout Detail — planned vs. actual, step timeline, complete/skip
  plan/
    new.tsx              New-plan wizard with periodization blocks                  [modal]
    [id].tsx             Plan detail — mini calendar of the plan's workouts
  trends.tsx             Fitness / Fatigue / Form (PMC) chart
  garmin.tsx             Garmin Connect — link an account, sync, import thresholds
  coach/
    index.tsx            Coach roster — every athlete (coach role only)
    [athleteId].tsx      One athlete's calendar + "assign a workout" / withdraw
  login.tsx              Email + password, sign in / sign up
```

Typed routes are **off** (`app.json → experiments.typedRoutes`) to keep dynamic
`router.push(\`/workout/\${id}\`)` calls friction-free.

### State — Zustand

One store (`src/store/useAppStore.ts`) acting as a thin cache over the API layer. Screens read
via selector hooks (`useWorkoutsByDay`, `useAthlete`, `useIsCoach`, `useLocale`, …) and call
store actions for writes; the store calls the API then reconciles local state. No Redux, no
context boilerplate.

> **Zustand v5 gotcha:** a selector that returns a fresh array/object every call loops forever
> (v5 compares snapshots with `Object.is`). Select raw state and derive with `useMemo` in the
> component, or wrap the selector in `useShallow`.

### Persistence — API abstraction layer

**Everything goes through `src/services/api.ts` — the `EnduranceApi` interface.** Nothing else
imports `AsyncStorage` or `fetch`. Two implementations:

| | |
|---|---|
| `RestApi` | The real backend (`endurancepace-api`, FastAPI on a Pi). **Default.** |
| `MockApi` | In-memory + AsyncStorage, seeded from `src/services/seed.ts`. Offline/demo. Garmin + coaching throw "needs the live backend". |

Which one runs is the single `const api = USE_MOCK_API ? new MockApi() : new RestApi()`
line at the bottom of the file.

**Config** (`.env`, copy from `.env.example`; Metro inlines `EXPO_PUBLIC_*` at
build time — restart after changing):

```
EXPO_PUBLIC_API_URL=https://endurancepace-api.coachonurai.com
EXPO_PUBLIC_USE_MOCK_API=false      # true → MockApi, no backend / no login
```

**Auth** (`src/services/session.ts` + `auth.ts`): `POST /auth/login` → JWT stored
in AsyncStorage → `Authorization: Bearer` on every request. A 401 clears the token
and the root-layout gate (`src/app/_layout.tsx`) bounces to `src/app/login.tsx`.

The domain types in `src/types/domain.ts` are the wire format — the backend emits
camelCase to match, so responses need no reshaping.

### Domain model — `src/types/domain.ts`

`Athlete` (with `role: 'athlete' | 'coach'`), `TrainingPlan` (+ periodization `blocks`),
`Workout` (`source: 'manual' | 'garmin' | 'coach'`, optional `completed` with measured
metrics), `Step` (a tree — `repeatCount` + `children` model interval sets like
`6 × [3min Z4, 2min Z1]`), `RaceEvent`, `Zone`.

Derived logic lives in `src/domain/`:

| File         | Responsibility                                                              |
| ------------ | -------------------------------------------------------------------------- |
| `zones.ts`   | 5-zone HR / power / pace calculators (Coggan % FTP, Friel-style % LTHR).   |
| `workout.ts` | Flatten the step tree, total duration, estimated planned TSS (Σ IF²·hrs·100). |
| `trends.ts`  | CTL / ATL / TSB exponentially-weighted load series for the PMC chart.     |
| `plan.ts`    | Periodization block ranges, current phase, default breakdown for a race.  |

### Garmin sync — `src/app/garmin.tsx` + backend `app/garmin/`

Garmin has no third-party OAuth for this, so the athlete links their Garmin.com **email +
password**; the backend stores them encrypted and drives `garminconnect`/`garth` (incl. the
MFA code step). Sync is **on-demand only** — the app calls `POST /me/garmin/sync`, which pulls
the last 30 days of activities and, per activity: dedupes by `activityId`, else matches an
existing planned workout (same day + sport), else creates a `source: 'garmin'` workout. It
distils distance / pace / HR / elevation / cadence / power / calories into `completed`, which
the Workout Detail screen shows as an **"Actual" card** with a planned-vs-actual read.
Threshold import (FTP / LTHR / run threshold pace) is a separate opt-in, per field.

### Coaching — `src/app/coach/` + backend `app/routers/coach.py`

An athlete whose login is in the backend's `COACH_EMAILS` allowlist gets `role: 'coach'` and a
**Coaching** entry on their profile. From there they browse every athlete, open one to see
their calendar and training, and assign a workout onto a date (the builder in "assign" mode).
Assigned workouts land as `source: 'coach'` on the athlete's calendar, badged "From coach";
the coach can withdraw the ones they assigned.

### Localization — `src/i18n/`

`expo-localization` gives the device language; `i18n-js` holds the tables. Six locales —
**en, tr, de, ru, it, es** — in `src/i18n/locales/*.json`. Every screen pulls copy through a
`useT()` hook (`t('calendar.today')`). Dates and the calendar grid follow the locale via
`date-fns` and `react-native-calendars`' `LocaleConfig`. Language follows the device by
default and can be overridden from a picker on the Profile screen; the choice is persisted.

### Styling — NativeWind + one token file

`src/theme/tokens.ts` is the **single source of truth** for palette, spacing, radius and sport
colors. `tailwind.config.js` imports it (via `jiti`) and exposes it as utility classes
(`bg-brand`, `text-muted`, `p-lg`, `dark:bg-surface-dark`). Raw values are used directly only
where classes can't reach — `react-native-calendars` theme objects, SVG fills, icon colors.

Dark mode is automatic (NativeWind `media` strategy + `userInterfaceStyle: automatic`); every
surface has a `dark:` variant.

### Forms — react-hook-form + zod

Top-level form fields use RHF with a `zodResolver`; the field-error copy is resolved through
i18n at render, not from the schema. The workout **step tree** is managed as local
`useState<Step[]>` — RHF field arrays don't nest well, and the tree needs custom
add/remove/repeat operations anyway. Metrics recompute live via `computeWorkoutMetrics`.

---

## Project layout

```
src/
  app/            Expo Router routes (see tree above)
  components/
    ui/           Primitives: Screen, Text, Card, Button, Badge, Segmented
    builder/      Workout-builder pieces: StepRow, RepeatBlock
    library/      ScheduleModal (bottom-sheet date picker)
    plan/         PhaseAllocator, PhaseTimeline
    *.tsx         Feature components: WeekStrip, WorkoutCard, StepTimeline, ZoneTable, SportGlyph
  domain/         Pure calculation modules (zones, workout metrics, trends, plan)
  i18n/           index.ts (i18n-js + calendar locales), useT.ts, locales/*.json (6 languages)
  lib/            date (locale-aware) / format / id / nav helpers
  services/       api.ts (RestApi + MockApi), session.ts / auth.ts, config.ts, seed.ts
  store/          useAppStore.ts (Zustand: session + locale + data) + selector hooks
  theme/          tokens.ts, sport.ts, phase.ts
  types/          domain.ts
```

---

## Status

| Screen                | State                                                                  |
| --------------------- | -------------------------------------------------------------------- |
| Auth (login/signup)   | ✅ Wired to the backend; JWT + gate + 401 handling                   |
| Calendar / Home       | ✅ Complete — week strip, day list, month grid, FAB                   |
| Workout Builder       | ✅ Complete — nested repeats, live duration/TSS, date/library/assign  |
| Workout Detail        | ✅ Complete — planned vs. actual card, step timeline, complete/skip   |
| Athlete Profile/Zones | ✅ Functional — edit thresholds, auto-calc zones, language picker     |
| Plan wizard + detail  | ✅ Functional — periodization blocks; plan editing is `// TODO`       |
| Library               | ✅ Grouped templates, search + sport filter, date-pick scheduling     |
| Garmin sync           | ✅ Connect + MFA, on-demand sync, actual metrics, threshold import    |
| Coaching              | ✅ Roster, per-athlete calendar, assign / withdraw workouts           |
| Localization          | ✅ 6 languages; de/ru/it/es want a native speaker's pass              |
| Fitness Trends        | 🟡 SVG PMC chart placeholder; victory-native swap `// TODO`          |

Search `// TODO: implement` for the remaining work.
