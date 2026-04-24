import Link from 'next/link'
import { MemoryWithDetails } from '@/lib/types'
import { ROUTES } from '@/lib/constants'
import { cn, formatRelativeDate, GENRE_CONFIG } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { MemoryImage } from './MemoryImage'

const REACTION_ICONS: Record<string, string> = {
  heart:     '♥',
  moved:     '✿',
  proud:     '★',
  funny:     '☺',
  favourite: '✦',
}

interface MemoryCardProps {
  memory: MemoryWithDetails
  groupId: string
  variant?: 'feed' | 'grid'
  className?: string
}

export function MemoryCard({ memory, groupId, variant = 'feed', className }: MemoryCardProps) {
  const href = ROUTES.memory(groupId, memory.id)
  const coverMedia = memory.media?.[0] ?? null
  const totalReactions = memory.reactions?.reduce((s, r) => s + r.count, 0) ?? 0

  if (variant === 'grid') {
    return (
      <Link href={href} className={cn('group block', className)}>
        <div className="aspect-square rounded-xl overflow-hidden relative bg-ink/5">
          {coverMedia?.thumbnailUrl ? (
            <MemoryImage
              src={coverMedia.thumbnailUrl}
              alt={memory.title}
              genre={memory.genre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-faint text-4xl">
              {GENRE_CONFIG[memory.genre]?.label ?? '✦'}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white text-sm font-semibold line-clamp-2 leading-snug">
              {memory.title}
            </p>
          </div>
        </div>
      </Link>
    )
  }

  // Feed variant
  return (
    <article className={cn('card overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <Avatar
          name={memory.author?.name ?? 'Unknown'}
          src={memory.author?.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">
            {memory.author?.name ?? 'Unknown'}
          </p>
          <p className="text-xs text-ink-soft">
            {formatRelativeDate(memory.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {memory.visibility === 'public' && (
            <span title="Public memory" className="text-cobalt">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
            </span>
          )}
          <GenreBadge genre={memory.genre} />
        </div>
      </div>

      {/* Cover media */}
      {coverMedia?.url && (
        <Link href={href}>
          <div className="relative overflow-hidden bg-ink/5" style={{ aspectRatio: '4/3' }}>
            <MemoryImage
              src={coverMedia.thumbnailUrl ?? coverMedia.url}
              alt={memory.title}
              genre={memory.genre}
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
            />
            {memory.media && memory.media.length > 1 && (
              <div className="absolute top-3 right-3 bg-ink/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                +{memory.media.length - 1}
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Body */}
      <div className="px-4 py-3">
        <Link href={href}>
          <h3 className="font-serif text-lg font-semibold text-ink leading-snug hover:text-flame transition-colors mb-1">
            {memory.title}
          </h3>
        </Link>
        {memory.content && (
          <p className="text-sm text-ink-soft line-clamp-3 leading-relaxed">
            {memory.content}
          </p>
        )}
        {memory.takenAt && (
          <p className="text-xs text-ink-faint mt-2">
            {new Date(memory.takenAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Reactions + comment count */}
      {(totalReactions > 0 || memory.commentCount > 0) && (
        <div className="px-4 pb-4 flex items-center gap-3">
          {totalReactions > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-0.5">
                {memory.reactions?.slice(0, 3).map(r => (
                  <span key={r.type} className="text-base">
                    {REACTION_ICONS[r.type] ?? '✦'}
                  </span>
                ))}
              </div>
              <span className="text-xs text-ink-soft">{totalReactions}</span>
            </div>
          )}
          {memory.commentCount > 0 && (
            <Link href={href} className="text-xs text-ink-soft hover:text-ink transition-colors">
              {memory.commentCount} comment{memory.commentCount !== 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}
    </article>
  )
}
