-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 011 — Reels table + journal genre
-- Safe to re-run (all changes are guarded).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Reels ─────────────────────────────────────────────────────────────────────

create table if not exists public.reels (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references public.profiles(id) on delete cascade,
  title        text        not null default 'My Reel',
  genre        text        not null,
  template     text,
  music        text,
  photos       jsonb       not null default '[]'::jsonb,
  stickers     jsonb       not null default '[]'::jsonb,
  share_token  text        unique default encode(gen_random_bytes(12), 'hex'),
  is_shared    boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index for fast owner lookups
create index if not exists reels_owner_id_idx on public.reels(owner_id);
create index if not exists reels_share_token_idx on public.reels(share_token);

-- Updated-at trigger (reuse existing function if available)
do $$
begin
  if not exists (
    select 1 from information_schema.triggers
    where trigger_name = 'set_reels_updated_at'
  ) then
    create trigger set_reels_updated_at
      before update on public.reels
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- Row-level security
alter table public.reels enable row level security;

drop policy if exists "owner_all_reels"  on public.reels;
drop policy if exists "public_read_reel" on public.reels;

-- Owner can do everything
create policy "owner_all_reels" on public.reels
  for all using (auth.uid() = owner_id);

-- Anyone can read a reel that is publicly shared
create policy "public_read_reel" on public.reels
  for select using (is_shared = true);

-- ── Journal genre column ───────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'journals'
      and column_name  = 'genre'
  ) then
    alter table public.journals add column genre text;
  end if;
end $$;

-- ── Scrapbook genre column ─────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'scrapbooks'
      and column_name  = 'genre'
  ) then
    alter table public.scrapbooks add column genre text;
  end if;
end $$;
