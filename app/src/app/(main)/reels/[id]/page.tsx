import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getReel } from '@/lib/data/reels'
import { ReelActions } from './ReelActions'
import type { Reel } from '@/lib/types'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const reel = await getReel(params.id)
  return { title: reel ? `${reel.title} · Memoalive` : 'Reel · Memoalive' }
}

const GENRE_ICONS: Record<string, string> = {
  romance: '💕', drama: '🎭', adventure: '🌍', comedy: '😄', documentary: '📽️',
}

const GENRE_FILTER: Record<string, string> = {
  romance:     'sepia(0.15) saturate(1.2) contrast(0.95)',
  drama:       'contrast(1.15) saturate(0.8) brightness(0.88)',
  adventure:   'saturate(1.35) contrast(1.1) brightness(1.03)',
  comedy:      'saturate(1.45) brightness(1.06) contrast(1.05)',
  documentary: 'saturate(0.65) contrast(1.08) brightness(0.96)',
}

const TEMPLATE_NAMES: Record<string, string> = {
  day: 'A Day to Remember', thennow: 'Then & Now',
  family: 'Family Portrait', journey: 'The Journey', milestones: 'Growing Up',
}

const MUSIC_NAMES: Record<string, string> = {
  piano: '🎹 Gentle Piano', uplifting: '🎵 Uplifting Pop',
  orchestra: '🎻 Cinematic Orchestra', jazz: '🎷 Jazz & Soul', acoustic: '🎸 Acoustic Guitar',
}

export default async function ReelPage({ params }: { params: { id: string } }) {
  const reel = await getReel(params.id)
  if (!reel) redirect(ROUTES.reels)

  const genreIcon   = GENRE_ICONS[reel.genre] ?? '🎬'
  const genreFilter = GENRE_FILTER[reel.genre]
  const photos      = reel.photos.filter(p => p.url)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-5 py-6 sm:py-10">

      {/* Back + actions bar */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={ROUTES.reels} className="text-xs font-semibold text-ink-soft hover:text-ink transition-colors">
          ← Reels
        </Link>
        <div className="flex-1" />
        <Link href={`${ROUTES.newReel}?edit=${reel.id}`} className="btn btn-sm btn-ghost">
          ✏️ Edit
        </Link>
        <ReelActions reel={reel} />
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Main: cinema preview */}
        <div className="flex-1 min-w-0">
          {/* Genre + title */}
          <div className="mb-4">
            <span className="text-eyebrow">{genreIcon} {reel.genre}</span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight mt-1">
              {reel.title}
            </h1>
          </div>

          {/* 16:9 Cinema frame */}
          <div
            className="relative w-full overflow-hidden shadow-2xl"
            style={{
              aspectRatio: '16/9',
              background: '#111',
              filter: genreFilter,
              border: '2.5px solid #1C1917',
              boxShadow: '4px 4px 0 #1C1917',
            }}
          >
            {photos.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/60">
                <span className="text-5xl mb-3">{genreIcon}</span>
                <p className="text-white/60 text-sm">No photos in this reel</p>
              </div>
            ) : photos.length === 1 ? (
              /* Single photo — full frame */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[0]!.url} alt="Reel photo" className="w-full h-full object-cover" />
            ) : (
              /* Multi-photo — tiled filmstrip */
              <div className={`grid h-full ${photos.length === 2 ? 'grid-cols-2' : photos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 grid-rows-2'}`}>
                {photos.slice(0, 4).map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p.url}
                    alt={`Reel photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    style={i > 0 ? { borderLeft: '2px solid rgba(0,0,0,0.4)' } : undefined}
                  />
                ))}
                {/* Overlay: +N more */}
                {photos.length > 4 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1.5 rounded-full">
                    +{photos.length - 4} more
                  </div>
                )}
              </div>
            )}

            {/* Title overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-4 sm:p-6">
              <p className="font-serif text-white font-bold text-xl sm:text-2xl drop-shadow-lg">
                {reel.template ? TEMPLATE_NAMES[reel.template] ?? reel.title : reel.title}
              </p>
              <p className="text-white/60 text-xs tracking-widest uppercase mt-1">
                {genreIcon} {reel.genre}
              </p>
            </div>

            {/* Placed stickers */}
            {reel.stickers.map((s, i) => (
              <span
                key={i}
                className="absolute text-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                {s.emoji}
              </span>
            ))}
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-surface" style={{ border: '2px solid #E7E0D8' }}>
              {genreIcon} {reel.genre.charAt(0).toUpperCase() + reel.genre.slice(1)}
            </span>
            {reel.template && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-surface" style={{ border: '2px solid #E7E0D8' }}>
                📋 {TEMPLATE_NAMES[reel.template] ?? reel.template}
              </span>
            )}
            {reel.music && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-surface" style={{ border: '2px solid #E7E0D8' }}>
                {MUSIC_NAMES[reel.music] ?? reel.music}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-surface" style={{ border: '2px solid #E7E0D8' }}>
              📸 {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
          {/* Photo strip */}
          {photos.length > 0 && (
            <div className="card p-4">
              <p className="text-[10px] font-bold tracking-widest text-ink-soft mb-3">PHOTOS</p>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p.url}
                    alt={`Photo ${i + 1}`}
                    className="aspect-square object-cover w-full"
                    style={{ border: '2px solid #E7E0D8' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Created date */}
          <div className="card p-4">
            <p className="text-[10px] font-bold tracking-widest text-ink-soft mb-1">CREATED</p>
            <p className="text-sm text-ink">
              {new Date(reel.createdAt).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
