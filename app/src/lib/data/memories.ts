import { createClient } from '@/lib/supabase/server'
import type { MemoryWithDetails, Genre, ReactionType } from '@/lib/types'
import type { Tables } from '@/lib/supabase/database.types'

// ── Helper: shape raw DB rows into MemoryWithDetails ──────────────────────────

type MemoryRow = Tables<'memories'>
type MediaRow  = Tables<'media_items'>
type ProfileRow = Pick<Tables<'profiles'>, 'id' | 'name' | 'avatar_url'>

function shapeMemory(
  m: MemoryRow & { profiles?: ProfileRow | null },
  media: MediaRow[],
  reactions: { type: ReactionType; count: number; hasReacted: boolean }[],
  commentCount: number
): MemoryWithDetails {
  return {
    id:          m.id,
    groupId:     m.group_id,
    authorId:    m.author_id,
    title:       m.title,
    content:     m.content ?? undefined,
    genre:       m.genre as Genre,
    mediaType:   m.media_type as 'photo' | 'video' | 'voice' | 'text',
    location:    m.location ?? undefined,
    takenAt:     m.taken_at ?? undefined,
    isPublished: m.is_published,
    visibility:  ((m as any).visibility ?? 'group') as 'group' | 'public',
    albumId:     (m as any).album_id ?? undefined,
    createdAt:   m.created_at,
    updatedAt:   m.updated_at,
    author: {
      id:        m.profiles?.id ?? m.author_id,
      name:      m.profiles?.name ?? 'Unknown',
      avatarUrl: m.profiles?.avatar_url ?? undefined,
    },
    media: media.map(item => ({
      id:              item.id,
      memoryId:        item.memory_id,
      url:             item.url,
      thumbnailUrl:    item.thumbnail_url ?? undefined,
      type:            item.type as 'photo' | 'video' | 'voice' | 'text',
      caption:         item.caption ?? undefined,
      order:           item.sort_order,
      durationSeconds: item.duration_seconds ?? undefined,
      transcription:   item.transcription ?? undefined,
      createdAt:       item.created_at,
    })),
    cast:         [],
    reactions,
    commentCount,
  }
}

// ── Fetch memories for a group feed ──────────────────────────────────────────

export async function getGroupMemories(
  groupId: string,
  { limit = 20, offset = 0, albumId }: { limit?: number; offset?: number; albumId?: string | null } = {}
): Promise<MemoryWithDetails[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('memories')
    .select('*, profiles:author_id ( id, name, avatar_url )')
    .eq('group_id', groupId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (albumId !== undefined) {
    // null means "ungrouped" (no album); a UUID means that specific album
    query = albumId === null
      ? query.is('album_id', null)
      : query.eq('album_id', albumId)
  }

  const { data: rows, error } = await query

  if (error || !rows) return []

  const memoryIds = rows.map((r: MemoryRow) => r.id)
  if (memoryIds.length === 0) return []

  const [mediaRes, reactionsRes, commentsRes] = await Promise.all([
    supabase.from('media_items').select('*').in('memory_id', memoryIds).order('sort_order'),
    supabase.from('reactions').select('memory_id, type, user_id').in('memory_id', memoryIds),
    supabase.from('comments').select('memory_id').in('memory_id', memoryIds),
  ])

  const mediaByMemory    = groupBy<MediaRow>(mediaRes.data ?? [], 'memory_id')
  const reactionsByMemory = groupBy<{ memory_id: string; type: string; user_id: string }>(
    reactionsRes.data ?? [], 'memory_id'
  )
  const commentsByMemory: Record<string, number> = {}
  for (const row of (commentsRes.data ?? []) as { memory_id: string }[]) {
    commentsByMemory[row.memory_id] = (commentsByMemory[row.memory_id] ?? 0) + 1
  }

  return (rows as (MemoryRow & { profiles?: ProfileRow | null })[]).map(m => {
    const rawReactions = reactionsByMemory[m.id] ?? []
    return shapeMemory(
      m,
      mediaByMemory[m.id] ?? [],
      buildReactionSummary(rawReactions, user?.id),
      commentsByMemory[m.id] ?? 0
    )
  })
}

// ── Fetch a single memory with full details ────────────────────────────────────

export async function getMemory(memoryId: string): Promise<MemoryWithDetails | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: m, error } = await supabase
    .from('memories')
    .select('*, profiles:author_id ( id, name, avatar_url )')
    .eq('id', memoryId)
    .single()

  if (error || !m) return null

  const [mediaRes, reactionsRes, countRes] = await Promise.all([
    supabase.from('media_items').select('*').eq('memory_id', memoryId).order('sort_order'),
    supabase.from('reactions').select('memory_id, type, user_id').eq('memory_id', memoryId),
    supabase.from('comments').select('id', { count: 'exact', head: true }).eq('memory_id', memoryId),
  ])

  return shapeMemory(
    m as MemoryRow & { profiles?: ProfileRow | null },
    (mediaRes.data ?? []) as MediaRow[],
    buildReactionSummary(reactionsRes.data ?? [], user?.id),
    countRes.count ?? 0
  )
}

// ── Fetch comments for a memory ───────────────────────────────────────────────

export async function getComments(memoryId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles:author_id ( id, name, avatar_url )')
    .eq('memory_id', memoryId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return (data as (Tables<'comments'> & { profiles?: ProfileRow | null })[]).map(c => ({
    id:        c.id,
    memoryId:  c.memory_id,
    authorId:  c.author_id,
    content:   c.content,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    author: {
      id:        c.profiles?.id ?? c.author_id,
      name:      c.profiles?.name ?? 'Member',
      avatarUrl: c.profiles?.avatar_url ?? undefined,
    },
  }))
}

// ── Full-text search ──────────────────────────────────────────────────────────

export async function searchMemories(
  query: string,
  filters: { genre?: Genre; groupId?: string } = {}
): Promise<MemoryWithDetails[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let q = supabase
    .from('memories')
    .select('*, profiles:author_id ( id, name, avatar_url )')
    .textSearch('title', query, { type: 'websearch', config: 'english' })
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(30)

  if (filters.genre)   q = q.eq('genre', filters.genre)
  if (filters.groupId) q = q.eq('group_id', filters.groupId)

  const { data: rows, error } = await q
  if (error || !rows) return []

  const memoryIds = (rows as MemoryRow[]).map(r => r.id)
  const { data: mediaItems } = await supabase
    .from('media_items')
    .select('*')
    .in('memory_id', memoryIds)
    .order('sort_order')

  const mediaByMemory = groupBy<MediaRow>((mediaItems ?? []) as MediaRow[], 'memory_id')

  return (rows as (MemoryRow & { profiles?: ProfileRow | null })[]).map(m =>
    shapeMemory(m, mediaByMemory[m.id] ?? [], [], 0)
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, unknown>>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k]!.push(item)
    return acc
  }, {})
}

// ── Cross-event activity feed (home page) ─────────────────────────────────────
// Returns recent published memories across ALL events the user belongs to.

export async function getCrossFeedMemories(limit = 20): Promise<MemoryWithDetails[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. Gather the user's group IDs
  const { data: memberships } = await supabase
    .from('event_participants')
    .select('group_id')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) return []

  const groupIds = (memberships as { group_id: string }[]).map(m => m.group_id)

  // 2. Fetch recent memories across all those groups
  const { data: rows, error } = await supabase
    .from('memories')
    .select('*, profiles:author_id ( id, name, avatar_url )')
    .in('group_id', groupIds)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !rows) return []

  const memoryIds = rows.map((r: MemoryRow) => r.id)
  if (memoryIds.length === 0) return []

  const [mediaRes, reactionsRes, commentsRes] = await Promise.all([
    supabase.from('media_items').select('*').in('memory_id', memoryIds).order('sort_order'),
    supabase.from('reactions').select('memory_id, type, user_id').in('memory_id', memoryIds),
    supabase.from('comments').select('memory_id').in('memory_id', memoryIds),
  ])

  const mediaByMemory     = groupBy<MediaRow>(mediaRes.data ?? [], 'memory_id')
  const reactionsByMemory = groupBy<{ memory_id: string; type: string; user_id: string }>(
    reactionsRes.data ?? [], 'memory_id'
  )
  const commentsByMemory: Record<string, number> = {}
  for (const row of (commentsRes.data ?? []) as { memory_id: string }[]) {
    commentsByMemory[row.memory_id] = (commentsByMemory[row.memory_id] ?? 0) + 1
  }

  return (rows as (MemoryRow & { profiles?: ProfileRow | null })[]).map(m =>
    shapeMemory(
      m,
      mediaByMemory[m.id] ?? [],
      buildReactionSummary(reactionsByMemory[m.id] ?? [], user.id),
      commentsByMemory[m.id] ?? 0
    )
  )
}

function buildReactionSummary(
  reactions: { type: string; user_id: string }[],
  currentUserId?: string
): { type: ReactionType; count: number; hasReacted: boolean }[] {
  const counts: Partial<Record<string, { count: number; hasReacted: boolean }>> = {}
  for (const r of reactions) {
    if (!counts[r.type]) counts[r.type] = { count: 0, hasReacted: false }
    counts[r.type]!.count++
    if (currentUserId && r.user_id === currentUserId) counts[r.type]!.hasReacted = true
  }
  return Object.entries(counts)
    .filter(([, v]) => v && v.count > 0)
    .map(([type, v]) => ({
      type:       type as ReactionType,
      count:      v!.count,
      hasReacted: v!.hasReacted,
    }))
    .sort((a, b) => b.count - a.count)
}
