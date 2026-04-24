import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getAlbum } from '@/lib/data/albums'
import { getGroupMemories } from '@/lib/data/memories'
import { MemoryCard } from '@/components/memory/MemoryCard'

interface AlbumPageProps {
  params: { id: string; albumId: string }
}

export async function generateMetadata({ params }: AlbumPageProps) {
  const album = await getAlbum(params.albumId)
  return { title: album ? `${album.title} · Memoalive` : 'Album' }
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const [album, memories] = await Promise.all([
    getAlbum(params.albumId),
    getGroupMemories(params.id, { albumId: params.albumId, limit: 40 }),
  ])

  if (!album || album.groupId !== params.id) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={ROUTES.event(params.id)}
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors mb-5"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to event
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-eyebrow mb-1">Album</p>
            <h1 className="font-serif text-3xl font-bold text-ink leading-tight mb-2">
              {album.title}
            </h1>
            {album.description && (
              <p className="text-sm text-ink-soft mb-3">{album.description}</p>
            )}
            <p className="text-xs text-ink-faint">
              {album.memoryCount} {album.memoryCount === 1 ? 'memory' : 'memories'}
            </p>
          </div>

          <Link
            href={`${ROUTES.newMemory}?groupId=${params.id}&albumId=${params.albumId}`}
            className="btn btn-primary btn-sm btn-pill flex-shrink-0"
          >
            + Add memory
          </Link>
        </div>
      </div>

      {/* Memory feed */}
      {memories.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-full bg-flame-glow flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#F9761C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path d="M21 15l-5-5L5 19" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-semibold text-ink mb-2">No memories yet</h3>
          <p className="text-sm text-ink-soft mb-6 max-w-xs mx-auto">
            Add the first memory to this album.
          </p>
          <Link
            href={`${ROUTES.newMemory}?groupId=${params.id}&albumId=${params.albumId}`}
            className="btn btn-primary btn-md btn-pill"
          >
            Add first memory
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map(memory => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              groupId={params.id}
              variant="feed"
            />
          ))}
        </div>
      )}
    </div>
  )
}
