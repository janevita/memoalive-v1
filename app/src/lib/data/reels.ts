import { createClient } from '@/lib/supabase/server'
import type { Reel, ReelGenre, ReelTemplate, ReelMusic, ReelPhoto, ReelSticker } from '@/lib/types'

// ── Shape helper ──────────────────────────────────────────────────────────────

function shapeReel(row: Record<string, unknown>): Reel {
  return {
    id:         row.id as string,
    ownerId:    row.owner_id as string,
    title:      row.title as string,
    genre:      row.genre as ReelGenre,
    template:   (row.template as ReelTemplate | null) ?? null,
    music:      (row.music    as ReelMusic    | null) ?? null,
    photos:     (row.photos   as ReelPhoto[]) ?? [],
    stickers:   (row.stickers as ReelSticker[]) ?? [],
    shareToken: row.share_token as string,
    isShared:   (row.is_shared as boolean) ?? false,
    createdAt:  row.created_at as string,
    updatedAt:  row.updated_at as string,
  }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function getMyReels(): Promise<Reel[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('reels')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(shapeReel)
}

export async function getReel(id: string): Promise<Reel | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('reels')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const reel = shapeReel(data as Record<string, unknown>)
  // Only return if owner or publicly shared
  if (reel.ownerId !== user?.id && !reel.isShared) return null
  return reel
}

export async function getReelByToken(token: string): Promise<Reel | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reels')
    .select('*')
    .eq('share_token', token)
    .eq('is_shared', true)
    .single()

  if (error || !data) return null
  return shapeReel(data as Record<string, unknown>)
}
