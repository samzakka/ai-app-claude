create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  coach_id uuid,
  client_id uuid not null references public.clients(id) on delete cascade,
  sender text not null check (sender in ('coach', 'client')),
  message_type text not null default 'text',
  content text not null,
  media_url text,
  media_duration_seconds integer,
  read boolean not null default false,
  read_at timestamptz,
  was_ai_drafted boolean not null default false
);

create index if not exists messages_client_created_at_idx
  on public.messages (client_id, created_at asc);
