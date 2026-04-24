import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getMyScrapbooks } from '@/lib/data/scrapbooks'
import { ScrapbookCard } from '@/components/scrapbook/ScrapbookCard'

export const metadata = { title: 'My Scrapbooks · Memoalive' }

export default async function ScrapbooksPage() {
  const scrapbooks = await getMyScrapbooks()

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-eyebrow mb-1">Personal collection</p>
          <h1 className="font-serif text-4xl font-bold text-ink leading-tight">
            My scrapbooks
          </h1>
          <p className="text-ink-soft mt-2 text-sm">
            Curated photo books from your events and memories.
          </p>
        </div>
        <Link href={ROUTES.newScrapbook} className="btn btn-primary btn-sm btn-pill flex-shrink-0">
          + New scrapbook
        </Link>
      </div>

      {/* Empty state */}
      {scrapbooks.length === 0 && (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="font-serif text-xl font-semibold text-ink mb-2">
            Your first scrapbook awaits
          </h3>
          <p className="text-sm text-ink-soft mb-6 max-w-xs mx-auto">
            Pick favourite photos from your events and arrange them into
            a beautiful personal scrapbook.
          </p>
          <Link href={ROUTES.newScrapbook} className="btn btn-primary btn-pill btn-md">
            Create a scrapbook
          </Link>
        </div>
      )}

      {/* Grid */}
      {scrapbooks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {scrapbooks.map(sb => (
            <ScrapbookCard key={sb.id} scrapbook={sb} />
          ))}

          {/* Add new card */}
          <Link
            href={ROUTES.newScrapbook}
            className="card p-5 flex flex-col items-center justify-center gap-2 text-ink-faint hover:text-flame hover:border-flame/20 transition-colors min-h-[180px] border-dashed aspect-square"
          >
            <span className="text-2xl">+</span>
            <span className="text-xs font-semibold">New scrapbook</span>
          </Link>
        </div>
      )}
    </div>
  )
}
