'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { signUp } from '@/lib/actions/auth'
import { ROUTES } from '@/lib/constants'
import { Suspense } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full mt-2">
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  )
}

function SignupForm() {
  const [state, action] = useFormState(signUp, undefined)
  const searchParams = useSearchParams()
  const inviteCode   = searchParams.get('invite')

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href={ROUTES.home} className="inline-block">
            <span className="font-serif text-4xl font-bold text-ink">
              Memo<span className="text-flame">alive</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-ink-soft">
            {inviteCode
              ? 'Create a free account to join the group'
              : 'Start keeping memories with your people'}
          </p>
        </div>
        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {state.error}
            </div>
          )}
          {inviteCode && <input type="hidden" name="inviteCode" value={inviteCode} />}
          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">Your name</label>
            <input name="name" type="text" className="input" placeholder="Rosa Costa"
              autoComplete="name" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">Email</label>
            <input name="email" type="email" className="input" placeholder="you@example.com"
              autoComplete="email" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">Password</label>
            <input name="password" type="password" className="input" placeholder="Min. 8 characters"
              autoComplete="new-password" minLength={8} required />
          </div>
          <SubmitButton />
        </form>
        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{' '}
          <Link
            href={inviteCode ? `${ROUTES.login}?invite=${inviteCode}` : ROUTES.login}
            className="text-flame font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
