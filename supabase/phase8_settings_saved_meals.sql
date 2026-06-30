-- Phase 8: Settings (OVR overhaul + category toggles) and saved meals
-- Run in Supabase → SQL Editor → New query → Run. Run once.
-- (Requires user_settings from phase3_sleep.sql.)

-- ---------------------------------------------------------------------------
-- Persistent OVR.
-- Everyone starts at 50; it drifts up on good days and down on bad days.
-- ovr_date tracks the last day a drift was applied (one nudge per day).
-- ovr_categories is a per-category on/off map, e.g. {"finance": false}.
-- A category absent from the map counts as enabled (default on).
-- ---------------------------------------------------------------------------
alter table user_settings
  add column if not exists ovr            numeric not null default 50,
  add column if not exists ovr_date       date,
  add column if not exists ovr_categories jsonb   not null default '{}'::jsonb;

-- Reusable macro presets the user can quick-add to today's meals.
create table if not exists saved_meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  calories   integer not null check (calories >= 0),
  protein_g  numeric not null default 0,
  carbs_g    numeric not null default 0,
  fat_g      numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table saved_meals enable row level security;
create policy "own rows" on saved_meals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
