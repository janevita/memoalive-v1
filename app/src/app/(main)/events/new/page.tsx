'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { createEvent } from '@/lib/actions/events'
import { ROUTES } from '@/lib/constants'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
      {pending ? 'Creating…' : 'Create event'}
    </button>
  )
}

export default function NewEventPage() {
  const [state, action] = useFormState(createEvent, undefined)

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={ROUTES.dashboard}
          className="w-9 h-9 rounded-full bg-ink/5 flex items-center justify-center text-ink-soft hover:text-ink hover:bg-ink/10 transition-colors flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <p className="text-eyebrow mb-0.5">New event</p>
          <h1 className="font-serif text-2xl font-bold text-ink leading-tight">
            Create a memory event
          </h1>
        </div>
      </div>

      <form action={action} className="space-y-6">
        {state?.error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            Event name <span className="text-flame">*</span>
          </label>
          <input
            name="name"
            type="text"
            className="input"
            placeholder="Costa family · Barcelona trip · Christmas 2024"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            Description <span className="text-ink-faint">(optional)</span>
          </label>
          <textarea
            name="description"
            className="input min-h-[80px] resize-none"
            placeholder="What is this event for?"
          />
        </div>

        <div className="card p-4 text-sm text-ink-soft">
          <p className="font-semibold text-ink mb-1">You'll get an invite link</p>
          <p>After creating the event you can share an invite code with family or friends. They join instantly — no accounts needed to view.</p>
        </div>

        <SubmitButton />
      </form>
    </div>
  )
}
