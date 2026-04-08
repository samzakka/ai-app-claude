create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  full_name text not null,
  email text not null,
  coach_id uuid,
  heat_score text,
  budget_range text,
  timeline text,
  goal text,
  ai_brief jsonb,
  stage text not null default 'new',
  coach_notes text,
  follow_up_date date,
  last_contacted_at timestamptz,
  stage_updated_at timestamptz not null default timezone('utc', now()),
  converted_client_id uuid references public.clients(id) on delete set null,
  converted_at timestamptz
);

alter table if exists public.leads
  add column if not exists stage text not null default 'new';

alter table if exists public.leads
  add column if not exists coach_notes text;

alter table if exists public.leads
  add column if not exists follow_up_date date;

alter table if exists public.leads
  add column if not exists last_contacted_at timestamptz;

alter table if exists public.leads
  add column if not exists stage_updated_at timestamptz not null default timezone('utc', now());

alter table if exists public.leads
  add column if not exists converted_client_id uuid references public.clients(id) on delete set null;

alter table if exists public.leads
  add column if not exists converted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_stage_check'
  ) then
    alter table public.leads
      add constraint leads_stage_check
      check (stage in ('new', 'contacted', 'call_booked', 'proposal_sent', 'won', 'lost'));
  end if;
end $$;

create index if not exists leads_stage_created_at_idx
  on public.leads (stage, created_at desc);

create index if not exists leads_follow_up_date_idx
  on public.leads (follow_up_date);

create index if not exists leads_converted_client_id_idx
  on public.leads (converted_client_id);
