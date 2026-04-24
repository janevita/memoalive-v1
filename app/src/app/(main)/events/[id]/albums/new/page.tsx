'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { createAlbum } from '@/lib/actions/albums'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
      {pending ? 'Creating…' : 'Create album'}
    </button>
  )
}

export default function NewAlbumPage({ params }: { params: { id: string } }) {
  const [state, action] = useFormState(createAlbum, undefined)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={ROUTES.event(params.id)}
          className="w-9 h-9 rounded-full bg-ink/5 flex items-center justify-center text-ink-soft hover:bg-ink/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <p className="text-eyebrow mb-0.5">New album</p>
          <h1 className="font-serif text-2xl font-bold text-ink leading-tight">Create an album</h1>
        </div>
      </div>

      <form action={action} className="space-y-5">
        <input type="hidden" name="groupId" value={params.id} />

        {state?.error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            Album name <span className="text-flame">*</span>
          </label>
          <input
            name="title"
            type="text"
            className="input"
            placeholder="Férias no Brasil · Natal 2024"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            Description <span className="text-ink-faint font-normal">(optional)</span>
          </label>
          <textarea
            name="description"
            className="input min-h-[80px] resize-none"
            placeholder="What's this album about?"
          />
        </div>

        {/* Visual hint */}
        <div className="rounded-2xl border border-dashed border-ink/12 bg-surface/60 px-5 py-4 text-sm text-ink-soft">
          <p className="font-semibold text-ink-mid mb-1">Tip</p>
          <p>Albums let you group memories by trip, season, or occasion — like "Natal 2024" inside your event. You can add memories to this album when you create them.</p>
        </div>

        <SubmitButton />
      </form>
    </div>
  )
}
