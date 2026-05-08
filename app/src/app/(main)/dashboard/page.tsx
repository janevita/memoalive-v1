import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getCurrentUser } from '@/lib/data/users'
import { getMyEvents } from '@/lib/data/events'
import { getGroupMemories } from '@/lib/data/memories'
import { GroupCard } from '@/components/memory/GroupCard'
import { MemoryCard } from '@/components/memory/MemoryCard'

export const metadata = { title: 'Dashboard · Memoalive' }

export default async function DashboardPage() {
  const [user, groups] = await Promise.all([getCurrentUser(), getMyEvents()])

  // Fetch recent memories across all groups (take the 3 most recent from first 3 groups)
  const recentMemories = groups.length > 0
    ? (await Promise.all(
        groups.slice(0, 4).map(g => getGroupMemories(g.id, { limit: 4 }))
      ))
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6)
    : []

  const firstName = user?.name.split(' ')[0] ?? 'there'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
      {/* Welcome header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-eyebrow mb-1">Good to see you, {firstName}</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight">
          Your memories
        </h1>
        <p className="text-ink-soft mt-2 text-sm sm:text-base">
          Pick an event to dive in, or create a new one.
        </p>
      </div>

      {/* Events section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-semibold text-ink">Your events</h2>
          <Link href={ROUTES.newEvent} className="btn btn-primary btn-sm btn-pill">
            + New event
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-flame-glow flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#F9761C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20c0-3.3 2.7-6 6-6" />
                <circle cx="16" cy="8" r="3" />
                <path d="M13 14a6 6 0 016 6" />
              </svg>
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink mb-2">No events yet</h3>
            <p className="text-sm text-ink-soft mb-6 max-w-xs mx-auto">
              Create an event for a trip, celebration, or any gathering — then start adding memories together.
            </p>
            <Link href={ROUTES.newEvent} className="btn btn-primary btn-md btn-pill">
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {groups.map(group => (
              <GroupCard key={group.id} group={group} />
            ))}
            <Link
              href={ROUTES.newEvent}
              className="card p-5 flex flex-col items-center justify-center gap-2 text-ink-faint hover:text-flame hover:border-flame/20 transition-colors min-h-[120px] border-dashed"
            >
              <span className="text-2xl">+</span>
              <span className="text-xs font-semibold">New event</span>
            </Link>
          </div>
        )}
      </section>

      {/* Recent memories */}
      {recentMemories.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold text-ink mb-5">
            Recent memories
          </h2>
          <div className="space-y-4">
            {recentMemories.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                groupId={memory.groupId}
                variant="feed"
              />
            ))}
          </div>
        </section>
      )}

      {groups.length > 0 && recentMemories.length === 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold text-ink mb-4">Recent memories</h2>
          <div className="card p-10 text-center">
            <p className="text-sm text-ink-soft mb-4">
              No memories yet — add the first one to an event!
            </p>
            <Link href={ROUTES.newMemory} className="btn btn-primary btn-sm btn-pill">
              + Add memory
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
