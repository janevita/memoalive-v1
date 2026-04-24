-- ─────────────────────────────────────────────────────────────────────────────
-- Memoalive — Initial Schema
-- Run this in the Supabase SQL editor or via `supabase db push`
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- ── Enums ─────────────────────────────────────────────────────────────────────

create type group_role   as enum ('owner', 'admin', 'member');
create type media_type   as enum ('photo', 'video', 'voice', 'text');
create type reaction_type as enum ('heart', 'moved', 'proud', 'funny', 'favourite');
create type genre        as enum (
  'adventure', 'drama', 'comedy', 'romance', 'coming-of-age', 'documentary'
);

-- ── Profiles ──────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with display metadata.

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile on signup via trigger
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- ── Groups ────────────────────────────────────────────────────────────────────

create table groups (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  cover_url    text,
  invite_code  text not null unique default substr(md5(random()::text), 1, 8),
  owner_id     uuid not null references profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger groups_updated_at
  before update on groups
  for each row execute procedure set_updated_at();

create index groups_owner_id_idx on groups(owner_id);
create index groups_invite_code_idx on groups(invite_code);

-- ── Group Members ─────────────────────────────────────────────────────────────

create table group_members (
  user_id    uuid not null references profiles(id) on delete cascade,
  group_id   uuid not null references groups(id) on delete cascade,
  role       group_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (user_id, group_id)
);

create index group_members_group_id_idx on group_members(group_id);
create index group_members_user_id_idx  on group_members(user_id);

-- ── Memories ──────────────────────────────────────────────────────────────────

create table memories (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references groups(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete set null,
  title        text not null,
  content      text,                 -- story body / caption
  genre        genre not null default 'adventure',
  media_type   media_type not null default 'photo',
  location     text,
  taken_at     timestamptz,          -- when the moment happened
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger memories_updated_at
  before update on memories
  for each row execute procedure set_updated_at();

create index memories_group_id_idx   on memories(group_id);
create index memories_author_id_idx  on memories(author_id);
create index memories_taken_at_idx   on memories(taken_at desc);
create index memories_created_at_idx on memories(created_at desc);

-- Full-text search index on title + content
create index memories_search_idx on memories
  using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- ── Media Items ───────────────────────────────────────────────────────────────

create table media_items (
  id               uuid primary key default uuid_generate_v4(),
  memory_id        uuid not null references memories(id) on delete cascade,
  url              text not null,
  thumbnail_url    text,
  type             media_type not null default 'photo',
  caption          text,
  sort_order       integer not null default 0,
  duration_seconds integer,          -- for video/voice
  transcription    text,             -- AI-generated for voice
  created_at       timestamptz not null default now()
);

create index media_items_memory_id_idx on media_items(memory_id, sort_order);

-- ── Cast Members ──────────────────────────────────────────────────────────────
-- People tagged as appearing in a memory

create table cast_members (
  user_id          uuid not null references profiles(id) on delete cascade,
  memory_id        uuid not null references memories(id) on delete cascade,
  tagged_by_user_id uuid not null references profiles(id) on delete set null,
  primary key (user_id, memory_id)
);

create index cast_members_memory_id_idx on cast_members(memory_id);
create index cast_members_user_id_idx   on cast_members(user_id);

-- ── Reactions ─────────────────────────────────────────────────────────────────

create table reactions (
  id          uuid primary key default uuid_generate_v4(),
  memory_id   uuid not null references memories(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  type        reaction_type not null,
  created_at  timestamptz not null default now(),
  unique (memory_id, user_id, type)  -- one of each type per user per memory
);

create index reactions_memory_id_idx on reactions(memory_id);
create index reactions_user_id_idx   on reactions(user_id);

-- ── Comments ──────────────────────────────────────────────────────────────────

create table comments (
  id          uuid primary key default uuid_generate_v4(),
  memory_id   uuid not null references memories(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger comments_updated_at
  before update on comments
  for each row execute procedure set_updated_at();

create index comments_memory_id_idx on comments(memory_id, created_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table profiles      enable row level security;
alter table groups        enable row level security;
alter table group_members enable row level security;
alter table memories      enable row level security;
alter table media_items   enable row level security;
alter table cast_members  enable row level security;
alter table reactions     enable row level security;
alter table comments      enable row level security;

-- profiles: anyone can read; only owner can update
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- groups: visible to members; editable by owner/admin
create policy "groups_select" on groups for select
  using (
    exists (
      select 1 from group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );
create policy "groups_insert" on groups for insert
  with check (owner_id = auth.uid());
create policy "groups_update" on groups for update
  using (
    exists (
      select 1 from group_members
      where group_id = groups.id and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );
create policy "groups_delete" on groups for delete
  using (owner_id = auth.uid());

-- group_members: members can see each other; owners/admins can add/remove
create policy "group_members_select" on group_members for select
  using (
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );
create policy "group_members_insert" on group_members for insert
  with check (
    -- Owner/admin can add members, or user joins via invite (handled in function)
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
        and gm2.role in ('owner', 'admin')
    )
    or user_id = auth.uid()
  );
create policy "group_members_delete" on group_members for delete
  using (
    user_id = auth.uid()  -- leave group
    or exists (           -- owner/admin can remove
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
        and gm2.role in ('owner', 'admin')
    )
  );

-- memories: group members can read; author can edit/delete
create policy "memories_select" on memories for select
  using (
    exists (
      select 1 from group_members
      where group_id = memories.group_id and user_id = auth.uid()
    )
  );
create policy "memories_insert" on memories for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from group_members
      where group_id = memories.group_id and user_id = auth.uid()
    )
  );
create policy "memories_update" on memories for update
  using (author_id = auth.uid());
create policy "memories_delete" on memories for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from group_members
      where group_id = memories.group_id and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- media_items: same as memory visibility
create policy "media_items_select" on media_items for select
  using (
    exists (
      select 1 from memories m
      join group_members gm on gm.group_id = m.group_id
      where m.id = media_items.memory_id and gm.user_id = auth.uid()
    )
  );
create policy "media_items_insert" on media_items for insert
  with check (
    exists (
      select 1 from memories m
      where m.id = media_items.memory_id and m.author_id = auth.uid()
    )
  );
create policy "media_items_delete" on media_items for delete
  using (
    exists (
      select 1 from memories m
      where m.id = media_items.memory_id and m.author_id = auth.uid()
    )
  );

-- reactions: group members can react
create policy "reactions_select" on reactions for select
  using (
    exists (
      select 1 from memories m
      join group_members gm on gm.group_id = m.group_id
      where m.id = reactions.memory_id and gm.user_id = auth.uid()
    )
  );
create policy "reactions_insert" on reactions for insert
  with check (user_id = auth.uid());
create policy "reactions_delete" on reactions for delete
  using (user_id = auth.uid());

-- cast_members
create policy "cast_select" on cast_members for select
  using (
    exists (
      select 1 from memories m
      join group_members gm on gm.group_id = m.group_id
      where m.id = cast_members.memory_id and gm.user_id = auth.uid()
    )
  );
create policy "cast_insert" on cast_members for insert
  with check (tagged_by_user_id = auth.uid());
create policy "cast_delete" on cast_members for delete
  using (user_id = auth.uid() or tagged_by_user_id = auth.uid());

-- comments: group members can comment; author can delete
create policy "comments_select" on comments for select
  using (
    exists (
      select 1 from memories m
      join group_members gm on gm.group_id = m.group_id
      where m.id = comments.memory_id and gm.user_id = auth.uid()
    )
  );
create policy "comments_insert" on comments for insert
  with check (author_id = auth.uid());
create policy "comments_delete" on comments for delete
  using (author_id = auth.uid());

-- ── Storage Buckets ───────────────────────────────────────────────────────────
-- Run these via Supabase dashboard or CLI if needed:
--
-- insert into storage.buckets (id, name, public) values ('memory-media', 'memory-media', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('group-covers', 'group-covers', false);
