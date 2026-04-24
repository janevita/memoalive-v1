import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import type { ScrapbookWithItems } from '@/lib/types'

interface Props {
  scrapbook: ScrapbookWithItems
}

export function ScrapbookCard({ scrapbook }: Props) {
  const previews = scrapbook.items.slice(0, 4).map(i => i.url)
  const count    = scrapbook.items.length

  return (
    <Link href={ROUTES.scrapbook(scrapbook.id)} className="group block">
      <div className="card overflow-hidden hover:shadow-md transition-shadow">
        {/* Mosaic preview */}
        <div className="grid grid-cols-2 gap-0.5 aspect-square bg-ink/5">
          {previews.length === 0 && (
            <div
              className="col-span-2 row-span-2 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F9761C22, #EC479922)' }}
            >
              <BookIcon className="w-10 h-10 text-flame/40" />
            </div>
          )}
          {previews.length === 1 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previews[0]} alt="" className="col-span-2 row-span-2 w-full h-full object-cover" />
          )}
          {previews.length === 2 && previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="col-span-1 row-span-2 w-full h-full object-cover" />
          ))}
          {previews.length === 3 && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[0]} alt="" className="col-span-1 row-span-2 w-full h-full object-cover" />
              {previews.slice(1).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="col-span-1 w-full h-full object-cover" />
              ))}
            </>
          )}
          {previews.length === 4 && previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="w-full h-full object-cover" />
          ))}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-serif text-base font-semibold text-ink group-hover:text-flame transition-colors truncate">
            {scrapbook.title}
          </h3>
          {scrapbook.description && (
            <p className="text-xs text-ink-soft mt-0.5 line-clamp-1">{scrapbook.description}</p>
          )}
          <p className="text-xs text-ink-faint mt-1.5">
            {count} photo{count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c0-1.1.9-2 2-2h7l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      <path d="M12 10v6M9 13h6" />
    </svg>
  )
}
