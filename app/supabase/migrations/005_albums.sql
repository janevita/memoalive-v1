-- ─────────────────────────────────────────────────────────────────────────────
-- Albums — a collection layer inside a group
-- Hierarchy: Group → Album → Memory
-- ─────────────────────────────────────────────────────────────────────────────

create table albums (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references groups(id) on delete cascade,
  title        text not null,
  description  text,
  cover_url    text,
  created_by   uuid not null references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger albums_updated_at
  before update on albums
  for each row execute procedure set_updated_at();

create index albums_group_id_idx on albums(group_id);

-- Link memories to albums (nullable — a memory can belong to no album)
alter table memories
  add column if not exists album_id uuid references albums(id) on delete set null;

create index memories_album_id_idx on memories(album_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table albums enable row level security;

create policy "albums_select" on albums for select
  using (is_group_member(group_id));

create policy "albums_insert" on albums for insert
  with check (
    created_by = auth.uid()
    and is_group_member(group_id)
  );

create policy "albums_update" on albums for update
  using (
    created_by = auth.uid()
    or is_group_admin(group_id)
  );

create policy "albums_delete" on albums for delete
  using (
    created_by = auth.uid()
    or is_group_admin(group_id)
  );
