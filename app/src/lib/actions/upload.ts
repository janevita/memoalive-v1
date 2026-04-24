'use server'

import { createClient } from '@/lib/supabase/server'

export interface UploadSession {
  sessionId: string
  token: string
}

export interface SessionPhoto {
  id: string
  url: string
  filename: string
  createdAt: string
}

// ── Create a new upload session ───────────────────────────────────────────────

export async function createUploadSession(
  scrapbookId:    string,
  scrapbookTitle: string
): Promise<{ session?: UploadSession; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await supabase
    .from('upload_sessions')
    .insert({
      owner_id:        user.id,
      scrapbook_id:    scrapbookId   || null,
      scrapbook_title: scrapbookTitle || null,
    } as any)
    .select('id, token')
    .single()

  if (error || !data) return { error: error?.message ?? 'Could not create session.' }

  return {
    session: {
      sessionId: (data as any).id as string,
      token:     (data as any).token as string,
    },
  }
}

// ── Poll for photos uploaded in a session ─────────────────────────────────────

export async function getSessionPhotos(
  sessionId: string
): Promise<SessionPhoto[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('upload_session_photos')
    .select('id, url, filename, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((r: any) => ({
    id:        r.id        as string,
    url:       r.url       as string,
    filename:  r.filename  as string ?? '',
    createdAt: r.created_at as string,
  }))
}
