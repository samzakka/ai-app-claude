create extension if not exists pgcrypto;

create table if not exists public.ai_suggestion_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  suggestion_type text not null check (
    suggestion_type in ('coaching_assistant', 'workout_generation', 'weekly_adjustment')
  ),
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_suggestion_history_client_created_at_idx
  on public.ai_suggestion_history (client_id, created_at desc);

create index if not exists ai_suggestion_history_client_type_created_at_idx
  on public.ai_suggestion_history (client_id, suggestion_type, created_at desc);
