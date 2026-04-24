-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008 — Scrapbooks
--
-- Scrapbooks are personal photo collections. They are private to the owner and
-- can contain photos picked from event memories or uploaded directly.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── scrapbooks ────────────────────────────────────────────────────────────────

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

alter table public.scrapbooks enable row level security;

-- Owners can read, insert, update, and delete their own scrapbooks
create policy "scrapbooks_owner_all"
  on public.scrapbooks
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── scrapbook_items ────────────────────────────────────────────────────────────

create table if not exists public.scrapbook_items (
  id                uuid primary key default gen_random_uuid(),
  scrapbook_id      uuid not null references public.scrapbooks(id) on delete cascade,
  url               text not null,                     -- photo URL (Storage public URL)
  caption           text,
  sort_order        integer not null default 0,
  source_memory_id  uuid references public.memories(id) on delete set null,
  source_event_id   uuid references public.events(id)  on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.scrapbook_items enable row level security;

-- Items inherit their scrapbook's owner — join check
create policy "scrapbook_items_owner_all"
  on public.scrapbook_items
  for all
  using  (
    exists (
      select 1 from public.scrapbooks sb
      where sb.id = scrapbook_id
        and sb.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scrapbooks sb
      where sb.id = scrapbook_id
        and sb.owner_id = auth.uid()
    )
  );

-- ── updated_at trigger ────────────────────────────────────────────────────────

create or replace function public.touch_scrapbook_updated_at()
returns trigger language plpgsql as $$
begin
  update public.scrapbooks
  set updated_at = now()
  where id = new.scrapbook_id;
  return new;
end;
$$;

create trigger trg_scrapbook_items_touch_parent
  after insert or delete or update
  on public.scrapbook_items
  for each row
  execute function public.touch_scrapbook_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────────────────

create index if not exists idx_scrapbooks_owner_id    on public.scrapbooks(owner_id);
create index if not exists idx_scrapbook_items_scrapbook on public.scrapbook_items(scrapbook_id, sort_order);
