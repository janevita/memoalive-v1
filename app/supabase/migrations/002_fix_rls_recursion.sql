-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: infinite recursion in group_members RLS policies
--
-- Root cause: group_members_select checks group_members to decide who can
-- read group_members — circular. Same recursion occurs when groups_select
-- and memories_select query group_members (which re-applies RLS).
--
-- Fix: two security definer helper functions that bypass RLS for membership
-- checks, then rebuild all affected policies to use them.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper functions (security definer = bypasses RLS) ────────────────────────

create or replace function is_group_member(group_uuid uuid)
returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = group_uuid and user_id = auth.uid()
  );
$$;

create or replace function is_group_admin(group_uuid uuid)
returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = group_uuid and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ── Rebuild group_members policies ────────────────────────────────────────────

drop policy if exists "group_members_select" on group_members;
drop policy if exists "group_members_insert" on group_members;
drop policy if exists "group_members_delete" on group_members;

create policy "group_members_select" on group_members for select
  using (is_group_member(group_id));

create policy "group_members_insert" on group_members for insert
  with check (
    is_group_admin(group_id)
    or user_id = auth.uid()   -- self-join via invite
  );

create policy "group_members_delete" on group_members for delete
  using (
    user_id = auth.uid()      -- leave group
    or is_group_admin(group_id)
  );

-- ── Rebuild groups policies ────────────────────────────────────────────────────

drop policy if exists "groups_select" on groups;
drop policy if exists "groups_update" on groups;

create policy "groups_select" on groups for select
  using (is_group_member(id));

create policy "groups_update" on groups for update
  using (is_group_admin(id));

-- ── Rebuild memories policies ─────────────────────────────────────────────────

drop policy if exists "memories_select" on memories;
drop policy if exists "memories_insert" on memories;
drop policy if exists "memories_delete" on memories;

create policy "memories_select" on memories for select
  using (is_group_member(group_id));

create policy "memories_insert" on memories for insert
  with check (
    author_id = auth.uid()
    and is_group_member(group_id)
  );

create policy "memories_delete" on memories for delete
  using (
    author_id = auth.uid()
    or is_group_admin(group_id)
  );
