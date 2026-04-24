'use client'

/**
 * MediaGallery — photo / video display with optional delete + caption-edit
 * controls for the memory author.
 */

import { useState, useTransition } from 'react'
import { deleteMediaItem, updateMediaCaption } from '@/lib/actions/memories'
import type { MediaItem } from '@/lib/types'

interface Props {
  items:     MediaItem[]
  memoryId:  string
  groupId:   string
  canEdit:   boolean   // true when current user is the memory author
}

export function MediaGallery({ items: initial, memoryId, groupId, canEdit }: Props) {
  const [items, setItems]           = useState<MediaItem[]>(initial)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (items.length === 0) return null

  const cover = items[0]!
  const rest  = items.slice(1)

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(itemId: string) {
    setDeletingId(itemId)
    setError(null)
    startTransition(async () => {
      const result = await deleteMediaItem(itemId, memoryId, groupId)
      if (result.error) {
        setError(result.error)
        setDeletingId(null)
        return
      }
      setItems(prev => prev.filter(i => i.id !== itemId))
      setDeletingId(null)
    })
  }

  // ── Caption ───────────────────────────────────────────────────────────────

  function startEditCaption(item: MediaItem) {
    setEditingId(item.id)
    setEditCaption(item.caption ?? '')
    setError(null)
  }

  function handleSaveCaption(itemId: string) {
    startTransition(async () => {
      const result = await updateMediaCaption(itemId, memoryId, groupId, editCaption)
      if (result.error) { setError(result.error); return }
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, caption: editCaption.trim() || undefined } : i))
      setEditingId(null)
    })
  }

  return (
    <div className="mb-6">
      {error && (
        <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cover image */}
      <div className="rounded-2xl overflow-hidden bg-ink/5 relative group mb-2">
        {cover.type === 'video' ? (
          <video
            src={cover.url}
            controls
            className="w-full aspect-video object-cover"
            poster={cover.thumbnailUrl}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={cover.caption ?? ''}
            className="w-full object-cover max-h-[500px]"
          />
        )}

        {/* Edit overlay on cover */}
        {canEdit && (
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => startEditCaption(cover)}
              className="photo-action-btn"
              title="Edit caption"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(cover.id)}
              disabled={deletingId === cover.id || isPending}
              className="photo-action-btn hover:bg-red-500"
              title="Delete photo"
            >
              {deletingId === cover.id ? '…' : <XIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Caption display / edit */}
        {editingId === cover.id ? (
          <CaptionEditor
            value={editCaption}
            onChange={setEditCaption}
            onSave={() => handleSaveCaption(cover.id)}
            onCancel={() => setEditingId(null)}
            isPending={isPending}
          />
        ) : cover.caption ? (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink/70 to-transparent px-4 py-3">
            <p className="text-white text-sm leading-snug">{cover.caption}</p>
          </div>
        ) : null}
      </div>

      {/* Thumbnail strip for extra photos */}
      {rest.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rest.map(item => (
            <div key={item.id} className="relative flex-shrink-0 group">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnailUrl ?? item.url}
                  alt={item.caption ?? ''}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Edit overlay on thumbnails */}
              {canEdit && (
                <div className="absolute inset-0 rounded-xl flex items-start justify-end p-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-ink/20">
                  <button
                    type="button"
                    onClick={() => startEditCaption(item)}
                    className="photo-action-btn !p-1"
                    title="Edit caption"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id || isPending}
                    className="photo-action-btn !p-1 hover:bg-red-500"
                    title="Delete photo"
                  >
                    {deletingId === item.id ? '…' : <XIcon className="w-3 h-3" />}
                  </button>
                </div>
              )}

              {/* Caption popover for thumbnails */}
              {editingId === item.id && (
                <div className="absolute left-0 top-[88px] z-20 w-64 bg-canvas border border-ink/10 rounded-xl shadow-lg p-3">
                  <CaptionEditor
                    value={editCaption}
                    onChange={setEditCaption}
                    onSave={() => handleSaveCaption(item.id)}
                    onCancel={() => setEditingId(null)}
                    isPending={isPending}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Caption editor ────────────────────────────────────────────────────────────

function CaptionEditor({
  value, onChange, onSave, onCancel, isPending, compact = false,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  compact?: boolean
}) {
  return (
    <div className={compact ? 'space-y-2' : 'absolute bottom-0 inset-x-0 bg-ink/80 p-3 space-y-2'}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Add a caption…"
        rows={2}
        className={[
          'w-full rounded-lg px-3 py-2 text-sm resize-none outline-none',
          compact
            ? 'bg-surface border border-ink/15 text-ink'
            : 'bg-white/15 text-white placeholder:text-white/50 border border-white/20',
        ].join(' ')}
        autoFocus
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="btn btn-sm btn-pill btn-primary flex-1"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost btn-sm btn-pill"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
