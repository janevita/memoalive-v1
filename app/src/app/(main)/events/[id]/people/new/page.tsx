'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createGroupPerson } from '@/lib/actions/people'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
      {pending ? 'Saving…' : 'Add person'}
    </button>
  )
}

export default function NewPersonPage({ params }: { params: { id: string } }) {
  const [state, action] = useFormState(createGroupPerson, undefined)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/events/${params.id}/people`}
          className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink transition-colors mb-2"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          People
        </Link>
        <h1 className="font-serif text-2xl font-bold text-ink">Add a person</h1>
        <p className="text-sm text-ink-soft mt-1">
          Add family members or friends who appear in memories but don't have an account.
        </p>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-6">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-5">
        <input type="hidden" name="groupId" value={params.id} />

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            Full name <span className="text-flame">*</span>
          </label>
          <input type="text" name="name" required className="input" placeholder="e.g. Rosa Maria Vita" autoFocus />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            Nickname <span className="text-ink-faint font-normal">(optional)</span>
          </label>
          <input type="text" name="nickname" className="input" placeholder="e.g. Grandma Rosa" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            Relationship <span className="text-ink-faint font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="relationship"
            className="input"
            placeholder="e.g. Grandmother, Uncle, Best friend…"
            list="relationship-suggestions"
          />
          <datalist id="relationship-suggestions">
            {[
              'Grandmother', 'Grandfather', 'Mother', 'Father',
              'Sister', 'Brother', 'Aunt', 'Uncle', 'Cousin',
              'Daughter', 'Son', 'Niece', 'Nephew',
              'Friend', 'Best friend', 'Partner', 'Spouse',
              'Colleague', 'Neighbour',
            ].map(r => <option key={r} value={r} />)}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">
              Birth year <span className="text-ink-faint font-normal">(optional)</span>
            </label>
            <input type="number" name="birthYear" className="input" placeholder="e.g. 1942" min="1900" max={new Date().getFullYear()} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">
              Hometown <span className="text-ink-faint font-normal">(optional)</span>
            </label>
            <input type="text" name="hometown" className="input" placeholder="e.g. São Paulo" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-mid mb-1.5">
            About them <span className="text-ink-faint font-normal">(optional)</span>
          </label>
          <textarea name="bio" className="input min-h-[80px] resize-none" placeholder="A few words to remember who they are…" />
        </div>

        <div className="pt-2">
          <SubmitButton />
          <p className="text-xs text-ink-faint text-center mt-3">
            You can add face photos for AI recognition after saving.
          </p>
        </div>
      </form>
    </div>
  )
}
