'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'
import type { ElementStyle } from '@/lib/types'

// ── Create scrapbook ──────────────────────────────────────────────────────────

export async function createScrapbook(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const title = (formData.get('title') as string | null)?.trim()
  if (!title) return { error: 'Please give your scrapbook a title.' }

  const description = (formData.get('description') as string | null)?.trim() || null
  const template    = (formData.get('template')    as string | null) ?? 'vintage-kraft'
  const genre       = (formData.get('genre')       as string | null) ?? null
  const id = randomUUID()

  const { error } = await supabase.from('scrapbooks').insert({
    id,
    owner_id:    user.id,
    title,
    description,
    template,
    ...(genre && { genre }),
  } as any)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbooks)
  redirect(ROUTES.scrapbook(id))
}

// ── Add items to scrapbook ────────────────────────────────────────────────────

export interface AddItemPayload {
  url:             string
  caption?:        string
  sourceMemoryId?: string
  sourceEventId?:  string
}

export async function addItemsToScrapbook(
  scrapbookId: string,
  items: AddItemPayload[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify ownership
  const { data: sb } = await supabase
    .from('scrapbooks')
    .select('id')
    .eq('id', scrapbookId)
    .eq('owner_id', user.id)
    .single()

  if (!sb) return { error: 'Scrapbook not found.' }

  // Get current max sort_order
  const { data: last } = await supabase
    .from('scrapbook_items')
    .select('sort_order')
    .eq('scrapbook_id', scrapbookId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const baseOrder = ((last as any)?.sort_order ?? -1) + 1

  const rows = items.map((item, i) => ({
    id:               randomUUID(),
    scrapbook_id:     scrapbookId,
    url:              item.url,
    caption:          item.caption ?? null,
    source_memory_id: item.sourceMemoryId ?? null,
    source_event_id:  item.sourceEventId  ?? null,
    sort_order:       baseOrder + i,
  }))

  const { error } = await supabase.from('scrapbook_items').insert(rows as any)
  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return {}
}

// ── Remove item from scrapbook ────────────────────────────────────────────────

export async function removeScrapbookItem(
  scrapbookId: string,
  itemId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Join-check ownership
  const { data: sb } = await supabase
    .from('scrapbooks')
    .select('id')
    .eq('id', scrapbookId)
    .eq('owner_id', user.id)
    .single()

  if (!sb) return { error: 'Scrapbook not found.' }

  const { error } = await supabase
    .from('scrapbook_items')
    .delete()
    .eq('id', itemId)
    .eq('scrapbook_id', scrapbookId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return {}
}

// ── Update a single scrapbook item's caption ──────────────────────────────────

export async function updateScrapbookItem(
  scrapbookId: string,
  itemId: string,
  caption: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: sb } = await supabase
    .from('scrapbooks')
    .select('id')
    .eq('id', scrapbookId)
    .eq('owner_id', user.id)
    .single()

  if (!sb) return { error: 'Scrapbook not found.' }

  const { error } = await supabase
    .from('scrapbook_items')
    .update({ caption: caption.trim() || null } as any)
    .eq('id', itemId)
    .eq('scrapbook_id', scrapbookId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return {}
}

// ── Update scrapbook title / description / template ───────────────────────────

export async function updateScrapbook(
  scrapbookId: string,
  patch: { title?: string; description?: string; template?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('scrapbooks')
    .update({ ...patch, updated_at: new Date().toISOString() } as any)
    .eq('id', scrapbookId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  revalidatePath(ROUTES.scrapbooks)
  return {}
}

// ── Delete scrapbook ──────────────────────────────────────────────────────────

export async function deleteScrapbook(scrapbookId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('scrapbooks')
    .delete()
    .eq('id', scrapbookId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbooks)
  redirect(ROUTES.scrapbooks)
}

// ── Toggle sharing ────────────────────────────────────────────────────────────

export async function toggleScrapbookSharing(
  scrapbookId: string,
  isShared: boolean
): Promise<{ error?: string; shareToken?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('scrapbooks')
    .update({ is_shared: isShared, updated_at: new Date().toISOString() } as any)
    .eq('id', scrapbookId)
    .eq('owner_id', user.id)
    .select('share_token')
    .single()

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return { shareToken: (data as any)?.share_token }
}

// ── Pages ─────────────────────────────────────────────────────────────────────

export async function createPage(
  scrapbookId: string,
  pageNumber: number
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const id = randomUUID()
  const { error } = await supabase
    .from('scrapbook_pages')
    .insert({ id, scrapbook_id: scrapbookId, page_number: pageNumber } as any)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return { id }
}

export async function deletePage(
  scrapbookId: string,
  pageId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify ownership via scrapbook
  const { data: sb } = await supabase
    .from('scrapbooks')
    .select('id')
    .eq('id', scrapbookId)
    .eq('owner_id', user.id)
    .single()
  if (!sb) return { error: 'Not found.' }

  const { error } = await supabase
    .from('scrapbook_pages')
    .delete()
    .eq('id', pageId)
    .eq('scrapbook_id', scrapbookId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return {}
}

// ── Elements ──────────────────────────────────────────────────────────────────

export interface CreateElementPayload {
  type:    'photo' | 'text' | 'sticker'
  content: string
  x:       number
  y:       number
  width:   number
  height:  number
  rotation?: number
  zIndex?:   number
  style?:    ElementStyle
}

export async function createElement(
  scrapbookId: string,
  pageId: string,
  payload: CreateElementPayload
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const id = randomUUID()
  const { error } = await supabase
    .from('scrapbook_elements')
    .insert({
      id,
      page_id:  pageId,
      type:     payload.type,
      content:  payload.content,
      x:        payload.x,
      y:        payload.y,
      width:    payload.width,
      height:   payload.height,
      rotation: payload.rotation ?? 0,
      z_index:  payload.zIndex  ?? 0,
      style:    payload.style   ?? {},
    } as any)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return { id }
}

export interface UpdateElementPayload {
  content?:  string
  x?:        number
  y?:        number
  width?:    number
  height?:   number
  rotation?: number
  zIndex?:   number
  style?:    ElementStyle
}

export async function updateElement(
  elementId: string,
  patch: UpdateElementPayload
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const update: Record<string, unknown> = {}
  if (patch.content  !== undefined) update.content  = patch.content
  if (patch.x        !== undefined) update.x        = patch.x
  if (patch.y        !== undefined) update.y        = patch.y
  if (patch.width    !== undefined) update.width     = patch.width
  if (patch.height   !== undefined) update.height    = patch.height
  if (patch.rotation !== undefined) update.rotation  = patch.rotation
  if (patch.zIndex   !== undefined) update.z_index   = patch.zIndex
  if (patch.style    !== undefined) update.style      = patch.style

  const { error } = await supabase
    .from('scrapbook_elements')
    .update(update as any)
    .eq('id', elementId)

  if (error) return { error: error.message }
  return {}
}

export async function deleteElement(
  elementId: string,
  scrapbookId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('scrapbook_elements')
    .delete()
    .eq('id', elementId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return {}
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function addComment(
  scrapbookId: string,
  content: string,
  authorName: string
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!content.trim()) return { error: 'Comment cannot be empty.' }

  const id = randomUUID()
  const { error } = await supabase
    .from('scrapbook_comments')
    .insert({
      id,
      scrapbook_id: scrapbookId,
      author_id:    user?.id ?? null,
      author_name:  authorName.trim() || (user ? 'Anonymous' : 'Guest'),
      content:      content.trim(),
    } as any)

  if (error) return { error: error.message }
  return { id }
}

export async function deleteComment(
  commentId: string,
  scrapbookId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('scrapbook_comments')
    .delete()
    .eq('id', commentId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.scrapbook(scrapbookId))
  return {}
}
