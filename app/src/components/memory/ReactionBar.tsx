'use client'

import { useState, useTransition } from 'react'
import { toggleReaction } from '@/lib/actions/memories'
import { cn } from '@/lib/utils'
import type { ReactionSummary, ReactionType } from '@/lib/types'
import { REACTION_LABELS } from '@/lib/constants'

const REACTION_ICONS: Record<ReactionType, string> = {
  heart:     '♥',
  moved:     '✿',
  proud:     '★',
  funny:     '☺',
  favourite: '✦',
}

const ALL_REACTIONS: ReactionType[] = ['heart', 'moved', 'proud', 'funny', 'favourite']

interface ReactionBarProps {
  memoryId: string
  reactions: ReactionSummary[]
}

export function ReactionBar({ memoryId, reactions: initial }: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(initial)
  const [isPending, startTransition] = useTransition()

  function handleToggle(type: ReactionType) {
    // Optimistic update
    setReactions(prev => {
      const existing = prev.find(r => r.type === type)
      if (existing) {
        const newCount = existing.count + (existing.hasReacted ? -1 : 1)
        if (newCount === 0) return prev.filter(r => r.type !== type)
        return prev.map(r =>
          r.type === type ? { ...r, count: newCount, hasReacted: !r.hasReacted } : r
        )
      }
      return [...prev, { type, count: 1, hasReacted: true }].sort(
        (a, b) => b.count - a.count
      )
    })

    startTransition(async () => {
      await toggleReaction(memoryId, type)
    })
  }

  // Build a map for quick lookup
  const byType = Object.fromEntries(reactions.map(r => [r.type, r]))

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        {ALL_REACTIONS.map(type => {
          const r = byType[type]
          const hasReacted = r?.hasReacted ?? false
          const count = r?.count ?? 0

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleToggle(type)}
              disabled={isPending}
              title={REACTION_LABELS[type]}
              className={cn(
                'reaction group flex items-center gap-1.5 transition-all',
                hasReacted && 'active scale-110',
                isPending && 'opacity-60 cursor-wait'
              )}
            >
              <span className="text-lg leading-none">{REACTION_ICONS[type]}</span>
              {count > 0 && (
                <span className={cn(
                  'text-xs font-semibold tabular-nums',
                  hasReacted ? 'text-flame' : 'text-ink-soft'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
