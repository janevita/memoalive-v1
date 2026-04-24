-- ─────────────────────────────────────────────────────────────────────────────
-- Memory visibility + public join page helper
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add visibility enum and column to memories
create type memory_visibility as enum ('group', 'public');

alter table memories
  add column if not exists visibility memory_visibility not null default 'group';

-- 2. Update memories_select to allow public memories to be read by anyone
drop policy if exists "memories_select" on memories;

create policy "memories_select" on memories for select
  using (
    visibility = 'public'           -- anyone can read public memories
    or is_group_member(group_id)    -- group members can read group-only memories
  );

-- 3. Security-definer helper so the join page can preview a group by invite code
--    without the visitor being a member (bypasses RLS safely)
create or replace function get_group_preview(invite_code_input text)
returns table (
  id           uuid,
  name         text,
  description  text,
  member_count bigint
)
language sql security definer stable
set search_path = public as $$
  select
    g.id,
    g.name,
    g.description,
    (select count(*) from group_members gm where gm.group_id = g.id)::bigint
  from groups g
  where g.invite_code = invite_code_input;
$$;
