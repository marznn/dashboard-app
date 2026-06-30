-- Phase 5: Finance Tracker
-- Run in Supabase → SQL Editor. Run once.
-- (Requires user_settings from phase3_sleep.sql.)

-- Monthly budget lives on the shared user_settings table
alter table user_settings
  add column if not exists monthly_budget numeric not null default 0;

-- Income / expense entries
create table if not exists transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null default current_date,
  type       text not null check (type in ('income','expense')),
  category   text not null,
  amount     numeric not null check (amount >= 0),
  note       text,
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;
create policy "own rows" on transactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
