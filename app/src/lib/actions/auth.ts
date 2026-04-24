'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'

// ── Sign up ───────────────────────────────────────────────────────────────────

// useFormState requires (prevState, formData) => State signature
export async function signUp(_prev: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient()

  const name     = (formData.get('name')     as string).trim()
  const email    = (formData.get('email')    as string).trim()
  const password = (formData.get('password') as string)

  if (!name || !email || !password) {
    return { error: 'All fields are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    return { error: error.message }
  }

  const inviteCode = (formData.get('inviteCode') as string | null)?.trim()
  redirect(inviteCode ? ROUTES.join(inviteCode) : ROUTES.dashboard)
}

// ── Sign in ───────────────────────────────────────────────────────────────────

export async function signIn(_prev: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient()

  const email    = (formData.get('email')    as string).trim()
  const password = (formData.get('password') as string)

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  const inviteCode = (formData.get('inviteCode') as string | null)?.trim()
  redirect(inviteCode ? ROUTES.join(inviteCode) : ROUTES.dashboard)
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(ROUTES.home)
}

// ── Update profile ────────────────────────────────────────────────────────────

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name = (formData.get('name') as string).trim()
  const bio  = (formData.get('bio')  as string | null)?.trim() ?? null

  if (!name) return { error: 'Name is required.' }

  const { error } = await supabase
    .from('profiles')
    .update({ name, bio })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath(ROUTES.profile)
  return { success: true }
}
