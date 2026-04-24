import { redirect } from 'next/navigation'

export default function NewPersonRedirect({ params }: { params: { id: string } }) {
  redirect(`/events/${params.id}/people/new`)
}
