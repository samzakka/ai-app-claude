create extension if not exists pgcrypto;

create table if not exists public.client_workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  workout_date date not null,
  workout_day text not null,
  exercise_key text not null,
  exercise_order integer not null default 0,
  exercise_name text not null,
  target_sets text,
  target_reps text,
  prescribed_notes text,
  selected_substitution text,
  completed boolean not null default false,
  completed_at timestamptz,
  client_notes text,
  difficulty_rpe integer check (difficulty_rpe between 1 and 10),
  logged_weight text,
  logged_reps text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id, workout_date, exercise_key)
);

create index if not exists client_workout_exercise_logs_client_date_idx
  on public.client_workout_exercise_logs (client_id, workout_date desc);

create index if not exists client_workout_exercise_logs_client_completed_idx
  on public.client_workout_exercise_logs (client_id, completed, workout_date desc);

create index if not exists client_workout_exercise_logs_client_exercise_idx
  on public.client_workout_exercise_logs (client_id, exercise_key, workout_date desc);
