import { redirect } from 'next/navigation'

export default function PersonRedirect({ params }: { params: { id: string; personId: string } }) {
  redirect(`/events/${params.id}/people/${params.personId}`)
}
