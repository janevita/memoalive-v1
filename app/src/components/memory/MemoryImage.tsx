'use client'

/**
 * MemoryImage — thin client wrapper around <img> that replaces a broken
 * Supabase Storage URL with a tasteful placeholder. Keeps MemoryCard itself
 * a Server Component.
 */

import { useState } from 'react'

interface Props {
  src: string
  alt: string
  className?: string
  genre?: string
}

const GENRE_EMOJI: Record<string, string> = {
  adventure:    '🌄',
  drama:        '🎭',
  comedy:       '😄',
  romance:      '❤️',
  'coming-of-age': '🌱',
  documentary:  '🎞️',
}

export function MemoryImage({ src, alt, className, genre }: Props) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className={`${className ?? ''} flex flex-col items-center justify-center gap-2 bg-ink/5 text-ink-faint`}>
        <span className="text-3xl">{GENRE_EMOJI[genre ?? ''] ?? '🖼️'}</span>
        <span className="text-[11px] text-center px-4 leading-tight">{alt}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  )
}
