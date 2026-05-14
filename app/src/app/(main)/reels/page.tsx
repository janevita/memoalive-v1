import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getMyReels } from '@/lib/data/reels'
import type { Reel } from '@/lib/types'

export const metadata = { title: 'Reels · Memoalive' }

const GENRE_ICONS: Record<string, string> = {
  romance: '💕', drama: '🎭', adventure: '🌍', comedy: '😄', documentary: '📽️',
}

const GENRE_BG: Record<string, string> = {
  romance:     '#FFE0F0',
  drama:       '#2A2A3A',
  adventure:   '#E8F4E8',
  comedy:      '#FFF5CC',
  documentary: '#F0F0F0',
}

function ReelCard({ reel }: { reel: Reel }) {
  const icon       = GENRE_ICONS[reel.genre] ?? '🎬'
  const bg         = GENRE_BG[reel.genre] ?? '#F5F0E8'
  const firstPhoto = reel.photos[0]
  const dateStr    = new Date(reel.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Link
      href={ROUTES.reel(reel.id)}
      className="card overflow-hidden hover:shadow-md transition-shadow group"
    >
      {/* Thumbnail */}
      <div
        className="aspect-video w-full relative overflow-hidden"
        style={{ background: bg }}
      >
        {firstPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstPhoto.url}
            alt={reel.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">
            {icon}
          </div>
        )}
        {/* Genre badge overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/55 text-white text-[10px] font-bold px-2 py-1 rounded-full">
          {icon} {reel.genre}
        </div>
        {/* Photo count */}
        {reel.photos.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/45 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            📸 {reel.photos.length}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-serif text-base font-semibold text-ink truncate group-hover:text-flame transition-colors">
          {reel.title}
        </h3>
        <p className="text-xs text-ink-soft mt-1">{dateStr}</p>
      </div>
    </Link>
  )
}

export default async function ReelsPage() {
  const reels = await getMyReels()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 sm:mb-10">
        <div>
          <p className="text-eyebrow mb-1">Cinematic memories</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight">
            Memory Reels
          </h1>
        </div>
        <Link href={ROUTES.newReel} className="btn btn-primary btn-sm btn-pill">
          🎬 Create reel
        </Link>
      </div>

      {reels.length === 0 ? (
        <>
          {/* Empty state */}
          <div className="card p-8 sm:p-12 text-center mb-8">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="font-serif text-lg font-semibold text-ink mb-2">No reels yet</h3>
            <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
              Choose a genre, pick a story template, add your photos and stickers — then watch it all come together.
            </p>
            <Link href={ROUTES.newReel} className="btn btn-primary btn-md btn-pill">
              🎬 Create your first reel
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '🎭', title: '5 cinematic genres', desc: 'Romance, Drama, Adventure, Comedy, Documentary — each with its own visual filter.' },
              { icon: '📸', title: 'Up to 6 photos',     desc: 'Arrange your favourite moments into a smooth animated slideshow.' },
              { icon: '🎵', title: 'Music & stickers',   desc: 'Add a music mood and emoji stickers to give your reel personality.' },
            ].map(f => (
              <div key={f.title} className="card p-5 text-center">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h4 className="font-serif text-sm font-semibold text-ink mb-1">{f.title}</h4>
                <p className="text-xs text-ink-soft">{f.desc}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {reels.map(reel => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
          {/* Create new card */}
          <Link
            href={ROUTES.newReel}
            className="card aspect-video flex flex-col items-center justify-center gap-2 text-ink-faint hover:text-flame hover:border-flame/20 transition-colors border-dashed"
          >
            <span className="text-3xl">🎬</span>
            <span className="text-xs font-semibold">New reel</span>
          </Link>
        </div>
      )}
    </div>
  )
}
