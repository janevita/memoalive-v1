import { createClient } from '@/lib/supabase/server'
import type { EventWithParticipants } from '@/lib/types'
import type { Tables } from '@/lib/supabase/database.types'

type EventRow  = Tables<'groups'>
type MemberRow = Tables<'group_members'>
type ProfileRow = Pick<Tables<'profiles'>, 'id' | 'name' | 'avatar_url'>

type MemberWithProfile = MemberRow & { profiles?: ProfileRow | null }

function shapeMember(m: MemberWithProfile) {
  return {
    userId:   m.user_id,
    groupId:  m.group_id,
    role:     m.role as 'owner' | 'admin' | 'member',
    joinedAt: m.joined_at,
    user: {
      id:        m.profiles?.id ?? m.user_id,
      name:      m.profiles?.name ?? 'Member',
      avatarUrl: m.profiles?.avatar_url ?? undefined,
    },
  }
}

function shapeEvent(g: EventRow, members: MemberWithProfile[], memoryCount = 0): EventWithParticipants {
  return {
    id:          g.id,
    name:        g.name,
    description: g.description ?? undefined,
    coverUrl:    g.cover_url ?? undefined,
    inviteCode:  g.invite_code,
    ownerId:     g.owner_id,
    createdAt:   g.created_at,
    updatedAt:   g.updated_at,
    members:     members.map(shapeMember),
    memoryCount,
    recentMemories: [],
  }
}

// ── Fetch current user's events ───────────────────────────────────────────────

export async function getMyEvents(): Promise<EventWithParticipants[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: memberships, error } = await supabase
    .from('event_participants')
    .select('group_id')
    .eq('user_id', user.id)

  if (error || !memberships || memberships.length === 0) return []

  const eventIds = (memberships as { group_id: string }[]).map(m => m.group_id)

  const [eventsRes, membersRes] = await Promise.all([
    supabase.from('events').select('*').in('id', eventIds).order('created_at', { ascending: false }),
    supabase
      .from('event_participants')
      .select('*, profiles:user_id ( id, name, avatar_url )')
      .in('group_id', eventIds),
  ])

  if (!eventsRes.data) return []

  const membersByEvent = ((membersRes.data ?? []) as MemberWithProfile[]).reduce<
    Record<string, MemberWithProfile[]>
  >((acc, m) => {
    if (!acc[m.group_id]) acc[m.group_id] = []
    acc[m.group_id]!.push(m)
    return acc
  }, {})

  return (eventsRes.data as EventRow[]).map(g =>
    shapeEvent(g, membersByEvent[g.id] ?? [])
  )
}

// ── Fetch single event with participants ──────────────────────────────────────

export async function getEvent(eventId: string): Promise<EventWithParticipants | null> {
  const supabase = await createClient()

  const [eventRes, membersRes, countRes] = await Promise.all([
    supabase.from('events').select('*').eq('id', eventId).single(),
    supabase
      .from('event_participants')
      .select('*, profiles:user_id ( id, name, avatar_url )')
      .eq('group_id', eventId),
    supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', eventId),
  ])

  if (eventRes.error || !eventRes.data) return null

  return shapeEvent(
    eventRes.data as EventRow,
    (membersRes.data ?? []) as MemberWithProfile[],
    countRes.count ?? 0
  )
}

// ── Legacy aliases (keep old names working during transition) ─────────────────
export const getMyGroups = getMyEvents
export const getGroup    = getEvent
