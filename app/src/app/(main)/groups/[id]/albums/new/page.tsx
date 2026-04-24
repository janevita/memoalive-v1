import { redirect } from 'next/navigation'

export default function NewAlbumRedirect({ params }: { params: { id: string } }) {
  redirect(`/events/${params.id}/albums/new`)
}
