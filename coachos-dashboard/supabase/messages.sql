create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_type text not null check (sender_type in ('coach', 'client')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists messages_client_created_at_idx
  on public.messages (client_id, created_at asc);
