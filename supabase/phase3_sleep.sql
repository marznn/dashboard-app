-- Phase 3: Sleep Tracker
-- Run in Supabase → SQL Editor. Run once.

-- One sleep entry per night (per user/date). minutes is computed client-side
-- from bedtime/wake (handles past-midnight wrap) and stored for easy averaging.
create table if not exists sleep_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null default current_date,
  bedtime    text not null,   -- "23:30"
  wake_time  text not null,   -- "07:15"
  minutes    integer not null check (minutes >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table sleep_logs enable row level security;
create policy "own rows" on sleep_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cross-cutting per-user settings/goals (extended in later phases).
create table if not exists user_settings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade unique,
  sleep_goal_hours numeric not null default 8,
  updated_at       timestamptz not null default now()
);

alter table user_settings enable row level security;
create policy "own rows" on user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
