'use client'

/**
 * EventActions — inline edit + delete for the event header.
 * Shown only to the event owner / admin.
 */

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { updateEvent, deleteEvent } from '@/lib/actions/events'

interface Props {
  eventId:     string
  name:        string
  description: string | undefined
}

export function EventActions({ eventId, name, description }: Props) {
  const router = useRouter()
  const [mode, setMode]               = useState<'idle' | 'edit' | 'confirm-delete'>('idle')
  const [editName, setEditName]       = useState(name)
  const [editDesc, setEditDesc]       = useState(description ?? '')
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit') nameRef.current?.focus()
  }, [mode])

  function handleEdit() {
    setEditName(name)
    setEditDesc(description ?? '')
    setError(null)
    setMode('edit')
  }

  function handleSave() {
    const trimmed = editName.trim()
    if (!trimmed) { setError('Name cannot be empty.'); return }
    setError(null)

    const formData = new FormData()
    formData.set('name', trimmed)
    formData.set('description', editDesc.trim())

    startTransition(async () => {
      const result = await updateEvent(eventId, formData)
      if (result?.error) { setError(result.error); return }
      router.refresh()
      setMode('idle')
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(eventId)
      // deleteEvent redirects, no further action needed
    })
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  if (mode === 'edit') {
    return (
      <div className="w-full space-y-4 bg-surface rounded-2xl border border-ink/10 p-5">
        <h2 className="font-serif text-base font-semibold text-ink">Edit event</h2>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-soft mb-1 block">Name</label>
            <input
              ref={nameRef}
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="input w-full"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft mb-1 block">
              Description <span className="text-ink-faint font-normal">(optional)</span>
            </label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={3}
              className="input w-full resize-none"
              placeholder="What's this event about?"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn btn-primary btn-sm btn-pill flex-1"
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            disabled={isPending}
            className="btn btn-ghost btn-sm btn-pill"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Delete confirm ────────────────────────────────────────────────────────

  if (mode === 'confirm-delete') {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
        <p className="text-sm text-red-800 font-medium">
          Delete this event? All memories and photos will be permanently removed.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="btn btn-sm btn-pill bg-red-500 text-white hover:bg-red-600 flex-1"
          >
            {isPending ? 'Deleting…' : 'Yes, delete event'}
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            disabled={isPending}
            className="btn btn-ghost btn-sm btn-pill"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Idle: show action buttons ─────────────────────────────────────────────

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleEdit}
        className="btn btn-ghost btn-sm btn-pill text-ink-soft hover:text-ink"
        title="Edit event"
      >
        <PencilIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline ml-1">Edit</span>
      </button>
      <button
        type="button"
        onClick={() => setMode('confirm-delete')}
        className="btn btn-ghost btn-sm btn-pill text-ink-soft hover:text-red-500"
        title="Delete event"
      >
        <TrashIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline ml-1">Delete</span>
      </button>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  )
}
