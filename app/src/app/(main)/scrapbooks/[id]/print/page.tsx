import { notFound } from 'next/navigation'
import { getScrapbookWithPages } from '@/lib/data/scrapbooks'
import { ScrapbookPrintView } from '@/components/scrapbook/ScrapbookPrintView'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  return { title: 'Print scrapbook · Memoalive' }
}

export default async function ScrapbookPrintPage({ params }: Props) {
  const scrapbook = await getScrapbookWithPages(params.id)
  if (!scrapbook) notFound()

  return <ScrapbookPrintView scrapbook={scrapbook} />
}
