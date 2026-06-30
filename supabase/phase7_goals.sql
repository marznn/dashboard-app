-- Phase 7: Goals
-- Run in Supabase → SQL Editor. Run once.

create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  detail      text,
  target_date date,
  progress    integer not null default 0 check (progress between 0 and 100),
  created_at  timestamptz not null default now()
);

alter table goals enable row level security;
create policy "own rows" on goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
