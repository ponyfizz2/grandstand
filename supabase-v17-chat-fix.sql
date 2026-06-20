-- Grandstand v17 chat persistence and identity migration.
-- Run once in Supabase Dashboard -> SQL Editor.

alter table public.chat_messages add column if not exists author_name text;
alter table public.chat_messages add column if not exists author_avatar_url text;
alter table public.chat_messages add column if not exists author_avatar_type text;
alter table public.chat_messages add column if not exists author_avatar_team text;
alter table public.chat_messages add column if not exists author_favorite_team text;

alter table public.profiles enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Active chat messages are public" on public.chat_messages;
create policy "Active chat messages are public"
  on public.chat_messages for select
  using (is_deleted = false);

drop policy if exists "Authenticated users can post messages" on public.chat_messages;
create policy "Authenticated users can post messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create index if not exists chat_messages_game_id_idx
  on public.chat_messages(game_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;
