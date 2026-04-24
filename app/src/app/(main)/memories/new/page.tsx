import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { getMyEvents } from '@/lib/data/events'
import { getGroupAlbums } from '@/lib/data/albums'
import { getTaggablePeople } from '@/lib/data/people'
import { NewMemoryForm } from '@/components/memory/NewMemoryForm'
import type { AlbumWithPreview } from '@/lib/types'
import type { TaggablePerson } from '@/lib/data/people'

export const metadata = { title: 'New memory · Memoalive' }

export default async function NewMemoryPage({
  searchParams,
}: {
  searchParams: { groupId?: string; albumId?: string }
}) {
  const groups = await getMyEvents()

  if (groups.length === 0) redirect(ROUTES.newEvent)

  const slim = groups.map(g => ({ id: g.id, name: g.name }))

  // Pre-fetch albums and taggable people for all groups
  const albumsByGroup:  Record<string, Pick<AlbumWithPreview, 'id' | 'title'>[]> = {}
  const peopleByGroup:  Record<string, TaggablePerson[]> = {}

  await Promise.all(
    slim.map(async g => {
      const [albums, people] = await Promise.all([
        getGroupAlbums(g.id),
        getTaggablePeople(g.id),
      ])
      albumsByGroup[g.id] = albums.map(a => ({ id: a.id, title: a.title }))
      peopleByGroup[g.id] = people
    })
  )

  return (
    <NewMemoryForm
      groups={slim}
      albumsByGroup={albumsByGroup}
      peopleByGroup={peopleByGroup}
      defaultGroupId={searchParams.groupId ?? slim[0]?.id}
      defaultAlbumId={searchParams.albumId}
    />
  )
}
