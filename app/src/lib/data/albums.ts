import { createClient } from '@/lib/supabase/server'
import type { AlbumWithPreview } from '@/lib/types'

// ── Fetch all albums for a group ──────────────────────────────────────────────

export async function getGroupAlbums(groupId: string): Promise<AlbumWithPreview[]> {
  const supabase = await createClient()

  const { data: albums, error } = await supabase
    .from('albums')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error || !albums?.length) return []

  // For each album: get memory count + first 4 photo URLs for the mosaic
  const enriched = await Promise.all(
    albums.map(async (album: any) => {
      const [{ count }, { data: recentMemories }] = await Promise.all([
        supabase
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .eq('album_id', album.id),
        supabase
          .from('memories')
          .select('id')
          .eq('album_id', album.id)
          .order('taken_at', { ascending: false, nullsFirst: false })
          .limit(4),
      ])

      let coverPhotos: string[] = []
      if (recentMemories?.length) {
        const { data: media } = await supabase
          .from('media_items')
          .select('url, thumbnail_url')
          .in('memory_id', recentMemories.map((m: any) => m.id))
          .eq('type', 'photo')
          .order('sort_order')
          .limit(4)
        coverPhotos = (media ?? []).map((m: any) => m.thumbnail_url ?? m.url)
      }

      return {
        id:          album.id,
        groupId:     album.group_id,
        title:       album.title,
        description: album.description ?? undefined,
        coverUrl:    album.cover_url   ?? undefined,
        createdBy:   album.created_by,
        createdAt:   album.created_at,
        updatedAt:   album.updated_at,
        memoryCount: count ?? 0,
        coverPhotos,
      } satisfies AlbumWithPreview
    })
  )

  return enriched
}

// ── Fetch a single album ──────────────────────────────────────────────────────

export async function getAlbum(albumId: string): Promise<AlbumWithPreview | null> {
  const supabase = await createClient()

  const { data: album, error } = await supabase
    .from('albums')
    .select('*')
    .eq('id', albumId)
    .single()

  if (error || !album) return null

  const { count } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', albumId)

  return {
    id:          (album as any).id,
    groupId:     (album as any).group_id,
    title:       (album as any).title,
    description: (album as any).description ?? undefined,
    coverUrl:    (album as any).cover_url   ?? undefined,
    createdBy:   (album as any).created_by,
    createdAt:   (album as any).created_at,
    updatedAt:   (album as any).updated_at,
    memoryCount: count ?? 0,
    coverPhotos: [],
  }
}
