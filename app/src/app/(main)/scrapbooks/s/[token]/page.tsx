import { notFound } from 'next/navigation'
import { getScrapbookByToken } from '@/lib/data/scrapbooks'
import { ScrapbookCanvas } from '@/components/scrapbook/ScrapbookCanvas'

interface Props {
  params: { token: string }
}

export async function generateMetadata({ params }: Props) {
  const sb = await getScrapbookByToken(params.token)
  return { title: sb ? `${sb.title} · Memoalive` : 'Shared Scrapbook · Memoalive' }
}

export default async function SharedScrapbookPage({ params }: Props) {
  const scrapbook = await getScrapbookByToken(params.token)
  if (!scrapbook) notFound()

  return (
    <ScrapbookCanvas
      scrapbook={scrapbook}
      isOwner={false}
      pickablePhotos={[]}
    />
  )
}
