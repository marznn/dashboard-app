-- Phase 1b: workout completion + cardio goal progress
-- Run in Supabase → SQL Editor. Run once.

-- Tie a day's session to the routine the user planned to do, so completion
-- can be measured (and the OVR can read it later). on delete set null keeps
-- the session if the routine is later deleted.
alter table workout_sessions
  add column if not exists routine_id uuid references routines (id) on delete set null;

-- Per-user workout settings (currently just the weekly cardio goal)
create table if not exists workout_settings (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  cardio_weekly_goal_min integer not null default 150,
  updated_at             timestamptz not null default now()
);

alter table workout_settings enable row level security;
create policy "own rows" on workout_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
