-- Phase 1: Workout Tracker
-- Run this in Supabase → SQL Editor → New query → Run.
-- Multi-user: every table is row-level-secured to the logged-in user.

-- 1) Saved workout routines (a name + an ordered list of exercise names)
create table if not exists routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  exercises   jsonb not null default '[]'::jsonb,  -- e.g. ["Bench press","Squat"]
  created_at  timestamptz not null default now()
);

-- 2) A logged workout session on a given day
create table if not exists workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

-- 3) Individual sets (reps + optional weight) logged against a session
create table if not exists workout_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id  uuid not null references workout_sessions (id) on delete cascade,
  exercise    text not null,
  reps        integer not null check (reps >= 0),
  weight      numeric,          -- lbs/kg, optional (cardio/bodyweight may leave null)
  created_at  timestamptz not null default now()
);

-- 4) Cardio entries
create table if not exists cardio_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null default current_date,
  activity     text not null,         -- e.g. "Run", "Cycling"
  duration_min integer not null check (duration_min >= 0),
  distance_mi  numeric,               -- optional
  created_at   timestamptz not null default now()
);

-- 5) Daily step count (one row per day per user)
create table if not exists step_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null default current_date,
  steps       integer not null check (steps >= 0),
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- Row Level Security: each user only sees/edits their own rows
do $$
declare t text;
begin
  foreach t in array array['routines','workout_sessions','workout_sets','cardio_logs','step_logs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
