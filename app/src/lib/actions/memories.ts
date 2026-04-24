'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'
import type { Genre } from '@/lib/types'

// ── Create memory ─────────────────────────────────────────────────────────────

export async function createMemory(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const groupId    = formData.get('groupId')    as string
  const albumId    = (formData.get('albumId')   as string | null) || null
  const title      = (formData.get('title')     as string).trim()
  const content    = (formData.get('content')   as string | null)?.trim() ?? null
  const genre      = (formData.get('genre')     as Genre) ?? 'adventure'
  const takenAt    = (formData.get('takenAt')   as string | null) ?? null
  const visibility = (formData.get('visibility') as 'group' | 'public' | null) ?? 'group'

  if (!groupId) return { error: 'Please select an event.' }
  if (!title)   return { error: 'Title is required.' }

  // Generate ID upfront — avoids a SELECT after insert which would fail RLS
  // (memories_select checks group membership via group_members)
  const memoryId = randomUUID()

  const { error } = await supabase
    .from('memories')
    .insert({
      id:         memoryId,
      group_id:   groupId,
      album_id:   albumId,
      author_id:  user.id,
      title,
      content,
      genre,
      taken_at:   takenAt || null,
      visibility,
    } as any)

  if (error) return { error: error.message }

  // Insert media items if any were uploaded client-side
  const mediaJson = formData.get('mediaItems') as string | null
  if (mediaJson) {
    try {
      const mediaItems: Array<{ url: string; thumbnailUrl: string | null; type: string }> = JSON.parse(mediaJson)
      if (mediaItems.length > 0) {
        await supabase.from('media_items').insert(
          mediaItems.map((item, i) => ({
            memory_id:     memoryId,
            url:           item.url,
            thumbnail_url: item.thumbnailUrl ?? null,
            type:          item.type as 'photo' | 'video',
            sort_order:    i,
          }))
        )
      }
    } catch {
      // Media insert failed — memory still created, non-fatal
    }
  }

  // Tag people if IDs were passed
  const taggedJson = formData.get('taggedPeople') as string | null
  if (taggedJson) {
    try {
      const tags: Array<{ id: string; type: 'profile' | 'person' }> = JSON.parse(taggedJson)
      if (tags.length > 0) {
        await supabase.from('memory_tags').insert(
          tags.map(t => ({
            memory_id:       memoryId,
            profile_id:      t.type === 'profile' ? t.id : null,
            group_person_id: t.type === 'person'  ? t.id : null,
            tagged_by:       user.id,
            is_ai_suggested: false,
          }))
        )
      }
    } catch {
      // Tagging failed — non-fatal, memory is still created
    }
  }

  revalidatePath(ROUTES.event(groupId))
  redirect(ROUTES.memory(groupId, memoryId))
}

// ── Update memory ─────────────────────────────────────────────────────────────

export async function updateMemory(
  memoryId: string,
  groupId: string,
  patch: { title?: string; content?: string; genre?: Genre; takenAt?: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('memories')
    .update({
      ...(patch.title   !== undefined && { title:    patch.title }),
      ...(patch.content !== undefined && { content:  patch.content || null }),
      ...(patch.genre   !== undefined && { genre:    patch.genre }),
      ...(patch.takenAt !== undefined && { taken_at: patch.takenAt || null }),
    } as any)
    .eq('id', memoryId)
    .eq('author_id', user.id)   // only the author can edit

  if (error) return { error: error.message }

  revalidatePath(ROUTES.memory(groupId, memoryId))
  revalidatePath(ROUTES.event(groupId))
  return {}
}

// ── Delete single media item (photo / video) from a memory ────────────────────

export async function deleteMediaItem(
  mediaItemId: string,
  memoryId: string,
  groupId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify ownership via the parent memory
  const { data: mem } = await supabase
    .from('memories')
    .select('author_id')
    .eq('id', memoryId)
    .single()

  if (!mem || (mem as any).author_id !== user.id) {
    return { error: 'Not authorised.' }
  }

  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', mediaItemId)
    .eq('memory_id', memoryId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.memory(groupId, memoryId))
  return {}
}

// ── Update a media item's caption ─────────────────────────────────────────────

export async function updateMediaCaption(
  mediaItemId: string,
  memoryId: string,
  groupId: string,
  caption: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: mem } = await supabase
    .from('memories')
    .select('author_id')
    .eq('id', memoryId)
    .single()

  if (!mem || (mem as any).author_id !== user.id) {
    return { error: 'Not authorised.' }
  }

  const { error } = await supabase
    .from('media_items')
    .update({ caption: caption.trim() || null } as any)
    .eq('id', mediaItemId)
    .eq('memory_id', memoryId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.memory(groupId, memoryId))
  return {}
}

// ── Delete memory ─────────────────────────────────────────────────────────────

export async function deleteMemory(memoryId: string, groupId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.event(groupId))
  redirect(ROUTES.event(groupId))
}

// ── Toggle reaction ───────────────────────────────────────────────────────────

export async function toggleReaction(
  memoryId: string,
  reactionType: 'heart' | 'moved' | 'proud' | 'funny' | 'favourite'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Check if already reacted with this type
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('memory_id', memoryId)
    .eq('user_id', user.id)
    .eq('type', reactionType)
    .single()

  if (existing) {
    // Remove reaction
    await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id)
  } else {
    // Add reaction
    await supabase
      .from('reactions')
      .insert({ memory_id: memoryId, user_id: user.id, type: reactionType })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// ── Add comment ───────────────────────────────────────────────────────────────

export async function addComment(memoryId: string, content: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!content.trim()) return { error: 'Comment cannot be empty.' }

  const { error } = await supabase
    .from('comments')
    .insert({ memory_id: memoryId, author_id: user.id, content: content.trim() })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

// ── Delete comment ────────────────────────────────────────────────────────────

export async function deleteComment(commentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
