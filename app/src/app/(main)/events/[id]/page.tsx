import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getEvent } from '@/lib/data/events'
import { getGroupMemories } from '@/lib/data/memories'
import { getGroupAlbums } from '@/lib/data/albums'
import { getCurrentUser } from '@/lib/data/users'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { InviteButton } from '@/components/event/InviteButton'
import { AlbumCard } from '@/components/event/AlbumCard'
import { EventActions } from '@/components/event/EventActions'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const event = await getEvent(params.id)
  return { title: event ? `${event.name} · Memoalive` : 'Event' }
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const [event, memories, albums, currentUser] = await Promise.all([
    getEvent(params.id),
    getGroupMemories(params.id, { limit: 20 }),
    getGroupAlbums(params.id),
    getCurrentUser(),
  ])

  if (!event) notFound()

  const memberNames  = event.members.map(m => m.user.name)
  const memberAvatar = event.members.map(m => m.user.avatarUrl ?? null)

  // Show edit/delete controls to owner or admin
  const myRole = event.members.find(m => m.userId === currentUser?.id)?.role
  const canManage = myRole === 'owner' || myRole === 'admin'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Event header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-serif text-2xl font-bold flex-shrink-0 overflow-hidden"
              style={event.coverUrl ? undefined : { background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}
            >
              {event.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={event.coverUrl} alt={event.name} className="w-full h-full object-cover" />
                : event.name.charAt(0).toUpperCase()
              }
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-ink">{event.name}</h1>
              <p className="text-sm text-ink-soft mt-0.5">
                {event.members.length} participant{event.members.length !== 1 ? 's' : ''}
                {event.memoryCount > 0 && ` · ${event.memoryCount} memor${event.memoryCount !== 1 ? 'ies' : 'y'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && (
              <EventActions
                eventId={event.id}
                name={event.name}
                description={event.description}
              />
            )}
            <Link
              href={`${ROUTES.newMemory}?groupId=${event.id}`}
              className="btn btn-primary btn-sm btn-pill"
            >
              + Add memory
            </Link>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-ink-soft mb-4">{event.description}</p>
        )}

        {/* Participants row */}
        <div className="flex items-center gap-3 flex-wrap">
          <AvatarGroup names={memberNames} srcs={memberAvatar} max={6} size="sm" />
          <div className="flex items-center gap-2 ml-1 flex-wrap">
            <span className="text-xs text-ink-soft">
              {memberNames.slice(0, 2).join(', ')}
              {event.members.length > 2 && ` +${event.members.length - 2} more`}
            </span>
            <span className="text-ink-faint">·</span>
            <InviteButton inviteCode={event.inviteCode} eventName={event.name} />
            <span className="text-ink-faint">·</span>
            <Link
              href={`/events/${event.id}/people`}
              className="text-xs text-ink-soft hover:text-flame transition-colors font-medium"
            >
              People
            </Link>
          </div>
        </div>
      </div>

      {/* Albums section */}
      {albums.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-ink">Albums</h2>
            <Link
              href={ROUTES.newAlbum(event.id)}
              className="text-xs text-flame font-semibold hover:underline"
            >
              + New album
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {albums.map(album => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {/* Memory feed */}
      <section>
        {albums.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-ink">All memories</h2>
          </div>
        )}
        {/* Create first album nudge — shown when memories exist but no albums yet */}
        {memories.length > 0 && albums.length === 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-dashed border-ink/12 bg-surface/60 px-5 py-4 mb-6">
            <div>
              <p className="text-sm font-semibold text-ink mb-0.5">Organise with albums</p>
              <p className="text-xs text-ink-soft">Group memories by trip or season — Férias no Brasil, Natal, Ano Novo…</p>
            </div>
            <Link href={ROUTES.newAlbum(event.id)} className="btn btn-ghost btn-sm btn-pill flex-shrink-0 ml-4">
              + Create album
            </Link>
          </div>
        )}

        {memories.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-flame-glow flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#F9761C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10.5" r="1.5" />
                <path d="M21 15l-5-5L5 19" />
              </svg>
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink mb-2">No memories yet</h3>
            <p className="text-sm text-ink-soft mb-6 max-w-xs mx-auto">
              Be the first to add a memory to this event.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link href={`${ROUTES.newMemory}?groupId=${event.id}`} className="btn btn-primary btn-md btn-pill">
                Add first memory
              </Link>
              <Link href={ROUTES.newAlbum(event.id)} className="text-xs text-flame font-semibold hover:underline">
                Or create an album first
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {memories.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                groupId={event.id}
                variant="feed"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
