'use client'

import { useState, useTransition, useRef } from 'react'
import { addComment } from '@/lib/actions/memories'
import { Avatar } from '@/components/ui/Avatar'
import { formatRelativeDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Comment } from '@/lib/types'

interface CommentSectionProps {
  memoryId: string
  initialComments: Comment[]
  currentUserName: string
  currentUserAvatar?: string
}

export function CommentSection({
  memoryId,
  initialComments,
  currentUserName,
  currentUserAvatar,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return

    setError(null)

    // Optimistic insert
    const optimistic: Comment = {
      id:        `opt-${Date.now()}`,
      memoryId,
      authorId:  'current',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 'current', name: currentUserName, avatarUrl: currentUserAvatar },
    }
    setComments(prev => [...prev, optimistic])
    setText('')

    startTransition(async () => {
      const result = await addComment(memoryId, content)
      if (result?.error) {
        setError(result.error)
        setComments(prev => prev.filter(c => c.id !== optimistic.id))
        setText(content)
      }
    })
  }

  return (
    <section>
      <h2 className="font-serif text-lg font-semibold text-ink mb-4">
        {comments.length > 0
          ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}`
          : 'Comments'}
      </h2>

      {comments.length === 0 && (
        <p className="text-sm text-ink-faint mb-6">No comments yet — be the first.</p>
      )}

      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar
                name={comment.author.name}
                src={comment.author.avatarUrl}
                size="sm"
                className="flex-shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-ink">{comment.author.name}</span>
                  <span className="text-xs text-ink-faint">{formatRelativeDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3 items-start">
        <Avatar
          name={currentUserName}
          src={currentUserAvatar}
          size="sm"
          className="flex-shrink-0 mt-1"
        />
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
            }}
            placeholder="Add a comment…"
            rows={1}
            className={cn(
              'input resize-none min-h-[40px] transition-all',
              text && 'min-h-[80px]'
            )}
          />
          {text && (
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isPending || !text.trim()}
                className="btn btn-primary btn-sm btn-pill"
              >
                {isPending ? 'Posting…' : 'Post'}
              </button>
            </div>
          )}
        </div>
      </form>
    </section>
  )
}
