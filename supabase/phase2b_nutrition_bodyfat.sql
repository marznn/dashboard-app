-- Phase 2b: add body-fat % and goal weight / goal body-fat to the profile.
-- Run in Supabase → SQL Editor. Safe to run once; columns are nullable so any
-- existing profile row stays valid. The old goal column is now set
-- automatically (derived from current vs goal weight).

alter table nutrition_profile
  add column if not exists body_fat_pct    numeric,
  add column if not exists goal_weight_lb  numeric,
  add column if not exists goal_bodyfat_pct numeric;
