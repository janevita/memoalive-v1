import { searchMemories } from '@/lib/data/memories'
import { SearchClient } from '@/components/memory/SearchClient'
import type { Genre } from '@/lib/types'

export const metadata = { title: 'Search · Memoalive' }

// Server Component: handles initial search from URL params
export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; genre?: string }
}) {
  const query = searchParams.q?.trim() ?? ''
  const genre = searchParams.genre as Genre | undefined

  const results = query
    ? await searchMemories(query, { genre })
    : []

  return (
    <SearchClient
      initialQuery={query}
      initialGenre={genre}
      initialResults={results}
    />
  )
}
