-- Phase 2: Nutrition Tracker
-- Run in Supabase → SQL Editor → New query → Run.
-- (RLS is enabled explicitly below, so this should not show the RLS warning.
--  Run it once.)

-- One nutrition profile per user (drives the calorie + macro targets)
create table if not exists nutrition_profile (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  height_in  numeric not null,   -- total height in inches
  weight_lb  numeric not null,
  age        integer not null,
  gender     text not null check (gender in ('male','female')),
  goal       text not null check (goal in ('lose','maintain','bulk')),
  activity   text not null check (activity in ('sedentary','light','moderate','active','very_active')),
  updated_at timestamptz not null default now()
);

-- Logged meals
create table if not exists meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null default current_date,
  name       text not null,
  calories   integer not null check (calories >= 0),
  protein_g  numeric not null default 0,
  carbs_g    numeric not null default 0,
  fat_g      numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table nutrition_profile enable row level security;
create policy "own rows" on nutrition_profile for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table meals enable row level security;
create policy "own rows" on meals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
