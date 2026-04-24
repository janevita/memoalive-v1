import Link from 'next/link'
import type { AlbumWithPreview } from '@/lib/types'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface AlbumCardProps {
  album: AlbumWithPreview
  className?: string
}

export function AlbumCard({ album, className }: AlbumCardProps) {
  const href    = ROUTES.album(album.groupId, album.id)
  const photos  = album.coverPhotos.slice(0, 4)
  const hasCover = photos.length > 0

  return (
    <Link href={href} className={cn('group block', className)}>
      <div className="rounded-2xl overflow-hidden border border-[#E7E0D8] shadow-sm hover:shadow-md transition-shadow">
        {/* Photo mosaic */}
        <div className="relative aspect-[4/3] bg-surface overflow-hidden">
          {hasCover ? (
            photos.length === 1 ? (
              // Single photo — full bleed
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[0]}
                alt={album.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
            ) : photos.length === 2 ? (
              // Two photos — side by side
              <div className="grid grid-cols-2 h-full gap-px">
                {photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="w-full h-full object-cover" />
                ))}
              </div>
            ) : photos.length === 3 ? (
              // Three: one large left, two stacked right
              <div className="grid grid-cols-2 h-full gap-px">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[0]} alt="" className="w-full h-full object-cover" />
                <div className="grid grid-rows-2 gap-px">
                  {photos.slice(1).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" className="w-full h-full object-cover" />
                  ))}
                </div>
              </div>
            ) : (
              // Four: 2x2 grid
              <div className="grid grid-cols-2 grid-rows-2 h-full gap-px">
                {photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="w-full h-full object-cover" />
                ))}
              </div>
            )
          ) : (
            // No photos — gradient placeholder
            <div className="w-full h-full photo-gradient flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="3" />
                <path d="M2 9h20" />
                <path d="M9 3v6" />
              </svg>
            </div>
          )}

          {/* Memory count badge */}
          <div className="absolute top-2.5 right-2.5 bg-ink/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {album.memoryCount} {album.memoryCount === 1 ? 'memory' : 'memories'}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 py-3 bg-white">
          <h3 className="font-serif text-base font-semibold text-ink leading-snug group-hover:text-flame transition-colors truncate">
            {album.title}
          </h3>
          {album.description && (
            <p className="text-xs text-ink-soft mt-0.5 line-clamp-1">{album.description}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
