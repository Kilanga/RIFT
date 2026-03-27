-- RIFT — Table des achats vérifiés côté serveur
-- Peuplée uniquement par le webhook Stripe (jamais par le client).

create extension if not exists pgcrypto;

create table if not exists public.device_purchases (
  id                       uuid        primary key default gen_random_uuid(),
  device_id                text        not null,
  product_id               text        not null,
  stripe_payment_intent_id text        not null unique,
  created_at               timestamptz not null default now(),

  constraint device_purchases_product_chk
    check (product_id in ('rift-premium', 'rift-theme-blood', 'rift-theme-ice', 'rift-theme-void')),
  constraint device_purchases_device_len_chk
    check (length(device_id) between 8 and 64)
);

create index if not exists idx_device_purchases_device_id
  on public.device_purchases (device_id);

-- RLS : lecture publique par device_id (le client ne peut lire que ce qu'il connaît)
-- L'écriture est réservée au service role (webhook).
alter table public.device_purchases enable row level security;

create policy device_purchases_select
  on public.device_purchases
  for select
  using (true);   -- filtrage par device_id fait côté client / Edge Function

-- Aucune politique insert/update/delete pour anon — seul le service role peut écrire.
