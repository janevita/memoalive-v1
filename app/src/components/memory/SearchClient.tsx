'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GENRES } from '@/lib/constants'
import type { Genre, MemoryWithDetails } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { searchMemoriesAction } from '@/lib/actions/search'

const GENRE_LABELS: Record<string, string> = {
  adventure: 'Adventure', drama: 'Drama', comedy: 'Comedy',
  romance: 'Romance', 'coming-of-age': 'Coming of Age', documentary: 'Documentary',
}

interface SearchClientProps {
  initialQuery:   string
  initialGenre?:  Genre
  initialResults: MemoryWithDetails[]
}

export function SearchClient({ initialQuery, initialGenre, initialResults }: SearchClientProps) {
  const router      = useRouter()
  const [query,   setQuery]   = useState(initialQuery)
  const [genre,   setGenre]   = useState<Genre | undefined>(initialGenre)
  const [results, setResults] = useState<MemoryWithDetails[]>(initialResults)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Push updated search params to URL (for shareability / back-button)
  const updateUrl = useCallback((q: string, g?: Genre) => {
    const params = new URLSearchParams()
    if (q)  params.set('q', q)
    if (g)  params.set('genre', g)
    router.replace(`/search?${params.toString()}`, { scroll: false })
  }, [router])

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() && !genre) { setResults([]); return }

    debounceRef.current = setTimeout(() => {
      updateUrl(query, genre)
      startTransition(async () => {
        const res = await searchMemoriesAction(query, { genre })
        setResults(res)
      })
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, genre, updateUrl])

  function toggleGenre(g: Genre) {
    setGenre(prev => prev === g ? undefined : g)
  }

  const hasQuery = query.trim().length > 0 || genre !== undefined

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-eyebrow mb-1">Search</p>
        <h1 className="font-serif text-3xl font-bold text-ink leading-tight">Find memories</h1>
      </div>

      {/* Search input */}
      <div className="relative mb-5">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none"
          viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="input pl-11"
          placeholder="Search memories, people, places…"
          autoFocus
        />
        {isPending && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-flame/40 border-t-flame rounded-full animate-spin" />
        )}
      </div>

      {/* Genre filter chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setGenre(undefined)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
            !genre ? 'bg-ink text-canvas' : 'bg-ink/8 text-ink-soft hover:bg-ink/12'
          )}
        >
          All
        </button>
        {GENRES.map(g => (
          <button
            key={g}
            type="button"
            onClick={() => toggleGenre(g as Genre)}
            className={cn(
              'genre-badge cursor-pointer transition-all',
              `genre-${g}`,
              genre === g && 'ring-2 ring-offset-1 ring-flame scale-105'
            )}
          >
            {GENRE_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Results */}
      {hasQuery ? (
        results.length > 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-ink-faint">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                groupId={memory.groupId}
                variant="feed"
              />
            ))}
          </div>
        ) : (
          !isPending && (
            <div className="card p-10 text-center">
              <p className="text-sm text-ink-soft">No memories found for "{query}".</p>
              {genre && (
                <button
                  type="button"
                  onClick={() => setGenre(undefined)}
                  className="text-xs text-flame font-semibold mt-2 hover:underline"
                >
                  Clear genre filter
                </button>
              )}
            </div>
          )
        )
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-mid uppercase tracking-wide mb-4">Browse by genre</p>
          {GENRES.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGenre(g as Genre)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-ink/8 hover:border-flame/30 hover:bg-flame-glow/20 transition-colors text-left"
            >
              <span className={cn('genre-badge', `genre-${g}`)}>{GENRE_LABELS[g]}</span>
              <span className="text-sm text-ink-soft">Browse {GENRE_LABELS[g].toLowerCase()} memories</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
