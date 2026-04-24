import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { getEvent } from '@/lib/data/events'
import { getTaggablePeople } from '@/lib/data/people'
import { Avatar } from '@/components/ui/Avatar'

interface PeoplePageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PeoplePageProps) {
  const event = await getEvent(params.id)
  return { title: event ? `People · ${event.name}` : 'People' }
}

export default async function PeoplePage({ params }: PeoplePageProps) {
  const [event, people] = await Promise.all([
    getEvent(params.id),
    getTaggablePeople(params.id),
  ])

  if (!event) notFound()

  const participants = people.filter(p => p.type === 'profile')
  const eventPeople  = people.filter(p => p.type === 'person')

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={ROUTES.event(params.id)}
            className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink transition-colors mb-2"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            {event.name}
          </Link>
          <h1 className="font-serif text-2xl font-bold text-ink">People</h1>
        </div>
        <Link
          href={`/events/${params.id}/people/new`}
          className="btn btn-primary btn-sm btn-pill"
        >
          + Add person
        </Link>
      </div>

      {/* Participants section */}
      <section className="mb-8">
        <p className="text-eyebrow mb-4">Participants</p>
        <div className="space-y-2">
          {participants.map(person => (
            <div
              key={person.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E7E0D8] shadow-sm"
            >
              <div className="relative flex-shrink-0">
                <Avatar name={person.name} src={person.avatarUrl} size="md" />
                {person.faceRefs.length > 0 && (
                  <span
                    title={`${person.faceRefs.length} face reference${person.faceRefs.length !== 1 ? 's' : ''} — AI recognition enabled`}
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-cobalt border-2 border-white flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" width="8" height="8" fill="white">
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  {person.name}
                  {person.nickname && (
                    <span className="text-ink-soft font-normal ml-1.5">"{person.nickname}"</span>
                  )}
                </p>
                <p className="text-xs text-ink-soft">{person.relationship ?? 'Participant'}</p>
              </div>
              {person.faceRefs.length === 0 && (
                <span className="text-[10px] text-ink-faint bg-ink/5 px-2 py-0.5 rounded-full">
                  No face ref
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Non-registered people */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-eyebrow">Family &amp; friends</p>
        </div>

        {eventPeople.length === 0 ? (
          <div className="border-2 border-dashed border-ink/10 rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink mb-1">Add family members</p>
            <p className="text-xs text-ink-soft mb-5 max-w-xs mx-auto">
              Add Grandma, kids, or anyone who appears in memories but doesn't have an account. Tag them and add face photos for AI recognition.
            </p>
            <Link href={`/events/${params.id}/people/new`} className="btn btn-ghost btn-md btn-pill">
              Add first person
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {eventPeople.map(person => (
              <Link
                key={person.id}
                href={`/events/${params.id}/people/${person.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E7E0D8] shadow-sm hover:border-flame/30 hover:shadow-md transition-all"
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={person.name} src={person.avatarUrl} size="md" />
                  {person.faceRefs.length > 0 && (
                    <span
                      title="AI recognition enabled"
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-cobalt border-2 border-white"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">
                    {person.name}
                    {person.nickname && (
                      <span className="text-ink-soft font-normal ml-1.5">"{person.nickname}"</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {person.relationship ?? 'Family / friend'}
                    {person.faceRefs.length > 0 && (
                      <span className="ml-2 text-cobalt font-medium">
                        · {person.faceRefs.length} face ref{person.faceRefs.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
