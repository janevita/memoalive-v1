import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types'
import type { Tables } from '@/lib/supabase/database.types'

type ProfileRow = Tables<'profiles'>

// ── Get current authenticated user's profile ──────────────────────────────────

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) return null

  const p = profile as ProfileRow

  const [groupCountRes, memoryCountRes] = await Promise.all([
    supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('memories').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
  ])

  return {
    id:           p.id,
    email:        user.email ?? '',
    name:         p.name,
    avatarUrl:    p.avatar_url   ?? undefined,
    bio:          p.bio          ?? undefined,
    nickname:     (p as any).nickname     ?? undefined,
    relationship: (p as any).relationship ?? undefined,
    birthYear:    (p as any).birth_year   ?? undefined,
    hometown:     (p as any).hometown     ?? undefined,
    faceRefs:     (p as any).face_refs    ?? [],
    createdAt:    p.created_at,
    updatedAt:    p.updated_at,
    groupCount:   groupCountRes.count  ?? 0,
    memoryCount:  memoryCountRes.count ?? 0,
  }
}

// ── Get any user's public profile ─────────────────────────────────────────────

export async function getProfile(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, bio, created_at')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as Pick<ProfileRow, 'id' | 'name' | 'avatar_url' | 'bio' | 'created_at'>
}

// ── Upload avatar ─────────────────────────────────────────────────────────────

export async function uploadAvatar(userId: string, file: File) {
  const supabase = await createClient()

  const ext  = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)

  if (updateError) return { error: updateError.message }

  return { url: publicUrl }
}
