'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'

// ── Create event ──────────────────────────────────────────────────────────────

export async function createEvent(_prev: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name        = (formData.get('name')        as string).trim()
  const description = (formData.get('description') as string | null)?.trim() ?? null

  if (!name) return { error: 'Event name is required.' }

  // Generate the ID here so we can insert event + participant without a SELECT in between.
  const eventId = randomUUID()

  const { error: eventError } = await supabase
    .from('events')
    .insert({ id: eventId, name, description, owner_id: user.id })

  if (eventError) return { error: eventError.message }

  // Add owner as a participant
  const { error: memberError } = await supabase
    .from('event_participants')
    .insert({ user_id: user.id, group_id: eventId, role: 'owner' })

  if (memberError) return { error: memberError.message }

  revalidatePath(ROUTES.dashboard)
  redirect(ROUTES.event(eventId))
}

// ── Join event via invite code ─────────────────────────────────────────────────

export async function joinEvent(inviteCode: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('invite_code', inviteCode.trim())
    .single()

  if (eventError || !event) return { error: 'Invalid invite code.' }

  // Check not already a participant
  const { data: existing } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('group_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    redirect(ROUTES.event(event.id))
  }

  const { error: joinError } = await supabase
    .from('event_participants')
    .insert({ user_id: user.id, group_id: event.id, role: 'member' })

  if (joinError) return { error: joinError.message }

  revalidatePath(ROUTES.dashboard)
  redirect(ROUTES.event(event.id))
}

// ── Leave event ───────────────────────────────────────────────────────────────

export async function leaveEvent(eventId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('group_id', eventId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.dashboard)
  redirect(ROUTES.dashboard)
}

// ── Update event ──────────────────────────────────────────────────────────────

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name        = (formData.get('name')        as string).trim()
  const description = (formData.get('description') as string | null)?.trim() ?? null

  if (!name) return { error: 'Event name is required.' }

  const { error } = await supabase
    .from('events')
    .update({ name, description })
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.event(eventId))
  return { success: true }
}

// ── Delete event ──────────────────────────────────────────────────────────────

export async function deleteEvent(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.dashboard)
  redirect(ROUTES.dashboard)
}

// ── Legacy aliases ────────────────────────────────────────────────────────────
export const createGroup = createEvent
export const joinGroup   = joinEvent
export const leaveGroup  = leaveEvent
export const updateGroup = updateEvent
