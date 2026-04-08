create extension if not exists pgcrypto;

create table if not exists public.client_habit_completion_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  habit_key text not null,
  habit_name text not null,
  completed boolean not null default true,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id, date, habit_key)
);

create index if not exists client_habit_completion_logs_client_date_idx
  on public.client_habit_completion_logs (client_id, date desc);

create index if not exists client_habit_completion_logs_client_habit_date_idx
  on public.client_habit_completion_logs (client_id, habit_key, date desc);

create index if not exists client_habit_completion_logs_completed_idx
  on public.client_habit_completion_logs (client_id, completed, date desc);
