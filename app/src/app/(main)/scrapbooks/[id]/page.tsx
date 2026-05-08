import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getScrapbookWithPages, getPickablePhotos } from '@/lib/data/scrapbooks'
import { ScrapbookCanvas } from '@/components/scrapbook/ScrapbookCanvas'
import { ROUTES } from '@/lib/constants'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scrapbooks')
    .select('title')
    .eq('id', params.id)
    .single()
  return { title: data ? `${data.title} · Memoalive` : 'Scrapbook · Memoalive' }
}

export default async function ScrapbookPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`${ROUTES.login}?redirect=/scrapbooks/${params.id}`)

  const [scrapbook, pickablePhotos] = await Promise.all([
    getScrapbookWithPages(params.id),
    getPickablePhotos(),
  ])

  if (!scrapbook) notFound()

  const isOwner = scrapbook.ownerId === user.id

  return (
    <ScrapbookCanvas
      scrapbook={scrapbook}
      isOwner={isOwner}
      pickablePhotos={pickablePhotos}
    />
  )
}
