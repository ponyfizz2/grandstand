-- Grandstand GitHub Pages migration.
-- Run once in Supabase Dashboard -> SQL Editor before deploying the edge function.

create table if not exists public.score_feed_cache (
  cache_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.score_feed_cache enable row level security;

-- No public policies are required. The live-scores Edge Function accesses this
-- table using the automatically provided service-role key.
