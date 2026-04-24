-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010 — Phone photo upload sessions
--
-- A short-lived session lets a logged-in user generate a QR code on desktop.
-- Scanning it on a phone opens /m/[token] — a public, no-auth upload page.
-- Uploaded photos stream back to the desktop in real time via polling.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Only the owner can see and manage their sessions
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

-- ── Storage bucket for phone uploads ──────────────────────────────────────────
-- Uses the existing memory-media bucket; photos land under phone-uploads/{session_id}/
-- No separate bucket needed — just a path prefix convention.
