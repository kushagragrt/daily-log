-- ============================================================
-- DAILY LOG TRACKER — Supabase schema
-- Run this once in Supabase: Project > SQL Editor > New query > paste > Run
-- ============================================================

-- People using the tracker (simple name + PIN, NOT real auth security)
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

-- Habits each person defines for themselves (e.g. "Read 20 min")
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  color text not null default 'moss',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per habit per day it was checked off
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  log_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- Workouts logged
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  log_date date not null default current_date,
  title text not null,
  duration_min integer,
  notes text,
  created_at timestamptz not null default now()
);

-- Expenses logged
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  log_date date not null default current_date,
  amount numeric(10,2) not null,
  category text not null default 'other',
  note text,
  created_at timestamptz not null default now()
);

-- Journal: one entry per person per day (mood + free text)
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  log_date date not null default current_date,
  mood text,
  entry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- Helpful indexes for the queries the app makes most
create index if not exists idx_habit_logs_user_date on habit_logs(user_id, log_date);
create index if not exists idx_workouts_user_date on workouts(user_id, log_date);
create index if not exists idx_expenses_user_date on expenses(user_id, log_date);
create index if not exists idx_journal_user_date on journal_entries(user_id, log_date);

-- ============================================================
-- Row Level Security
-- We use the anon key from the browser, so RLS must be open
-- (the app enforces "which user" via the PIN-derived user_id,
-- not via Supabase auth). This is fine for a small trusted group,
-- NOT suitable for sensitive data or public deployment.
-- ============================================================
alter table app_users enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table workouts enable row level security;
alter table expenses enable row level security;
alter table journal_entries enable row level security;

create policy "allow all" on app_users for all to anon using (true) with check (true);
create policy "allow all" on habits for all to anon using (true) with check (true);
create policy "allow all" on habit_logs for all to anon using (true) with check (true);
create policy "allow all" on workouts for all to anon using (true) with check (true);
create policy "allow all" on expenses for all to anon using (true) with check (true);
create policy "allow all" on journal_entries for all to anon using (true) with check (true);

-- Explicit grants (required when using anon key without Supabase Auth)
grant select, insert, update, delete on app_users to anon;
grant select, insert, update, delete on habits to anon;
grant select, insert, update, delete on habit_logs to anon;
grant select, insert, update, delete on workouts to anon;
grant select, insert, update, delete on expenses to anon;
grant select, insert, update, delete on journal_entries to anon;
