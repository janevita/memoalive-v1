-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL CATCH-UP — applies migrations 002 through 008 in order.
-- Every statement is guarded so re-running is safe.
-- Paste the entire file into the Supabase SQL Editor and click Run.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────────────
-- PRE-FLIGHT — rename groups → events, group_members → event_participants
-- Done first so every subsequent block uses the final table names.
-- Safe to run if the rename already happened.
-- ──────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'groups'
  ) then
    alter table public.groups rename to events;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'group_members'
  ) then
    alter table public.group_members rename to event_participants;
  end if;
end $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 002 — Fix RLS recursion: security-definer helpers + rebuild policies
-- ──────────────────────────────────────────────────────────────────────────────

-- Primary helpers (use final table names)
create or replace function public.is_event_participant(event_uuid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from event_participants
    where group_id = event_uuid and user_id = auth.uid()
  );
$$;

create or replace function public.is_event_admin(event_uuid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from event_participants
    where group_id = event_uuid and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- Legacy aliases so older policies that call is_group_member still work
create or replace function public.is_group_member(group_uuid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select public.is_event_participant(group_uuid);
$$;

create or replace function public.is_group_admin(group_uuid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select public.is_event_admin(group_uuid);
$$;

-- event_participants policies
drop policy if exists "group_members_select" on public.event_participants;
drop policy if exists "group_members_insert" on public.event_participants;
drop policy if exists "group_members_delete" on public.event_participants;
drop policy if exists "event_participants_select" on public.event_participants;
drop policy if exists "event_participants_insert" on public.event_participants;
drop policy if exists "event_participants_delete" on public.event_participants;

create policy "event_participants_select" on public.event_participants for select
  using (public.is_event_participant(group_id));

create policy "event_participants_insert" on public.event_participants for insert
  with check (public.is_event_admin(group_id) or user_id = auth.uid());

create policy "event_participants_delete" on public.event_participants for delete
  using (user_id = auth.uid() or public.is_event_admin(group_id));

-- events policies
drop policy if exists "groups_select"  on public.events;
drop policy if exists "groups_update"  on public.events;
drop policy if exists "events_select"  on public.events;
drop policy if exists "events_update"  on public.events;

create policy "events_select" on public.events for select
  using (public.is_event_participant(id));

create policy "events_update" on public.events for update
  using (public.is_event_admin(id));

-- memories policies
drop policy if exists "memories_select" on public.memories;
drop policy if exists "memories_insert" on public.memories;
drop policy if exists "memories_delete" on public.memories;

create policy "memories_select" on public.memories for select
  using (public.is_event_participant(group_id));

create policy "memories_insert" on public.memories for insert
  with check (author_id = auth.uid() and public.is_event_participant(group_id));

create policy "memories_delete" on public.memories for delete
  using (author_id = auth.uid() or public.is_event_admin(group_id));


-- ──────────────────────────────────────────────────────────────────────────────
-- 003 — Storage buckets
-- ──────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-media', 'memory-media', true, 52428800,
  array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'memory_media_insert'
  ) then
    execute $p$ create policy "memory_media_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'memory-media'); $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'memory_media_select'
  ) then
    execute $p$ create policy "memory_media_select" on storage.objects
      for select using (bucket_id = 'memory-media'); $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'memory_media_delete'
  ) then
    execute $p$ create policy "memory_media_delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'memory-media' and auth.uid()::text = (storage.foldername(name))[1]); $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'avatars_insert'
  ) then
    execute $p$ create policy "avatars_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars'); $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'avatars_select'
  ) then
    execute $p$ create policy "avatars_select" on storage.objects
      for select using (bucket_id = 'avatars'); $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'avatars_update'
  ) then
    execute $p$ create policy "avatars_update" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]); $p$;
  end if;
end $$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 004 — Memory visibility column + public-join helper
-- ──────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'memory_visibility'
  ) then
    create type memory_visibility as enum ('group', 'public');
  end if;
end $$;

alter table public.memories
  add column if not exists visibility memory_visibility not null default 'group';

-- Rebuild memories_select to include visibility
drop policy if exists "memories_select" on public.memories;

create policy "memories_select" on public.memories for select
  using (
    visibility = 'public'
    or public.is_event_participant(group_id)
  );

drop function if exists public.get_group_preview(text);
drop function if exists public.get_event_preview(text);

create or replace function public.get_event_preview(invite_code_input text)
returns table (id uuid, name text, description text, member_count bigint)
language sql security definer stable
set search_path = public as $$
  select e.id, e.name, e.description,
    (select count(*) from event_participants ep where ep.group_id = e.id)::bigint
  from events e
  where e.invite_code = invite_code_input;
$$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 005 — Albums
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.albums (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references public.events(id) on delete cascade,
  title        text not null,
  description  text,
  cover_url    text,
  created_by   uuid not null references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'albums_updated_at'
  ) then
    create trigger albums_updated_at
      before update on public.albums
      for each row execute procedure set_updated_at();
  end if;
end $$;

create index if not exists albums_group_id_idx on public.albums(group_id);

alter table public.memories
  add column if not exists album_id uuid references public.albums(id) on delete set null;

create index if not exists memories_album_id_idx on public.memories(album_id);

alter table public.albums enable row level security;

drop policy if exists "albums_select" on public.albums;
drop policy if exists "albums_insert" on public.albums;
drop policy if exists "albums_update" on public.albums;
drop policy if exists "albums_delete" on public.albums;

create policy "albums_select" on public.albums for select
  using (public.is_event_participant(group_id));

create policy "albums_insert" on public.albums for insert
  with check (created_by = auth.uid() and public.is_event_participant(group_id));

create policy "albums_update" on public.albums for update
  using (created_by = auth.uid() or public.is_event_admin(group_id));

create policy "albums_delete" on public.albums for delete
  using (created_by = auth.uid() or public.is_event_admin(group_id));


-- ──────────────────────────────────────────────────────────────────────────────
-- 006 — Profile enrichment, group people, memory tagging
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists nickname     text,
  add column if not exists relationship text,
  add column if not exists birth_year   int,
  add column if not exists hometown     text,
  add column if not exists face_refs    jsonb not null default '[]';

create table if not exists public.group_people (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references public.events(id) on delete cascade,
  created_by   uuid not null references public.profiles(id) on delete set null,
  name         text not null,
  nickname     text,
  relationship text,
  birth_year   int,
  hometown     text,
  bio          text,
  avatar_url   text,
  face_refs    jsonb not null default '[]',
  profile_id   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'group_people_updated_at'
  ) then
    create trigger group_people_updated_at
      before update on public.group_people
      for each row execute procedure set_updated_at();
  end if;
end $$;

create index if not exists group_people_group_id_idx on public.group_people(group_id);

create table if not exists public.memory_tags (
  id              uuid primary key default uuid_generate_v4(),
  memory_id       uuid not null references public.memories(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete cascade,
  group_person_id uuid references public.group_people(id) on delete cascade,
  tagged_by       uuid not null references public.profiles(id) on delete set null,
  is_ai_suggested boolean not null default false,
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now(),
  constraint memory_tags_one_subject check (
    (profile_id is not null)::int + (group_person_id is not null)::int = 1
  )
);

create index if not exists memory_tags_memory_id_idx  on public.memory_tags(memory_id);
create index if not exists memory_tags_profile_id_idx on public.memory_tags(profile_id);

alter table public.group_people enable row level security;
alter table public.memory_tags   enable row level security;

drop policy if exists "group_people_select" on public.group_people;
drop policy if exists "group_people_insert" on public.group_people;
drop policy if exists "group_people_update" on public.group_people;
drop policy if exists "group_people_delete" on public.group_people;

create policy "group_people_select" on public.group_people for select
  using (public.is_event_participant(group_id));

create policy "group_people_insert" on public.group_people for insert
  with check (created_by = auth.uid() and public.is_event_participant(group_id));

create policy "group_people_update" on public.group_people for update
  using (created_by = auth.uid() or public.is_event_admin(group_id));

create policy "group_people_delete" on public.group_people for delete
  using (created_by = auth.uid() or public.is_event_admin(group_id));

drop policy if exists "memory_tags_select" on public.memory_tags;
drop policy if exists "memory_tags_insert" on public.memory_tags;
drop policy if exists "memory_tags_delete" on public.memory_tags;

create policy "memory_tags_select" on public.memory_tags for select
  using (
    exists (
      select 1 from public.memories m where m.id = memory_tags.memory_id
        and (public.is_event_participant(m.group_id) or m.visibility = 'public')
    )
  );

create policy "memory_tags_insert" on public.memory_tags for insert
  with check (
    tagged_by = auth.uid()
    and exists (
      select 1 from public.memories m where m.id = memory_tags.memory_id
        and public.is_event_participant(m.group_id)
    )
  );

create policy "memory_tags_delete" on public.memory_tags for delete
  using (tagged_by = auth.uid() or public.is_event_admin(
    (select group_id from public.memories where id = memory_tags.memory_id)
  ));


-- ──────────────────────────────────────────────────────────────────────────────
-- 007 — Rebuild events / event_participants policies (idempotent)
-- The rename already happened in the PRE-FLIGHT block above.
-- ──────────────────────────────────────────────────────────────────────────────

-- Ensure RLS is on (safe if already enabled)
alter table public.events           enable row level security;
alter table public.event_participants enable row level security;

-- Drop and recreate all policies cleanly
drop policy if exists "groups_select"              on public.events;
drop policy if exists "groups_insert"              on public.events;
drop policy if exists "groups_update"              on public.events;
drop policy if exists "groups_delete"              on public.events;
drop policy if exists "events_select"              on public.events;
drop policy if exists "events_insert"              on public.events;
drop policy if exists "events_update"              on public.events;
drop policy if exists "events_delete"              on public.events;

drop policy if exists "group_members_select"       on public.event_participants;
drop policy if exists "group_members_insert"       on public.event_participants;
drop policy if exists "group_members_update"       on public.event_participants;
drop policy if exists "group_members_delete"       on public.event_participants;
drop policy if exists "event_participants_select"  on public.event_participants;
drop policy if exists "event_participants_insert"  on public.event_participants;
drop policy if exists "event_participants_update"  on public.event_participants;
drop policy if exists "event_participants_delete"  on public.event_participants;

create policy "events_select" on public.events for select
  using (public.is_event_participant(id));

create policy "events_insert" on public.events for insert
  with check (auth.uid() is not null);

create policy "events_update" on public.events for update
  using (public.is_event_admin(id));

create policy "events_delete" on public.events for delete
  using (public.is_event_admin(id));

create policy "event_participants_select" on public.event_participants for select
  using (public.is_event_participant(group_id));

create policy "event_participants_insert" on public.event_participants for insert
  with check (public.is_event_admin(group_id) or user_id = auth.uid());

create policy "event_participants_update" on public.event_participants for update
  using (user_id = auth.uid() or public.is_event_admin(group_id));

create policy "event_participants_delete" on public.event_participants for delete
  using (user_id = auth.uid() or public.is_event_admin(group_id));

-- Final memories policies
drop policy if exists "memories_select" on public.memories;
drop policy if exists "memories_insert" on public.memories;
drop policy if exists "memories_delete" on public.memories;

create policy "memories_select" on public.memories for select
  using (visibility = 'public' or public.is_event_participant(group_id));

create policy "memories_insert" on public.memories for insert
  with check (author_id = auth.uid() and public.is_event_participant(group_id));

create policy "memories_delete" on public.memories for delete
  using (author_id = auth.uid() or public.is_event_admin(group_id));


-- ──────────────────────────────────────────────────────────────────────────────
-- 008 — Scrapbooks
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.scrapbooks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  cover_url   text,
  template    text not null default 'vintage-kraft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Add template column if the table already existed without it
alter table public.scrapbooks
  add column if not exists template text not null default 'vintage-kraft';

alter table public.scrapbooks enable row level security;

drop policy if exists "scrapbooks_owner_all" on public.scrapbooks;

create policy "scrapbooks_owner_all" on public.scrapbooks for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table if not exists public.scrapbook_items (
  id                uuid primary key default gen_random_uuid(),
  scrapbook_id      uuid not null references public.scrapbooks(id) on delete cascade,
  url               text not null,
  caption           text,
  sort_order        integer not null default 0,
  source_memory_id  uuid references public.memories(id) on delete set null,
  source_event_id   uuid references public.events(id)   on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.scrapbook_items enable row level security;

drop policy if exists "scrapbook_items_owner_all" on public.scrapbook_items;

create policy "scrapbook_items_owner_all" on public.scrapbook_items for all
  using  (exists (
    select 1 from public.scrapbooks sb
    where sb.id = scrapbook_id and sb.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.scrapbooks sb
    where sb.id = scrapbook_id and sb.owner_id = auth.uid()
  ));

create or replace function public.touch_scrapbook_updated_at()
returns trigger language plpgsql as $$
begin
  update public.scrapbooks set updated_at = now() where id = new.scrapbook_id;
  return new;
end;
$$;

drop trigger if exists trg_scrapbook_items_touch_parent on public.scrapbook_items;

create trigger trg_scrapbook_items_touch_parent
  after insert or delete or update on public.scrapbook_items
  for each row execute function public.touch_scrapbook_updated_at();

create index if not exists idx_scrapbooks_owner_id
  on public.scrapbooks(owner_id);

create index if not exists idx_scrapbook_items_scrapbook
  on public.scrapbook_items(scrapbook_id, sort_order);


-- ──────────────────────────────────────────────────────────────────────────────
-- 009 — Scrapbook canvas: pages, elements, comments, sharing
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.scrapbooks
  add column if not exists share_token uuid unique default gen_random_uuid(),
  add column if not exists is_shared   boolean not null default false;

update public.scrapbooks set share_token = gen_random_uuid() where share_token is null;

create index if not exists idx_scrapbooks_share_token on public.scrapbooks(share_token);

-- scrapbook_pages
create table if not exists public.scrapbook_pages (
  id           uuid primary key default gen_random_uuid(),
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  page_number  int  not null default 1,
  created_at   timestamptz not null default now(),
  unique (scrapbook_id, page_number)
);

alter table public.scrapbook_pages enable row level security;

drop policy if exists "scrapbook_pages_owner_all"     on public.scrapbook_pages;
drop policy if exists "scrapbook_pages_shared_select" on public.scrapbook_pages;

create policy "scrapbook_pages_owner_all" on public.scrapbook_pages
  for all
  using  (exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = auth.uid()));

create policy "scrapbook_pages_shared_select" on public.scrapbook_pages
  for select
  using (exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.is_shared = true));

create index if not exists idx_scrapbook_pages_sb on public.scrapbook_pages(scrapbook_id, page_number);

-- scrapbook_elements (all coordinates in 1200×848 canvas px)
create table if not exists public.scrapbook_elements (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.scrapbook_pages(id) on delete cascade,
  type       text not null check (type in ('photo','text','sticker')),
  content    text not null,
  x          float not null default 60,
  y          float not null default 60,
  width      float not null default 400,
  height     float not null default 300,
  rotation   float not null default 0,
  z_index    int   not null default 0,
  style      jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.scrapbook_elements enable row level security;

drop policy if exists "scrapbook_elements_owner_all"     on public.scrapbook_elements;
drop policy if exists "scrapbook_elements_shared_select" on public.scrapbook_elements;

create policy "scrapbook_elements_owner_all" on public.scrapbook_elements
  for all
  using (exists (
    select 1 from public.scrapbook_pages sp
    join  public.scrapbooks s on s.id = sp.scrapbook_id
    where sp.id = page_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.scrapbook_pages sp
    join  public.scrapbooks s on s.id = sp.scrapbook_id
    where sp.id = page_id and s.owner_id = auth.uid()
  ));

create policy "scrapbook_elements_shared_select" on public.scrapbook_elements
  for select
  using (exists (
    select 1 from public.scrapbook_pages sp
    join  public.scrapbooks s on s.id = sp.scrapbook_id
    where sp.id = page_id and s.is_shared = true
  ));

create index if not exists idx_scrapbook_elements_page on public.scrapbook_elements(page_id, z_index);

-- scrapbook_comments
create table if not exists public.scrapbook_comments (
  id           uuid primary key default gen_random_uuid(),
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  author_id    uuid references public.profiles(id) on delete set null,
  author_name  text not null default 'Guest',
  content      text not null,
  created_at   timestamptz not null default now()
);

alter table public.scrapbook_comments enable row level security;

drop policy if exists "scrapbook_comments_select" on public.scrapbook_comments;
drop policy if exists "scrapbook_comments_insert" on public.scrapbook_comments;
drop policy if exists "scrapbook_comments_delete" on public.scrapbook_comments;

create policy "scrapbook_comments_select" on public.scrapbook_comments
  for select
  using (exists (
    select 1 from public.scrapbooks s
    where s.id = scrapbook_id
      and (s.owner_id = auth.uid() or s.is_shared = true)
  ));

create policy "scrapbook_comments_insert" on public.scrapbook_comments
  for insert
  with check (
    exists (
      select 1 from public.scrapbooks s
      where s.id = scrapbook_id
        and (s.owner_id = auth.uid() or s.is_shared = true)
    )
    and (author_id is null or author_id = auth.uid())
  );

create policy "scrapbook_comments_delete" on public.scrapbook_comments
  for delete
  using (
    author_id = auth.uid()
    or exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = auth.uid())
  );

create index if not exists idx_scrapbook_comments_sb on public.scrapbook_comments(scrapbook_id, created_at);


-- ──────────────────────────────────────────────────────────────────────────────
-- 010 — Phone photo upload sessions
-- ──────────────────────────────────────────────────────────────────────────────

-- ── upload_sessions ────────────────────────────────────────────────────────────

create table if not exists public.upload_sessions (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  token           text unique not null
                    default substring(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  scrapbook_id    uuid references public.scrapbooks(id) on delete set null,
  scrapbook_title text,
  expires_at      timestamptz not null default now() + interval '1 hour',
  created_at      timestamptz not null default now()
);

alter table public.upload_sessions enable row level security;

drop policy if exists "upload_sessions_owner" on public.upload_sessions;

create policy "upload_sessions_owner" on public.upload_sessions
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists idx_upload_sessions_token
  on public.upload_sessions(token);

create index if not exists idx_upload_sessions_owner
  on public.upload_sessions(owner_id, expires_at);

-- ── upload_session_photos ──────────────────────────────────────────────────────

create table if not exists public.upload_session_photos (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.upload_sessions(id) on delete cascade,
  url        text not null,
  filename   text,
  created_at timestamptz not null default now()
);

alter table public.upload_session_photos enable row level security;

drop policy if exists "upload_session_photos_owner_select" on public.upload_session_photos;
drop policy if exists "upload_session_photos_any_insert"  on public.upload_session_photos;

-- Owner can read their session photos
create policy "upload_session_photos_owner_select" on public.upload_session_photos
  for select
  using (
    exists (
      select 1 from public.upload_sessions s
      where s.id = session_id and s.owner_id = auth.uid()
    )
  );

-- Anyone (incl. anon) can insert photos into a valid (non-expired) session.
-- Security comes from the unguessable token validated server-side in the API route.
create policy "upload_session_photos_any_insert" on public.upload_session_photos
  for insert
  with check (
    exists (
      select 1 from public.upload_sessions s
      where s.id = session_id and s.expires_at > now()
    )
  );

create index if not exists idx_upload_session_photos_session
  on public.upload_session_photos(session_id, created_at);


-- ──────────────────────────────────────────────────────────────────────────────
-- 011 — Journals (life-story book feature)
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.journals (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid not null references auth.users(id) on delete cascade,
  subject_name  text not null,              -- the person this journal is about
  subject_id    uuid,                       -- optional: links to group_people.id
  title         text not null default 'My Life Story',
  cover_color   text not null default '#FF5C1A',
  cover_style   text not null default 'classic',
  year          int  not null default extract(year from now())::int,
  is_public     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.journal_chapters (
  id             uuid primary key default gen_random_uuid(),
  journal_id     uuid not null references public.journals(id) on delete cascade,
  chapter_number int  not null default 1,
  title          text not null default 'Chapter 1',
  created_at     timestamptz not null default now()
);

create table if not exists public.journal_blocks (
  id             uuid primary key default gen_random_uuid(),
  chapter_id     uuid not null references public.journal_chapters(id) on delete cascade,
  block_order    int  not null default 0,
  block_type     text not null default 'paragraph',  -- heading|paragraph|image|quote|divider
  content        text not null default '',
  image_url      text,                               -- for image blocks
  style          jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- RLS
alter table public.journals         enable row level security;
alter table public.journal_chapters enable row level security;
alter table public.journal_blocks   enable row level security;

-- Journals are personal: visible to the creator, or publicly if shared
create policy "journals_select" on public.journals
  for select using (created_by = auth.uid() or is_public = true);

create policy "journals_insert" on public.journals
  for insert with check (created_by = auth.uid());

create policy "journals_update" on public.journals
  for update using (created_by = auth.uid());

create policy "journals_delete" on public.journals
  for delete using (created_by = auth.uid());

create policy "journal_chapters_via_journal" on public.journal_chapters
  for all using (
    exists (
      select 1 from public.journals j
      where j.id = journal_chapters.journal_id
        and (j.created_by = auth.uid() or j.is_public = true)
    )
  );

create policy "journal_blocks_via_chapter" on public.journal_blocks
  for all using (
    exists (
      select 1 from public.journal_chapters jc
      join public.journals j on j.id = jc.journal_id
      where jc.id = journal_blocks.chapter_id
        and (j.created_by = auth.uid() or j.is_public = true)
    )
  );

create index if not exists idx_journals_user on public.journals(created_by);
create index if not exists idx_journals_year on public.journals(created_by, year);
create index if not exists idx_journal_chapters_journal on public.journal_chapters(journal_id);
create index if not exists idx_journal_blocks_chapter on public.journal_blocks(chapter_id, block_order);
