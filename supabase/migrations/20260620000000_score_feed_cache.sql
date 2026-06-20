create table if not exists public.score_feed_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.score_feed_cache enable row level security;

revoke all on public.score_feed_cache from anon, authenticated;
