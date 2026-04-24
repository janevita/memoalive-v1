import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getScrapbook } from '@/lib/data/scrapbooks'
import { getPickablePhotos } from '@/lib/data/scrapbooks'
import { PhotoPicker } from '@/components/scrapbook/PhotoPicker'
import { ROUTES } from '@/lib/constants'

interface Props {
  params: { id: string }
}

export const metadata = { title: 'Add photos · Memoalive' }

export default async function AddToScrapbookPage({ params }: Props) {
  const [scrapbook, photos] = await Promise.all([
    getScrapbook(params.id),
    getPickablePhotos(),
  ])

  if (!scrapbook) notFound()

  return (
    <div className="max-w-xl mx-auto px-5 py-10">
      <div className="mb-6">
        <Link
          href={ROUTES.scrapbook(params.id)}
          className="text-xs text-ink-soft hover:text-flame transition-colors mb-3 inline-block"
        >
          ← Back to "{scrapbook.title}"
        </Link>
        <h1 className="font-serif text-2xl font-bold text-ink">Add photos</h1>
        <p className="text-ink-soft text-sm mt-1">
          Choose from your events or upload new photos.
        </p>
      </div>

      <PhotoPicker scrapbookId={params.id} photos={photos} />
    </div>
  )
}
