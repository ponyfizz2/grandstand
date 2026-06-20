-- ═══════════════════════════════════════════════════════════
-- Grandstand — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension (already on by default in Supabase)
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLE: profiles
-- Extends Supabase auth.users with app-specific profile data.
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  username               text unique,
  avatar_url             text,
  display_name           text,
  timezone               text,
  theme                  text default 'dark',
  favorite_team          text,
  avatar_type            text default 'google',
  avatar_team            text,
  -- Array of competition IDs/slugs the user has enabled
  preferred_competitions jsonb    default '[]'::jsonb,
  is_admin               boolean  default false not null,
  updated_at             timestamptz default now()
);

-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, avatar_url, updated_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'avatar_url',
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger if it already exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- TABLE: chat_messages
-- Stores live-game social chat messages.
-- ────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id          uuid        primary key default uuid_generate_v4(),
  -- ESPN event ID (e.g. "401547353") used to scope messages per game
  game_id     text        not null,
  user_id     uuid        references public.profiles(id) on delete set null,
  message     text        not null check (char_length(message) between 1 and 500),
  author_name text,
  author_avatar_url text,
  author_avatar_type text,
  author_avatar_team text,
  author_favorite_team text,
  is_deleted  boolean     default false not null,
  created_at  timestamptz default now() not null
);

-- Index for fast per-game queries
create index if not exists chat_messages_game_id_idx on public.chat_messages(game_id, created_at desc);
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id);
create index if not exists chat_messages_deleted_idx  on public.chat_messages(is_deleted);

-- ────────────────────────────────────────────────────────────
-- TABLE: competitions
-- Dynamically registered ESPN competitions shown in the app.
-- Built-in competitions (NRL, AFL, etc.) are defined in config.js;
-- these are admin-added extras.
-- ────────────────────────────────────────────────────────────
create table if not exists public.competitions (
  id                      uuid    primary key default uuid_generate_v4(),
  label                   text    not null,
  sport_slug              text    not null,   -- e.g. "rugby-league", "baseball"
  league_slug             text    not null,   -- e.g. "3", "mlb", "fifa.world"
  color                   text    default '#6366f1',
  finals_qualifying       integer default 0,
  finals_protected        integer default 0,
  finals_qualifying_label text,
  finals_protected_label  text,
  is_active               boolean default true not null,
  created_at              timestamptz default now()
);

create index if not exists competitions_active_idx on public.competitions(is_active);

-- Backfill-friendly additions for existing projects.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists theme text default 'dark';
alter table public.profiles add column if not exists favorite_team text;
alter table public.profiles add column if not exists avatar_type text default 'google';
alter table public.profiles add column if not exists avatar_team text;
alter table public.chat_messages add column if not exists author_name text;
alter table public.chat_messages add column if not exists author_avatar_url text;
alter table public.chat_messages add column if not exists author_avatar_type text;
alter table public.chat_messages add column if not exists author_avatar_team text;
alter table public.chat_messages add column if not exists author_favorite_team text;

-- ════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════

-- ── profiles ──
alter table public.profiles enable row level security;

-- Anyone (including anonymous) can read profiles (for chat display names)
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Allows profile recovery when the auth trigger was not installed previously.
create policy "Users can create own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ── chat_messages ──
alter table public.chat_messages enable row level security;

-- Anyone can read non-deleted messages
create policy "Active chat messages are public"
  on public.chat_messages for select
  using (is_deleted = false);

-- Admins can read all messages (for moderation)
create policy "Admins can read all messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Authenticated users can insert their own messages
create policy "Authenticated users can post messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

-- Admins can update (soft-delete) any message
create policy "Admins can moderate messages"
  on public.chat_messages for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── competitions ──
alter table public.competitions enable row level security;

-- Anyone can read active competitions
create policy "Active competitions are public"
  on public.competitions for select
  using (is_active = true);

-- Admins can read all competitions
create policy "Admins can read all competitions"
  on public.competitions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Admins can insert/update/delete competitions
create policy "Admins can manage competitions"
  on public.competitions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ════════════════════════════════════════════════════════════
-- REALTIME
-- Enable Realtime on the chat_messages table so Supabase
-- pushes inserts/updates to subscribed clients.
-- ════════════════════════════════════════════════════════════
begin;
  -- Drop existing publication if it exists (safe re-run)
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.chat_messages;
commit;

-- ════════════════════════════════════════════════════════════
-- SEED: Example admin user
-- After deploying, run this to grant yourself admin access.
-- Replace 'your-supabase-user-uuid' with your actual user ID
-- (find it in Supabase Dashboard → Authentication → Users).
-- ════════════════════════════════════════════════════════════

-- UPDATE public.profiles
-- SET is_admin = true, username = 'admin'
-- WHERE id = 'your-supabase-user-uuid';

-- ════════════════════════════════════════════════════════════
-- SEED: Optional starter competitions
-- These are the same as the hardcoded ones in script.js.
-- You can add them here if you want them managed via the DB,
-- or leave them in config.js only.
-- ════════════════════════════════════════════════════════════

-- insert into public.competitions
--   (label, sport_slug, league_slug, color, finals_qualifying, finals_protected,
--    finals_qualifying_label, finals_protected_label)
-- values
--   ('NRL 2025',         'rugby-league',    '3',         '#00843D', 8, 4, 'Finals', 'Top 4'),
--   ('AFL 2025',         'australian-football', 'afl',   '#003087', 8, 4, 'Finals', 'Top 4'),
--   ('Super Rugby 2025', 'rugby',           '242041',    '#1B1464', 8, 4, 'Finals', 'Top 4'),
--   ('FIFA World Cup',   'soccer',          'fifa.world','#264974', 0, 0, null,     null);
