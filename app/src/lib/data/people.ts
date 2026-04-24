import { createClient } from '@/lib/supabase/server'
import type { GroupPerson, MemoryTag, FaceRef } from '@/lib/types'

// ── Group people directory ─────────────────────────────────────────────────────

export async function getGroupPeople(groupId: string): Promise<GroupPerson[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('group_people')
    .select('*')
    .eq('group_id', groupId)
    .order('name')

  if (error || !data) return []

  return (data as any[]).map(shapePerson)
}

export async function getGroupPerson(personId: string): Promise<GroupPerson | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('group_people')
    .select('*')
    .eq('id', personId)
    .single()

  if (error || !data) return null
  return shapePerson(data)
}

function shapePerson(p: any): GroupPerson {
  return {
    id:           p.id,
    groupId:      p.group_id,
    createdBy:    p.created_by,
    name:         p.name,
    nickname:     p.nickname     ?? undefined,
    relationship: p.relationship ?? undefined,
    birthYear:    p.birth_year   ?? undefined,
    hometown:     p.hometown     ?? undefined,
    bio:          p.bio          ?? undefined,
    avatarUrl:    p.avatar_url   ?? undefined,
    faceRefs:     (p.face_refs   ?? []) as FaceRef[],
    profileId:    p.profile_id   ?? undefined,
    createdAt:    p.created_at,
    updatedAt:    p.updated_at,
  }
}

// ── Memory tags ────────────────────────────────────────────────────────────────

export async function getMemoryTags(memoryId: string): Promise<MemoryTag[]> {
  const supabase = await createClient()

  // Fetch tags with joined profile and group_person names/avatars
  const { data, error } = await supabase
    .from('memory_tags')
    .select(`
      *,
      profiles:profile_id ( id, name, avatar_url ),
      group_people:group_person_id ( id, name, avatar_url )
    `)
    .eq('memory_id', memoryId)
    .order('created_at')

  if (error || !data) return []

  return (data as any[]).map(t => ({
    id:            t.id,
    memoryId:      t.memory_id,
    profileId:     t.profile_id      ?? undefined,
    groupPersonId: t.group_person_id ?? undefined,
    taggedBy:      t.tagged_by,
    isAiSuggested: t.is_ai_suggested,
    confirmedAt:   t.confirmed_at    ?? undefined,
    createdAt:     t.created_at,
    // Resolve display name + avatar from whichever side is populated
    name:      t.profiles?.name ?? t.group_people?.name ?? 'Unknown',
    avatarUrl: t.profiles?.avatar_url ?? t.group_people?.avatar_url ?? undefined,
  })) satisfies MemoryTag[]
}

// ── All taggable people in a group ────────────────────────────────────────────
// Returns both registered members and group_people in a unified shape

export interface TaggablePerson {
  id: string                // profile id OR group_person id
  type: 'profile' | 'person'
  name: string
  nickname?: string
  relationship?: string
  avatarUrl?: string
  faceRefs: FaceRef[]
}

export async function getTaggablePeople(groupId: string): Promise<TaggablePerson[]> {
  const supabase = await createClient()

  const [membersRes, peopleRes] = await Promise.all([
    supabase
      .from('event_participants')
      .select('profiles:user_id ( id, name, nickname, relationship, avatar_url, face_refs )')
      .eq('group_id', groupId),
    supabase
      .from('group_people')
      .select('id, name, nickname, relationship, avatar_url, face_refs')
      .eq('group_id', groupId)
      .order('name'),
  ])

  const members: TaggablePerson[] = ((membersRes.data ?? []) as any[])
    .map((m: any) => m.profiles)
    .filter(Boolean)
    .map((p: any) => ({
      id:           p.id,
      type:         'profile' as const,
      name:         p.name,
      nickname:     p.nickname     ?? undefined,
      relationship: p.relationship ?? undefined,
      avatarUrl:    p.avatar_url   ?? undefined,
      faceRefs:     (p.face_refs   ?? []) as FaceRef[],
    }))

  const groupPeople: TaggablePerson[] = ((peopleRes.data ?? []) as any[]).map((p: any) => ({
    id:           p.id,
    type:         'person' as const,
    name:         p.name,
    nickname:     p.nickname     ?? undefined,
    relationship: p.relationship ?? undefined,
    avatarUrl:    p.avatar_url   ?? undefined,
    faceRefs:     (p.face_refs   ?? []) as FaceRef[],
  }))

  // Members first, then non-registered people
  return [...members, ...groupPeople]
}
