# Life Tracker — project guide

Personal life-tracker / dashboard. Multi-user, all real data in Supabase. Live at
**dashboard-app-nine-bice.vercel.app**.

## Stack
- **React 18 + Vite** SPA (no SSR). Plain JSX, no TypeScript.
- **Tailwind via CDN** (configured inline in `index.html`) — there is no Tailwind build/PostCSS step.
- **Supabase** for auth (email/password) + Postgres data, via `@supabase/supabase-js`.
- **react-router-dom v6** for routing.
- Deployed on **Vercel** (auto-deploy from GitHub `main`).

> History note: this repo started as a static HTML "Pulse" dashboard. It was rebuilt
> into this React+Vite+Supabase app starting at commit "Phase 0".

## Layout
```
index.html              Vite entry; Tailwind CDN + Inter font
src/main.jsx            Router + AuthProvider bootstrap
src/App.jsx             Auth gate + routes + layout (Sidebar / MobileTopBar / BottomNav)
src/lib/supabase.js     Supabase client (reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
src/lib/nutrition.js    Calorie/macro target math (Mifflin-St Jeor, lean-mass protein)
src/lib/ovr.js          OVR scoring engine + color tiers
src/auth/               AuthProvider (session context) + Login (sign up / sign in)
src/components/Nav.jsx  Sidebar (desktop), BottomNav (mobile, 5 items), MobileTopBar (hamburger drawer = all 8)
src/components/ui.jsx   Shared primitives (Card, Button, Input, ProgressBar, date/format helpers)
src/pages/              Home, Workout, Nutrition, Sleep, Water, Finance, Calendar, Goals
supabase/               One SQL migration file per phase (run manually in Supabase SQL Editor)
```

## Sections (8)
1. **Workout** — saved routines (name + exercise list), per-day session with set/rep logging,
   cardio, daily steps. Weekly progress bars: workouts-this-week vs goal, cardio-this-week vs goal.
   Today's routine is persisted on `workout_sessions.routine_id`; completion = all routine
   exercises have ≥1 set that day.
2. **Nutrition** — profile (height/weight/age/gender/**body fat %**, goal weight, goal body fat %,
   activity). Direction (cut/maintain/bulk) is **derived** from current vs goal weight (±2 lb dead-band).
   Protein from lean body mass. Log meals vs targets.
3. **Sleep** — bedtime/wake per night (past-midnight wrap handled), weekly average vs sleep goal.
4. **Water** — daily oz goal, tap-to-add running total per day.
5. **Finance** — monthly budget, income/expense by category, totals + remaining + breakdown.
6. **Calendar** — month grid, events (date/time/title/reminder/done). Browser notifications fire
   only while a tab is open (no push server).
7. **Goals** — title/detail/target date + 0–100% progress.
8. **Home / OVR** — see below.

## OVR (Overall Life Rating)
`src/lib/ovr.js`. Score 0–99, weighted:
workout 20 · nutrition 20 · sleep 15 · finance 15 · water 10 · goals 10 · calendar 10.
- **Rolling last 7 days** for workout/nutrition/sleep/water consistency; finance = current month;
  goals = current avg progress.
- **Only active sections count.** A section not yet set up is excluded and weights renormalize
  (an empty section never lowers the OVR).
- Color tiers: 0–59 Bronze, 60–74 Silver, 75–84 Gold, 85–94 Diamond, 95–99 Elite.

## Conventions
- **Dates:** always stamp the **local** date on inserts via `todayStr()` (see `ui.jsx`). Do NOT rely
  on the DB `current_date` default — it's UTC and caused a meal/cardio "today" mismatch bug.
- **RLS:** every table has `user_id uuid default auth.uid()` + a `for all to authenticated`
  policy `using/with check (user_id = auth.uid())`. New tables must follow this.
- **Cross-cutting settings** (sleep goal, water goal, monthly budget) live on `user_settings`.
  Workout goals live on `workout_settings`.
- New DB changes go in a new `supabase/phaseN_*.sql` file; the user runs it manually in the
  Supabase SQL Editor. Prefer explicit `alter table ... enable row level security` (not a DO block)
  so Supabase's linter doesn't warn.

## Build / deploy
- `npm install`, `npm run dev` (localhost:5173), `npm run build` (verify before pushing).
- Pushing to `main` auto-deploys via Vercel.
- **Env vars must exist at build time on Vercel** (project `dashboard-app-nine-bice`):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Missing them = blank page (the client throws).
  `.env.local` holds them for local dev and is gitignored.
- There is a duplicate Vercel project (`dashboard`, CLI-created) — ignore it; the GitHub-connected
  `dashboard-app-nine-bice` is the real one.
