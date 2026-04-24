'use client'

/**
 * CommentPanel — displays comments and lets any visitor leave one.
 * Works for both the owner (on the edit page) and visitors (on the share page).
 * Anonymous visitors provide a display name; logged-in users use their profile name.
 */

import { useState } from 'react'
import { addComment, deleteComment } from '@/lib/actions/scrapbooks'
import type { ScrapbookComment } from '@/lib/types'

interface Props {
  scrapbookId:      string
  initialComments:  ScrapbookComment[]
  isOwner:          boolean
  /** When undefined the panel is rendered inline (no close button) */
  onClose?: () => void
  /** Pre-filled name for the comment author (e.g. logged-in user's name) */
  currentUserName?: string
  currentUserId?:   string
}

export function CommentPanel({
  scrapbookId,
  initialComments,
  isOwner,
  onClose,
  currentUserName,
  currentUserId,
}: Props) {
  const [comments, setComments] = useState<ScrapbookComment[]>(initialComments)
  const [draft,    setDraft]    = useState('')
  const [name,     setName]     = useState(currentUserName ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    const displayName = name.trim() || 'Guest'
    setSubmitting(true)
    setError(null)
    const result = await addComment(scrapbookId, draft, displayName)
    setSubmitting(false)
    if (result.error) { setError(result.error); return }

    const newComment: ScrapbookComment = {
      id:          result.id ?? crypto.randomUUID(),
      scrapbookId,
      authorName:  displayName,
      content:     draft.trim(),
      createdAt:   new Date().toISOString(),
    }
    setComments(prev => [...prev, newComment])
    setDraft('')
  }

  async function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    await deleteComment(commentId, scrapbookId)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/8">
        <h3 className="text-sm font-semibold text-ink">
          Notes & memories
          {comments.length > 0 && (
            <span className="ml-1.5 text-ink-faint font-normal">({comments.length})</span>
          )}
        </h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink text-sm">✕</button>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {comments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm text-ink-soft">Be the first to leave a note about this scrapbook.</p>
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} className="group relative">
            <div className="flex items-start gap-2.5">
              {/* Avatar initial */}
              <div className="w-7 h-7 rounded-full bg-flame/15 text-flame text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {c.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-ink">{c.authorName}</span>
                  <span className="text-[10px] text-ink-faint">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-ink-soft mt-0.5 leading-relaxed">{c.content}</p>
              </div>
            </div>
            {/* Delete (owner or author) */}
            {(isOwner || c.authorId === currentUserId) && (
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-all text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add comment form */}
      <div className="border-t border-ink/8 p-4 space-y-3">
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        {/* Name field (hidden if we already know the user) */}
        {!currentUserName && (
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="input w-full text-sm"
            maxLength={50}
          />
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Share a memory or thought…"
            rows={2}
            className="input flex-1 text-sm resize-none"
            maxLength={500}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
          />
          <button
            type="submit"
            disabled={submitting || !draft.trim()}
            className="btn btn-primary btn-pill px-4 self-end"
          >
            {submitting ? '…' : '↑'}
          </button>
        </form>
        <p className="text-[10px] text-ink-faint">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
