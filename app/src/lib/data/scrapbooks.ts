import { createClient } from '@/lib/supabase/server'
import type {
  Scrapbook, ScrapbookItem, ScrapbookWithItems, PickablePhoto,
  CanvasElement, ScrapbookPage, ScrapbookComment, ScrapbookWithPages,
  ElementStyle,
} from '@/lib/types'
import { DEFAULT_TEMPLATE_ID } from '@/lib/constants'

// ── Shape helpers ─────────────────────────────────────────────────────────────

function shapeScrapbook(row: Record<string, unknown>): Scrapbook {
  return {
    id:          row.id as string,
    ownerId:     row.owner_id as string,
    title:       row.title as string,
    description: (row.description as string | null) ?? undefined,
    coverUrl:    (row.cover_url as string | null) ?? undefined,
    template:    (row.template as string | null) ?? DEFAULT_TEMPLATE_ID,
    shareToken:  (row.share_token as string | null) ?? '',
    isShared:    (row.is_shared as boolean | null) ?? false,
    createdAt:   row.created_at as string,
    updatedAt:   row.updated_at as string,
  }
}

function shapeItem(row: Record<string, unknown>): ScrapbookItem {
  return {
    id:             row.id as string,
    scrapbookId:    row.scrapbook_id as string,
    url:            row.url as string,
    caption:        (row.caption as string | null) ?? undefined,
    sortOrder:      row.sort_order as number,
    sourceMemoryId: (row.source_memory_id as string | null) ?? undefined,
    sourceEventId:  (row.source_event_id as string | null) ?? undefined,
    createdAt:      row.created_at as string,
  }
}

function shapeElement(row: Record<string, unknown>): CanvasElement {
  return {
    id:        row.id as string,
    pageId:    row.page_id as string,
    type:      row.type as 'photo' | 'text' | 'sticker',
    content:   row.content as string,
    x:         row.x as number,
    y:         row.y as number,
    width:     row.width as number,
    height:    row.height as number,
    rotation:  row.rotation as number,
    zIndex:    row.z_index as number,
    style:     ((row.style as ElementStyle | null) ?? {}),
    createdAt: row.created_at as string,
  }
}

function shapePage(row: Record<string, unknown>, elements: CanvasElement[]): ScrapbookPage {
  return {
    id:          row.id as string,
    scrapbookId: row.scrapbook_id as string,
    pageNumber:  row.page_number as number,
    createdAt:   row.created_at as string,
    elements,
  }
}

function shapeComment(row: Record<string, unknown>): ScrapbookComment {
  return {
    id:          row.id as string,
    scrapbookId: row.scrapbook_id as string,
    authorId:    (row.author_id as string | null) ?? undefined,
    authorName:  (row.author_name as string | null) ?? 'Guest',
    content:     row.content as string,
    createdAt:   row.created_at as string,
  }
}

// ── Canvas data loader ────────────────────────────────────────────────────────

async function loadPagesAndElements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scrapbookId: string
): Promise<ScrapbookPage[]> {
  const { data: pageRows } = await supabase
    .from('scrapbook_pages')
    .select('*')
    .eq('scrapbook_id', scrapbookId)
    .order('page_number', { ascending: true })

  if (!pageRows || pageRows.length === 0) return []

  const pageIds = (pageRows as Record<string, unknown>[]).map(r => r.id as string)

  const { data: elementRows } = await supabase
    .from('scrapbook_elements')
    .select('*')
    .in('page_id', pageIds)
    .order('z_index', { ascending: true })

  const elementsByPage: Record<string, CanvasElement[]> = {}
  for (const row of (elementRows ?? []) as Record<string, unknown>[]) {
    const pid = row.page_id as string
    if (!elementsByPage[pid]) elementsByPage[pid] = []
    elementsByPage[pid]!.push(shapeElement(row))
  }

  return (pageRows as Record<string, unknown>[]).map(r =>
    shapePage(r, elementsByPage[r.id as string] ?? [])
  )
}

async function loadComments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scrapbookId: string
): Promise<ScrapbookComment[]> {
  const { data: rows } = await supabase
    .from('scrapbook_comments')
    .select('*')
    .eq('scrapbook_id', scrapbookId)
    .order('created_at', { ascending: true })

  return (rows ?? []).map(r => shapeComment(r as Record<string, unknown>))
}

// ── Scrapbook list (owner) ─────────────────────────────────────────────────────

export async function getMyScrapbooks(): Promise<ScrapbookWithItems[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows, error } = await supabase
    .from('scrapbooks')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error || !rows) return []

  const ids = (rows as Record<string, unknown>[]).map(r => r.id as string)
  if (ids.length === 0) return []

  const { data: itemRows } = await supabase
    .from('scrapbook_items')
    .select('*')
    .in('scrapbook_id', ids)
    .order('sort_order', { ascending: true })

  const itemsByScrapbook: Record<string, ScrapbookItem[]> = {}
  for (const row of (itemRows ?? []) as Record<string, unknown>[]) {
    const sid = row.scrapbook_id as string
    if (!itemsByScrapbook[sid]) itemsByScrapbook[sid] = []
    itemsByScrapbook[sid]!.push(shapeItem(row))
  }

  return (rows as Record<string, unknown>[]).map(r => ({
    ...shapeScrapbook(r),
    items: itemsByScrapbook[r.id as string] ?? [],
  }))
}

// ── Single scrapbook with full canvas data (owner) ────────────────────────────

export async function getScrapbookWithPages(id: string): Promise<ScrapbookWithPages | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: row, error } = await supabase
    .from('scrapbooks')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !row) return null

  const [pages, comments] = await Promise.all([
    loadPagesAndElements(supabase, id),
    loadComments(supabase, id),
  ])

  return { ...shapeScrapbook(row as Record<string, unknown>), pages, comments }
}

// ── Shared scrapbook (by token, no auth required) ─────────────────────────────

export async function getScrapbookByToken(token: string): Promise<ScrapbookWithPages | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('scrapbooks')
    .select('*')
    .eq('share_token', token)
    .eq('is_shared', true)
    .single()

  if (error || !row) return null

  const id = (row as Record<string, unknown>).id as string
  const [pages, comments] = await Promise.all([
    loadPagesAndElements(supabase, id),
    loadComments(supabase, id),
  ])

  return { ...shapeScrapbook(row as Record<string, unknown>), pages, comments }
}

// ── Legacy: single scrapbook with flat items ──────────────────────────────────

export async function getScrapbook(id: string): Promise<ScrapbookWithItems | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: row, error } = await supabase
    .from('scrapbooks')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !row) return null

  const { data: itemRows } = await supabase
    .from('scrapbook_items')
    .select('*')
    .eq('scrapbook_id', id)
    .order('sort_order', { ascending: true })

  return {
    ...shapeScrapbook(row as Record<string, unknown>),
    items: (itemRows ?? []).map(r => shapeItem(r as Record<string, unknown>)),
  }
}

// ── Photo picker — all photos from user's events ───────────────────────────────

export async function getPickablePhotos(): Promise<PickablePhoto[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: participantRows } = await supabase
    .from('event_participants')
    .select('group_id')
    .eq('user_id', user.id)

  const eventIds = (participantRows ?? []).map((r: Record<string, unknown>) => r.group_id as string)
  if (eventIds.length === 0) return []

  const { data: eventRows } = await supabase
    .from('events')
    .select('id, name')
    .in('id', eventIds)

  const eventNames: Record<string, string> = {}
  for (const e of (eventRows ?? []) as Record<string, unknown>[]) {
    eventNames[e.id as string] = e.name as string
  }

  const { data: memoryRows } = await supabase
    .from('memories')
    .select('id, title, group_id, taken_at')
    .in('group_id', eventIds)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(500)

  if (!memoryRows || memoryRows.length === 0) return []

  const memoryIds = (memoryRows as Record<string, unknown>[]).map(r => r.id as string)
  const memoryMeta: Record<string, { title: string; groupId: string; takenAt: string | null }> = {}
  for (const m of memoryRows as Record<string, unknown>[]) {
    memoryMeta[m.id as string] = {
      title:   m.title as string,
      groupId: m.group_id as string,
      takenAt: m.taken_at as string | null,
    }
  }

  const { data: mediaRows } = await supabase
    .from('media_items')
    .select('id, memory_id, url, thumbnail_url')
    .in('memory_id', memoryIds)
    .eq('type', 'photo')
    .order('sort_order', { ascending: true })

  if (!mediaRows) return []

  return (mediaRows as Record<string, unknown>[]).map(item => {
    const meta = memoryMeta[item.memory_id as string]!
    return {
      url:          item.url as string,
      thumbnailUrl: (item.thumbnail_url as string | null) ?? undefined,
      eventId:      meta.groupId,
      eventName:    eventNames[meta.groupId] ?? 'Event',
      memoryId:     item.memory_id as string,
      memoryTitle:  meta.title,
      takenAt:      meta.takenAt ?? undefined,
    }
  })
}
