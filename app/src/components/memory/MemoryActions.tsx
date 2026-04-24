'use client'

/**
 * MemoryActions — edit and delete controls for a memory.
 * Shown only to the memory author.
 */

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateMemory, deleteMemory } from '@/lib/actions/memories'
import type { Genre } from '@/lib/types'
import { GENRES } from '@/lib/constants'

interface Props {
  memoryId:  string
  groupId:   string
  title:     string
  content:   string | undefined
  genre:     Genre
  takenAt:   string | undefined
}

export function MemoryActions({ memoryId, groupId, title, content, genre, takenAt }: Props) {
  const router = useRouter()
  const [mode, setMode]               = useState<'idle' | 'edit' | 'confirm-delete'>('idle')
  const [editTitle, setEditTitle]     = useState(title)
  const [editContent, setEditContent] = useState(content ?? '')
  const [editGenre, setEditGenre]     = useState<Genre>(genre)
  const [editTakenAt, setEditTakenAt] = useState(takenAt ? takenAt.slice(0, 10) : '')
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit') titleRef.current?.focus()
  }, [mode])

  function openEdit() {
    setEditTitle(title)
    setEditContent(content ?? '')
    setEditGenre(genre)
    setEditTakenAt(takenAt ? takenAt.slice(0, 10) : '')
    setError(null)
    setMode('edit')
  }

  function handleSave() {
    if (!editTitle.trim()) { setError('Title is required.'); return }
    setError(null)
    startTransition(async () => {
      const result = await updateMemory(memoryId, groupId, {
        title:   editTitle.trim(),
        content: editContent.trim() || undefined,
        genre:   editGenre,
        takenAt: editTakenAt || null,
      })
      if (result?.error) { setError(result.error); return }
      router.refresh()
      setMode('idle')
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteMemory(memoryId, groupId)
      // deleteMemory redirects to the event page
    })
  }

  // ── Edit form ─────────────────────────────────────────────────────────────

  if (mode === 'edit') {
    return (
      <div className="mb-6 bg-surface rounded-2xl border border-ink/10 p-5 space-y-4">
        <h2 className="font-serif text-base font-semibold text-ink">Edit memory</h2>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-ink-soft mb-1 block">Title</label>
            <input
              ref={titleRef}
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-soft mb-1 block">
              Story <span className="text-ink-faint font-normal">(optional)</span>
            </label>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={4}
              className="input w-full resize-none"
              placeholder="Share the story behind this memory…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-soft mb-1 block">Genre</label>
              <select
                value={editGenre}
                onChange={e => setEditGenre(e.target.value as Genre)}
                className="input w-full"
              >
                {GENRES.map(g => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft mb-1 block">Date taken</label>
              <input
                type="date"
                value={editTakenAt}
                onChange={e => setEditTakenAt(e.target.value)}
                className="input w-full"
              />
            </div>
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
      <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
        <p className="text-sm text-red-800 font-medium">
          Delete this memory? Photos and comments will also be removed.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="btn btn-sm btn-pill bg-red-500 text-white hover:bg-red-600 flex-1"
          >
            {isPending ? 'Deleting…' : 'Yes, delete'}
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

  // ── Idle: action buttons ──────────────────────────────────────────────────

  return (
    <div className="flex items-center gap-1.5 mb-6">
      <button
        type="button"
        onClick={openEdit}
        className="btn btn-ghost btn-sm btn-pill text-ink-soft hover:text-ink"
      >
        <PencilIcon className="w-3.5 h-3.5" />
        <span className="ml-1.5">Edit memory</span>
      </button>
      <button
        type="button"
        onClick={() => setMode('confirm-delete')}
        className="btn btn-ghost btn-sm btn-pill text-ink-soft hover:text-red-500"
      >
        <TrashIcon className="w-3.5 h-3.5" />
        <span className="ml-1.5">Delete</span>
      </button>
    </div>
  )
}

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
