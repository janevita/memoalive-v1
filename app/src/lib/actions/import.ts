'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ImportPhoto {
  url:          string          // already uploaded to Supabase Storage
  thumbnailUrl: string | null
  takenAt:      string | null   // ISO string
}

export interface ImportCluster {
  name:      string
  startTime: string | null      // ISO string
  endTime:   string | null      // ISO string
  location:  string | null
  photos:    ImportPhoto[]
}

export interface ImportResult {
  eventId:   string
  eventName: string
  memoryId:  string
}

// ── Action ────────────────────────────────────────────────────────────────────

/**
 * Create one event + one memory per cluster.
 * Called after photos are uploaded to Storage on the client side.
 */
export async function importClusters(
  clusters: ImportCluster[]
): Promise<{ results?: ImportResult[]; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const results: ImportResult[] = []

  for (const cluster of clusters) {
    // 1 — Create the event
    const eventId = randomUUID()
    const { error: eventErr } = await supabase.from('events').insert({
      id:       eventId,
      name:     cluster.name,
      owner_id: user.id,
    } as any)

    if (eventErr) {
      console.error('importClusters: event insert error', eventErr)
      continue
    }

    // 2 — Add creator as admin participant
    await supabase.from('event_participants').insert({
      event_id:  eventId,
      user_id:   user.id,
      role:      'admin',
    } as any)

    // 3 — Create one memory for the whole cluster
    const memoryId = randomUUID()
    const title    = cluster.location
      ? `Photos from ${cluster.location}`
      : cluster.name

    const { error: memErr } = await supabase.from('memories').insert({
      id:         memoryId,
      group_id:   eventId,
      author_id:  user.id,
      title,
      genre:      'documentary',
      taken_at:   cluster.startTime ?? null,
      visibility: 'group',
    } as any)

    if (memErr) {
      console.error('importClusters: memory insert error', memErr)
      continue
    }

    // 4 — Insert media items
    if (cluster.photos.length > 0) {
      await supabase.from('media_items').insert(
        cluster.photos.map((p, i) => ({
          memory_id:     memoryId,
          url:           p.url,
          thumbnail_url: p.thumbnailUrl ?? null,
          type:          'photo' as const,
          sort_order:    i,
        }))
      )
    }

    results.push({ eventId, eventName: cluster.name, memoryId })
    revalidatePath(ROUTES.dashboard)
  }

  return { results }
}
