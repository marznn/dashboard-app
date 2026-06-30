-- Phase 6: Calendar
-- Run in Supabase → SQL Editor. Run once.

create table if not exists events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date              date not null,
  time              text,                 -- "14:30", optional (all-day if null)
  title             text not null,
  remind_min_before integer not null default 30,
  done              boolean not null default false,
  notified          boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table events enable row level security;
create policy "own rows" on events for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists events_user_date_idx on events (user_id, date);
