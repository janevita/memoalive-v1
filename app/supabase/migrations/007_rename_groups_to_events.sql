-- ─────────────────────────────────────────────────────────────────────────────
-- Rename groups → events, group_members → event_participants
--
-- The concept "Group" (a shared space) is renamed to "Event" because an event
-- (trip, birthday, Christmas dinner) is what actually brings people together.
-- "Group" will later mean a named set of people — that's a future feature.
--
-- Column names (group_id etc.) are left unchanged as internal DB details.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Rename tables ──────────────────────────────────────────────────────────

alter table groups        rename to events;
alter table group_members rename to event_participants;

-- ── 2. Drop old RLS policies on the renamed tables ───────────────────────────

drop policy if exists "groups_select"  on events;
drop policy if exists "groups_insert"  on events;
drop policy if exists "groups_update"  on events;
drop policy if exists "groups_delete"  on events;

drop policy if exists "group_members_select" on event_participants;
drop policy if exists "group_members_insert" on event_participants;
drop policy if exists "group_members_update" on event_participants;
drop policy if exists "group_members_delete" on event_participants;

-- ── 3. Rename helper functions ────────────────────────────────────────────────

create or replace function is_event_participant(event_uuid uuid)
returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from event_participants
    where group_id = event_uuid and user_id = auth.uid()
  );
$$;

create or replace function is_event_admin(event_uuid uuid)
returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from event_participants
    where group_id = event_uuid and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ── 4. Recreate RLS policies on events ───────────────────────────────────────

create policy "events_select" on events for select
  using (
    is_event_participant(id)
    or (select count(*) from event_participants ep where ep.group_id = events.id) = 0  -- allow owner pre-join read; handled by insert flow
  );

-- Simpler: events select = participant OR public (memories have visibility; events themselves don't yet)
drop policy if exists "events_select" on events;

create policy "events_select" on events for select
  using (is_event_participant(id));

create policy "events_insert" on events for insert
  with check (auth.uid() is not null);

create policy "events_update" on events for update
  using (is_event_admin(id));

create policy "events_delete" on events for delete
  using (is_event_admin(id));

-- ── 5. Recreate RLS policies on event_participants ────────────────────────────

create policy "event_participants_select" on event_participants for select
  using (is_event_participant(group_id));

create policy "event_participants_insert" on event_participants for insert
  with check (
    is_event_admin(group_id)
    or user_id = auth.uid()   -- self-join via invite
  );

create policy "event_participants_update" on event_participants for update
  using (user_id = auth.uid() or is_event_admin(group_id));

create policy "event_participants_delete" on event_participants for delete
  using (
    user_id = auth.uid()       -- leave event
    or is_event_admin(group_id)
  );

-- ── 6. Update memories_select to use is_event_participant ────────────────────

drop policy if exists "memories_select" on memories;

create policy "memories_select" on memories for select
  using (
    visibility = 'public'
    or is_event_participant(group_id)
  );

drop policy if exists "memories_insert" on memories;

create policy "memories_insert" on memories for insert
  with check (
    author_id = auth.uid()
    and is_event_participant(group_id)
  );

drop policy if exists "memories_delete" on memories;

create policy "memories_delete" on memories for delete
  using (
    author_id = auth.uid()
    or is_event_admin(group_id)
  );

-- ── 7. Rename get_group_preview → get_event_preview ──────────────────────────

drop function if exists get_group_preview(text);

create or replace function get_event_preview(invite_code_input text)
returns table (
  id           uuid,
  name         text,
  description  text,
  member_count bigint
)
language sql security definer stable
set search_path = public as $$
  select
    e.id,
    e.name,
    e.description,
    (select count(*) from event_participants ep where ep.group_id = e.id)::bigint
  from events e
  where e.invite_code = invite_code_input;
$$;

-- ── 8. Keep old helper functions as aliases for any existing references ────────
--       (they can be dropped in a future migration once all code is updated)

create or replace function is_group_member(group_uuid uuid)
returns boolean
language sql security definer stable
set search_path = public as $$
  select is_event_participant(group_uuid);
$$;

create or replace function is_group_admin(group_uuid uuid)
returns boolean
language sql security definer stable
set search_path = public as $$
  select is_event_admin(group_uuid);
$$;
