'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'

// ── Create a group person (non-registered family member) ──────────────────────

export async function createGroupPerson(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const groupId     = formData.get('groupId')     as string
  const name        = (formData.get('name')        as string).trim()
  const nickname    = (formData.get('nickname')    as string | null)?.trim()  || null
  const relationship= (formData.get('relationship')as string | null)?.trim()  || null
  const birthYearRaw= formData.get('birthYear')    as string | null
  const hometown    = (formData.get('hometown')    as string | null)?.trim()  || null
  const bio         = (formData.get('bio')         as string | null)?.trim()  || null

  if (!name) return { error: 'Name is required.' }

  const personId  = randomUUID()
  const birthYear = birthYearRaw ? parseInt(birthYearRaw, 10) || null : null

  const { error } = await supabase
    .from('group_people')
    .insert({
      id: personId, group_id: groupId, created_by: user.id,
      name, nickname, relationship, birth_year: birthYear, hometown, bio,
    } as any)

  if (error) return { error: error.message }

  revalidatePath(`/events/${groupId}/people`)
  redirect(`/events/${groupId}/people/${personId}`)
}

// ── Update a group person ─────────────────────────────────────────────────────

export async function updateGroupPerson(personId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name         = (formData.get('name')        as string).trim()
  const nickname     = (formData.get('nickname')    as string | null)?.trim()  || null
  const relationship = (formData.get('relationship')as string | null)?.trim()  || null
  const birthYearRaw = formData.get('birthYear')    as string | null
  const hometown     = (formData.get('hometown')    as string | null)?.trim()  || null
  const bio          = (formData.get('bio')         as string | null)?.trim()  || null
  const birthYear    = birthYearRaw ? parseInt(birthYearRaw, 10) || null : null

  const { data, error } = await supabase
    .from('group_people')
    .update({ name, nickname, relationship, birth_year: birthYear, hometown, bio } as any)
    .eq('id', personId)
    .select('group_id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/events/${(data as any).group_id}/people/${personId}`)
  return { success: true }
}

// ── Add face reference photo to a group person ────────────────────────────────

export async function addFaceRef(
  personId: string,
  url: string,
  label?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Fetch current face_refs and append
  const { data: current, error: fetchErr } = await supabase
    .from('group_people')
    .select('face_refs, group_id')
    .eq('id', personId)
    .single()

  if (fetchErr || !current) return { error: 'Person not found.' }

  const refs = ((current as any).face_refs ?? []) as any[]
  refs.push({ url, label: label || null, uploadedAt: new Date().toISOString() })

  const { error } = await supabase
    .from('group_people')
    .update({ face_refs: refs } as any)
    .eq('id', personId)

  if (error) return { error: error.message }

  revalidatePath(`/events/${(current as any).group_id}/people/${personId}`)
  return { success: true }
}

// ── Remove face reference photo from a group person ───────────────────────────

export async function removeFaceRef(personId: string, index: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: current, error: fetchErr } = await supabase
    .from('group_people')
    .select('face_refs, group_id')
    .eq('id', personId)
    .single()

  if (fetchErr || !current) return { error: 'Person not found.' }

  const refs = [...((current as any).face_refs ?? [])] as any[]
  refs.splice(index, 1)

  const { error } = await supabase
    .from('group_people')
    .update({ face_refs: refs } as any)
    .eq('id', personId)

  if (error) return { error: error.message }

  revalidatePath(`/events/${(current as any).group_id}/people/${personId}`)
  return { success: true }
}

// ── Add face reference photo to logged-in user's profile ──────────────────────

export async function addProfileFaceRef(url: string, label?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: current } = await supabase
    .from('profiles')
    .select('face_refs')
    .eq('id', user.id)
    .single()

  const refs = ((current as any)?.face_refs ?? []) as any[]
  refs.push({ url, label: label || null, uploadedAt: new Date().toISOString() })

  const { error } = await supabase
    .from('profiles')
    .update({ face_refs: refs } as any)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.profile)
  return { success: true }
}

// ── Remove a face ref ─────────────────────────────────────────────────────────

export async function removeProfileFaceRef(index: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: current } = await supabase
    .from('profiles')
    .select('face_refs')
    .eq('id', user.id)
    .single()

  const refs = [... ((current as any)?.face_refs ?? [])] as any[]
  refs.splice(index, 1)

  await supabase.from('profiles').update({ face_refs: refs } as any).eq('id', user.id)
  revalidatePath(ROUTES.profile)
  return { success: true }
}

// ── Tag people in a memory ────────────────────────────────────────────────────

export async function tagMemoryPeople(
  memoryId: string,
  tags: Array<{ id: string; type: 'profile' | 'person' }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!tags.length) return { success: true }

  const rows = tags.map(t => ({
    memory_id:       memoryId,
    profile_id:      t.type === 'profile' ? t.id : null,
    group_person_id: t.type === 'person'  ? t.id : null,
    tagged_by:       user.id,
    is_ai_suggested: false,
  }))

  const { error } = await supabase.from('memory_tags').insert(rows as any)
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

// ── Update logged-in user's profile fields ────────────────────────────────────

export async function updateProfileDetails(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name         = (formData.get('name')        as string).trim()
  const nickname     = (formData.get('nickname')    as string | null)?.trim()  || null
  const relationship = (formData.get('relationship')as string | null)?.trim()  || null
  const bio          = (formData.get('bio')         as string | null)?.trim()  || null
  const hometown     = (formData.get('hometown')    as string | null)?.trim()  || null
  const birthYearRaw = formData.get('birthYear')    as string | null
  const birthYear    = birthYearRaw ? parseInt(birthYearRaw, 10) || null : null

  if (!name) return { error: 'Name is required.' }

  const { error } = await supabase
    .from('profiles')
    .update({ name, nickname, relationship, bio, hometown, birth_year: birthYear } as any)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.profile)
  return { success: true }
}
