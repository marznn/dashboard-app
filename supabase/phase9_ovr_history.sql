-- Phase 9: OVR history (for the Progress page's "OVR over time" chart)
-- Run in Supabase → SQL Editor → New query → Run. Run once.
-- One snapshot per user per day; written by the dashboard when the daily
-- OVR drift is applied. Backfills going forward (history starts now).

create table if not exists ovr_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  ovr        numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table ovr_history enable row level security;
create policy "own rows" on ovr_history for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
