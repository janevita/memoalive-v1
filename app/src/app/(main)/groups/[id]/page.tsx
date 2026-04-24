import { redirect } from 'next/navigation'

export default function GroupPageRedirect({ params }: { params: { id: string } }) {
  redirect(`/events/${params.id}`)
}
