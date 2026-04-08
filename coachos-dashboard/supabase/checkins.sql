create extension if not exists pgcrypto;

create table if not exists public.client_check_in_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  frequency text not null check (frequency in ('weekly', 'bi-weekly', 'custom')),
  custom_interval_weeks integer not null default 3 check (custom_interval_weeks >= 1),
  due_day text not null check (due_day in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  schedule_anchor_date date not null default current_date,
  public_access_token text not null unique,
  field_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id)
);

create index if not exists client_check_in_settings_public_access_token_idx
  on public.client_check_in_settings (public_access_token);

create table if not exists public.client_check_in_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  check_in_settings_id uuid references public.client_check_in_settings(id) on delete set null,
  due_date date,
  submitted_at timestamptz not null default timezone('utc', now()),
  content jsonb not null default '{}'::jsonb,
  field_config_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_check_in_submissions_client_id_submitted_at_idx
  on public.client_check_in_submissions (client_id, submitted_at desc);

create index if not exists client_check_in_submissions_due_date_idx
  on public.client_check_in_submissions (due_date);

-- Optional storage bucket for progress photos.
-- Uncomment if you want the app to create the bucket from SQL rather than the dashboard.
-- insert into storage.buckets (id, name, public)
-- values ('check-in-photos', 'check-in-photos', true)
-- on conflict (id) do nothing;
