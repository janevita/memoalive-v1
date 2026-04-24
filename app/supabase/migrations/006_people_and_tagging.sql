-- ─────────────────────────────────────────────────────────────────────────────
-- Profile enrichment, group people directory, and memory tagging
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enrich registered-user profiles
alter table profiles
  add column if not exists nickname     text,
  add column if not exists relationship text,   -- e.g. 'Mother', 'Uncle', 'Friend'
  add column if not exists birth_year   int,
  add column if not exists hometown     text,
  -- face_refs: [{url, label, uploaded_at}] — reference photos for AI recognition
  add column if not exists face_refs    jsonb not null default '[]';

-- 2. Group people — family members or friends who may not have an account
--    Allows tagging "Grandma Rosa" even if she never signs up.
create table group_people (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references groups(id) on delete cascade,
  created_by   uuid not null references profiles(id) on delete set null,
  -- Identity
  name         text not null,
  nickname     text,
  relationship text,
  birth_year   int,
  hometown     text,
  bio          text,
  avatar_url   text,
  -- AI face recognition: array of {url, label, uploaded_at}
  face_refs    jsonb not null default '[]',
  -- Optional link — if this person later creates an account we can merge them
  profile_id   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger group_people_updated_at
  before update on group_people
  for each row execute procedure set_updated_at();

create index group_people_group_id_idx on group_people(group_id);

-- 3. Memory tags — who appears in a memory
--    Covers registered users (profile_id) and non-registered people (group_person_id)
create table memory_tags (
  id              uuid primary key default uuid_generate_v4(),
  memory_id       uuid not null references memories(id) on delete cascade,
  -- Exactly one of these must be set
  profile_id      uuid references profiles(id) on delete cascade,
  group_person_id uuid references group_people(id) on delete cascade,
  tagged_by       uuid not null references profiles(id) on delete set null,
  is_ai_suggested boolean not null default false,
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now(),
  constraint memory_tags_one_subject check (
    (profile_id is not null)::int + (group_person_id is not null)::int = 1
  )
);

create index memory_tags_memory_id_idx on memory_tags(memory_id);
create index memory_tags_profile_id_idx on memory_tags(profile_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table group_people  enable row level security;
alter table memory_tags   enable row level security;

-- group_people: visible to group members
create policy "group_people_select" on group_people for select
  using (is_group_member(group_id));

create policy "group_people_insert" on group_people for insert
  with check (created_by = auth.uid() and is_group_member(group_id));

create policy "group_people_update" on group_people for update
  using (created_by = auth.uid() or is_group_admin(group_id));

create policy "group_people_delete" on group_people for delete
  using (created_by = auth.uid() or is_group_admin(group_id));

-- memory_tags: group members can see tags; anyone who can see the memory can tag
create policy "memory_tags_select" on memory_tags for select
  using (
    exists (
      select 1 from memories m where m.id = memory_tags.memory_id
      and (is_group_member(m.group_id) or m.visibility = 'public')
    )
  );

create policy "memory_tags_insert" on memory_tags for insert
  with check (
    tagged_by = auth.uid()
    and exists (
      select 1 from memories m where m.id = memory_tags.memory_id
      and is_group_member(m.group_id)
    )
  );

create policy "memory_tags_delete" on memory_tags for delete
  using (tagged_by = auth.uid() or is_group_admin(
    (select group_id from memories where id = memory_tags.memory_id)
  ));
