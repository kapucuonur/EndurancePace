# EndurancePace

A focused, lightweight training-planning app for endurance athletes (triathlon / running /
cycling) — think TrainingPeaks, trimmed to the essentials. Built with Expo + React Native.

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
training plan, and two races. **Profile → "Reset demo data"** re-seeds at any time.

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
  _layout.tsx            Root Stack. Hydrates the store, sets nav theme, imports global.css.
  (tabs)/
    _layout.tsx          Bottom tab bar (Calendar / Plans / Library / Profile)
    index.tsx            Calendar / Home  — weekly strip + day list + month grid
    plans.tsx            Plan Overview + upcoming races
    library.tsx          Reusable workout templates, grouped by sport
    profile.tsx          Athlete thresholds + auto-calculated zones
  workout/
    new.tsx              Workout Builder (create; ?id= → edit; ?date= → prefill)   [modal]
    [id].tsx             Workout Detail — step timeline, complete / skip / delete
  plan/
    new.tsx              New-plan wizard                                            [modal]
    [id].tsx             Plan detail — mini calendar of the plan's workouts
  trends.tsx             Fitness / Fatigue / Form (PMC) chart
```

Typed routes are **off** (`app.json → experiments.typedRoutes`) to keep dynamic
`router.push(\`/workout/\${id}\`)` calls friction-free. Flip it on and convert those to the
object form (`{ pathname: '/workout/[id]', params: { id } }`) when the route surface settles.

### State — Zustand

One store (`src/store/useAppStore.ts`) acting as a thin cache over the API layer. Screens read
via selector hooks (`useWorkoutsByDay`, `useAthlete`, …) and call store actions for writes; the
store calls the API then reconciles local state. No Redux, no context boilerplate.

### Persistence — API abstraction layer

**Everything goes through `src/services/api.ts` — the `EnduranceApi` interface
(~25 methods).** Nothing else imports `AsyncStorage` or `fetch`. Two implementations:

| | |
|---|---|
| `RestApi` | The real backend (`endurancepace-api`, FastAPI on a Pi). **Default.** |
| `MockApi` | In-memory + AsyncStorage, seeded from `src/services/seed.ts`. Offline/demo. |

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

`Athlete`, `TrainingPlan`, `Workout`, `Step` (a tree — `repeatCount` + `children` model
interval sets like `6 × [3min Z4, 2min Z1]`), `RaceEvent`, `Zone`. Pure types first;
everything else builds on them.

Derived logic lives in `src/domain/`:

| File         | Responsibility                                                              |
| ------------ | -------------------------------------------------------------------------- |
| `zones.ts`   | 5-zone HR / power / pace calculators (Coggan % FTP, Friel-style % LTHR).   |
| `workout.ts` | Flatten the step tree, total duration, estimated planned TSS (Σ IF²·hrs·100). |
| `trends.ts`  | CTL / ATL / TSB exponentially-weighted load series for the PMC chart.     |

### Styling — NativeWind + one token file

`src/theme/tokens.ts` is the **single source of truth** for palette, spacing, radius and sport
colors. `tailwind.config.js` imports it (via `jiti`, so the config stays plain Node) and
exposes it as utility classes (`bg-brand`, `text-muted`, `p-lg`, `dark:bg-surface-dark`). Raw
values are used directly only where classes can't reach — `react-native-calendars` theme
objects, SVG fills, icon colors.

Dark mode is automatic (NativeWind `media` strategy + `userInterfaceStyle: automatic`); every
surface has a `dark:` variant.

### Forms — react-hook-form + zod

Top-level form fields (workout title/sport, plan name/phase) use RHF with a `zodResolver`. The
workout **step tree** is managed as local `useState<Step[]>` — RHF field arrays don't nest
well, and the tree needs custom add/remove/repeat operations anyway. Metrics recompute live
via `computeWorkoutMetrics`.

---

## Project layout

```
src/
  app/            Expo Router routes (see tree above)
  components/
    ui/           Primitives: Screen, Text, Card, Button, Badge, Segmented
    builder/      Workout-builder pieces: StepRow, RepeatBlock
    *.tsx         Feature components: WeekStrip, WorkoutCard, StepTimeline, ZoneTable, SportGlyph
  domain/         Pure calculation modules (zones, workout metrics, trends)
  lib/            date / format / id helpers
  services/       api.ts (RestApi + MockApi), session.ts / auth.ts, config.ts, seed.ts
  store/          useAppStore.ts (Zustand: session + data) + selector hooks
  theme/          tokens.ts (design tokens), sport.ts (labels/icons/colors)
  types/          domain.ts
```

---

## Status

| Screen                | State                                                              |
| --------------------- | ----------------------------------------------------------------- |
| Auth (login/signup)   | ✅ Wired to the backend; JWT + gate + 401 handling               |
| Calendar / Home       | ✅ Complete — week strip, day list, month grid, FAB               |
| Workout Builder       | ✅ Complete — nested repeats, live duration/TSS, date or library  |
| Workout Detail        | ✅ Complete — step timeline, complete/skip/reset, edit, delete    |
| Athlete Profile/Zones | ✅ Functional — edit thresholds, auto-calc HR/power/pace zones    |
| Plan Overview         | 🟡 Functional list + race list; wizard is basic                  |
| Plan Detail           | 🟡 Mini calendar + workout list; editing is `// TODO`            |
| Library               | 🟡 Grouped templates + "add to today"; filters/date-pick `// TODO` |
| Fitness Trends        | 🟡 SVG PMC chart placeholder; victory-native swap `// TODO`      |

Search `// TODO: implement` for the remaining work.
