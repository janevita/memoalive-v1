import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

export const metadata = { title: 'Reels · Memoalive' }

export default function ReelsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-10">

      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-eyebrow mb-1">Bring memories to life</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight">
          Memory Reels
        </h1>
        <p className="text-ink-soft mt-2 text-sm sm:text-base">
          Turn your photos into cinematic slideshows with music and style.
        </p>
      </div>

      {/* Empty state — no saved reels yet */}
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="font-serif text-lg font-semibold text-ink mb-2">No reels yet</h3>
        <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
          Choose a genre, pick a story template, add your photos and stickers — then watch it all come together in a cinematic slideshow.
        </p>
        <Link href={ROUTES.newReel} className="btn btn-primary btn-md btn-pill">
          🎬 Create your first reel
        </Link>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        {[
          { icon: '🎭', title: '5 cinematic genres', desc: 'Romance, Drama, Adventure, Comedy, Documentary — each with its own visual style.' },
          { icon: '📸', title: 'Up to 6 photos', desc: 'Arrange your favourite moments into a smooth animated slideshow.' },
          { icon: '🎵', title: 'Music & stickers', desc: 'Add a music mood and emoji stickers to give your reel personality.' },
        ].map(f => (
          <div key={f.title} className="card p-5 text-center">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h4 className="font-serif text-sm font-semibold text-ink mb-1">{f.title}</h4>
            <p className="text-xs text-ink-soft">{f.desc}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
