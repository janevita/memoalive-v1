import { getGroupPerson } from '@/lib/data/people'
import { notFound } from 'next/navigation'
import { PersonDetailClient } from './PersonDetailClient'

export async function generateMetadata({ params }: { params: { id: string; personId: string } }) {
  const person = await getGroupPerson(params.personId)
  return { title: person ? `${person.name} · Memoalive` : 'Person' }
}

export default async function PersonDetailPage({ params }: { params: { id: string; personId: string } }) {
  const person = await getGroupPerson(params.personId)
  if (!person) notFound()
  return <PersonDetailClient person={person} eventId={params.id} />
}
