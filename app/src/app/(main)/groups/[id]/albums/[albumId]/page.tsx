import { redirect } from 'next/navigation'

export default function AlbumRedirect({ params }: { params: { id: string; albumId: string } }) {
  redirect(`/events/${params.id}/albums/${params.albumId}`)
}
