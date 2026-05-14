'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'
import type { ReelGenre, ReelTemplate, ReelMusic, ReelPhoto, ReelSticker } from '@/lib/types'

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateReelPayload {
  title:    string
  genre:    ReelGenre
  template: ReelTemplate | null
  music:    ReelMusic    | null
  photos:   ReelPhoto[]
  stickers: ReelSticker[]
}

export async function createReel(
  payload: CreateReelPayload
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const id = randomUUID()

  const { error } = await supabase.from('reels').insert({
    id,
    owner_id: user.id,
    title:    payload.title,
    genre:    payload.genre,
    template: payload.template,
    music:    payload.music,
    photos:   payload.photos,
    stickers: payload.stickers,
  } as any)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.reels)
  return { id }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateReel(
  reelId: string,
  payload: Partial<CreateReelPayload>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('reels')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', reelId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.reel(reelId))
  revalidatePath(ROUTES.reels)
  return {}
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteReel(reelId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('reels')
    .delete()
    .eq('id', reelId)
    .eq('owner_id', user.id)

  revalidatePath(ROUTES.reels)
  redirect(ROUTES.reels)
}

// ── Toggle sharing ────────────────────────────────────────────────────────────

export async function toggleReelSharing(
  reelId: string,
  isShared: boolean
): Promise<{ error?: string; shareToken?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('reels')
    .update({ is_shared: isShared, updated_at: new Date().toISOString() } as any)
    .eq('id', reelId)
    .eq('owner_id', user.id)
    .select('share_token')
    .single()

  if (error) return { error: error.message }

  revalidatePath(ROUTES.reel(reelId))
  return { shareToken: (data as any)?.share_token }
}

// ── Update title ──────────────────────────────────────────────────────────────

export async function updateReelTitle(
  reelId: string,
  title: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('reels')
    .update({ title, updated_at: new Date().toISOString() } as any)
    .eq('id', reelId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.reel(reelId))
  revalidatePath(ROUTES.reels)
  return {}
}
