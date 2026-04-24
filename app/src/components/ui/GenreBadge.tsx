import { GENRE_CONFIG } from '@/lib/utils'
import { Genre } from '@/lib/types'
import { cn } from '@/lib/utils'

interface GenreBadgeProps {
  genre: Genre
  size?: 'sm' | 'md'
  className?: string
}

export function GenreBadge({ genre, size = 'sm', className }: GenreBadgeProps) {
  const config = GENRE_CONFIG[genre]

  return (
    <span
      className={cn(
        'genre-badge',
        `genre-${genre}`,
        size === 'md' && 'text-sm px-3 py-1',
        className
      )}
    >
      {config.label}
    </span>
  )
}
