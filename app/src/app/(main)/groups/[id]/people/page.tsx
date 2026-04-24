import { redirect } from 'next/navigation'

export default function PeopleRedirect({ params }: { params: { id: string } }) {
  redirect(`/events/${params.id}/people`)
}
