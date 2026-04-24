'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'

// ── Create album ──────────────────────────────────────────────────────────────

export async function createAlbum(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const groupId     = (formData.get('groupId')     as string).trim()
  const title       = (formData.get('title')       as string).trim()
  const description = (formData.get('description') as string | null)?.trim() ?? null

  if (!groupId) return { error: 'Event is required.' }
  if (!title)   return { error: 'Album title is required.' }

  const albumId = randomUUID()

  const { error } = await supabase
    .from('albums')
    .insert({ id: albumId, group_id: groupId, title, description, created_by: user.id } as any)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.event(groupId))
  redirect(ROUTES.album(groupId, albumId))
}

// ── Delete album ──────────────────────────────────────────────────────────────

export async function deleteAlbum(albumId: string, groupId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.event(groupId))
  redirect(ROUTES.event(groupId))
}

// ── Update album ──────────────────────────────────────────────────────────────

export async function updateAlbum(albumId: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const title       = (formData.get('title')       as string).trim()
  const description = (formData.get('description') as string | null)?.trim() ?? null

  if (!title) return { error: 'Album title is required.' }

  const { data: album, error } = await supabase
    .from('albums')
    .update({ title, description } as any)
    .eq('id', albumId)
    .select('group_id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(ROUTES.album((album as any).group_id, albumId))
  revalidatePath(ROUTES.event((album as any).group_id))
  return { success: true }
}
