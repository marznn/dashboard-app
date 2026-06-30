-- Phase 4: Water Intake
-- Run in Supabase → SQL Editor. Run once.
-- (Requires user_settings from phase3_sleep.sql.)

-- Daily water goal lives on the shared user_settings table
alter table user_settings
  add column if not exists water_goal_oz integer not null default 64;

-- One running total per day per user
create table if not exists water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null default current_date,
  oz         integer not null default 0 check (oz >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table water_logs enable row level security;
create policy "own rows" on water_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
