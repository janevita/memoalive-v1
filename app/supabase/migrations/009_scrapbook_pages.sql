-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009 — Scrapbook canvas: pages, elements, comments, sharing
--
-- Transforms scrapbooks from a simple photo list into a rich A4-landscape
-- canvas editor with draggable/rotatable elements, multi-page support,
-- and link-based sharing with anonymous comments.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Sharing columns on scrapbooks ─────────────────────────────────────────────

alter table public.scrapbooks
  add column if not exists share_token uuid unique default gen_random_uuid(),
  add column if not exists is_shared   boolean not null default false;

-- Backfill any rows that slipped through without a token
update public.scrapbooks set share_token = gen_random_uuid() where share_token is null;

create index if not exists idx_scrapbooks_share_token on public.scrapbooks(share_token);


-- ── scrapbook_pages ───────────────────────────────────────────────────────────

create table if not exists public.scrapbook_pages (
  id           uuid primary key default gen_random_uuid(),
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  page_number  int  not null default 1,
  created_at   timestamptz not null default now(),
  unique (scrapbook_id, page_number)
);

alter table public.scrapbook_pages enable row level security;

-- Owner can do everything
drop policy if exists "scrapbook_pages_owner_all"     on public.scrapbook_pages;
drop policy if exists "scrapbook_pages_shared_select" on public.scrapbook_pages;

create policy "scrapbook_pages_owner_all" on public.scrapbook_pages
  for all
  using  (exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = auth.uid()));

-- Anyone (including anon) can read pages of a shared scrapbook
create policy "scrapbook_pages_shared_select" on public.scrapbook_pages
  for select
  using (exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.is_shared = true));

create index if not exists idx_scrapbook_pages_sb on public.scrapbook_pages(scrapbook_id, page_number);


-- ── scrapbook_elements ────────────────────────────────────────────────────────
-- All coordinates are in the 1200×848 logical canvas pixel space.

create table if not exists public.scrapbook_elements (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.scrapbook_pages(id) on delete cascade,
  type       text not null check (type in ('photo','text','sticker')),
  content    text not null,          -- photo URL | text string | emoji char
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


-- ── scrapbook_comments ────────────────────────────────────────────────────────
-- Any visitor (auth or anon) can comment on a shared scrapbook.
-- author_id is null for anonymous visitors; author_name captures display name.

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

-- Read: owner always; anyone if shared
create policy "scrapbook_comments_select" on public.scrapbook_comments
  for select
  using (exists (
    select 1 from public.scrapbooks s
    where s.id = scrapbook_id
      and (s.owner_id = auth.uid() or s.is_shared = true)
  ));

-- Insert: anyone (including anon key) if the scrapbook is shared OR is the owner
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

-- Delete: comment author or scrapbook owner
create policy "scrapbook_comments_delete" on public.scrapbook_comments
  for delete
  using (
    author_id = auth.uid()
    or exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = auth.uid())
  );

create index if not exists idx_scrapbook_comments_sb on public.scrapbook_comments(scrapbook_id, created_at);
