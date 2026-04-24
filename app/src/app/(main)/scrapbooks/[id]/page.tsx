import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getScrapbookWithPages, getPickablePhotos } from '@/lib/data/scrapbooks'
import { ScrapbookCanvas } from '@/components/scrapbook/ScrapbookCanvas'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  // Lightweight fetch — just the title
  const supabase = await createClient()
  const { data } = await supabase
    .from('scrapbooks')
    .select('title')
    .eq('id', params.id)
    .single()
  return { title: data ? `${data.title} · Memoalive` : 'Scrapbook · Memoalive' }
}

export default async function ScrapbookPage({ params }: Props) {
  const [scrapbook, pickablePhotos] = await Promise.all([
    getScrapbookWithPages(params.id),
    getPickablePhotos(),
  ])

  if (!scrapbook) notFound()

  return (
    <ScrapbookCanvas
      scrapbook={scrapbook}
      isOwner={true}
      pickablePhotos={pickablePhotos}
    />
  )
}
