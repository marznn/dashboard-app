-- Phase 1c: weekly workout goal
-- Run in Supabase → SQL Editor. Run once.

alter table workout_settings
  add column if not exists workout_weekly_goal integer not null default 5;
