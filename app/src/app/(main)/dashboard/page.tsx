import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getCurrentUser } from '@/lib/data/users'
import { getCrossFeedMemories } from '@/lib/data/memories'
import { getMyScrapbooks } from '@/lib/data/scrapbooks'
import { getJournalsForUser } from '@/lib/data/journals'
import { MemoryCard } from '@/components/memory/MemoryCard'

export const metadata = { title: 'Home · Memoalive' }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const firstName = user?.name.split(' ')[0] ?? 'there'

  const [feed, scrapbooks, journals] = await Promise.all([
    getCrossFeedMemories(20),
    getMyScrapbooks(),
    user ? getJournalsForUser(user.id) : Promise.resolve([]),
  ])

  const recentScrapbooks = scrapbooks.slice(0, 3)
  const recentJournals   = journals.slice(0, 3)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-5 py-6 sm:py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-eyebrow mb-1">Good to see you, {firstName}</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight">
          What&apos;s happening
        </h1>
        <p className="text-ink-soft mt-2 text-sm sm:text-base">
          Recent moments from everyone in your events.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* ── Main community feed ───────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {feed.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-flame-glow flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#F9761C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3 20c0-3.3 2.7-6 6-6" />
                  <circle cx="16" cy="8" r="3" />
                  <path d="M13 14a6 6 0 016 6" />
                </svg>
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink mb-2">Nothing here yet</h3>
              <p className="text-sm text-ink-soft mb-6 max-w-xs mx-auto">
                Create an event and invite people — their memories will show up here as they add them.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href={ROUTES.newEvent} className="btn btn-primary btn-md btn-pill">
                  Create an event
                </Link>
                <Link href={ROUTES.newMemory} className="btn btn-secondary btn-md btn-pill">
                  Add a memory
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map(memory => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  groupId={memory.groupId}
                  variant="feed"
                />
              ))}
            </div>
          )}
        </main>

        {/* ── Sidebar: your recent work ─────────────────────────────────────── */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">

          {/* Recent scrapbooks */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-base font-semibold text-ink">Your scrapbooks</h2>
              <Link href={ROUTES.scrapbooks} className="text-xs font-semibold text-flame hover:underline">
                See all
              </Link>
            </div>

            {recentScrapbooks.length === 0 ? (
              <p className="text-xs text-ink-soft mb-4">No scrapbooks yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {recentScrapbooks.map(sb => (
                  <Link
                    key={sb.id}
                    href={ROUTES.scrapbook(sb.id)}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-surface transition-colors"
                  >
                    {sb.coverUrl ? (
                      <img
                        src={sb.coverUrl}
                        alt={sb.title}
                        className="w-10 h-10 object-cover flex-shrink-0"
                        style={{ border: '2px solid #1C1917' }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-surface"
                        style={{ border: '2px solid #1C1917' }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9C8B7E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="8" height="8" rx="1.5" />
                          <rect x="13" y="3" width="8" height="8" rx="1.5" />
                          <rect x="3" y="13" width="8" height="8" rx="1.5" />
                          <rect x="13" y="13" width="8" height="8" rx="1.5" />
                        </svg>
                      </div>
                    )}
                    <span className="text-sm font-medium text-ink truncate">{sb.title}</span>
                  </Link>
                ))}
              </div>
            )}

            <Link href={ROUTES.newScrapbook} className="btn btn-secondary btn-sm btn-pill w-full justify-center">
              + New scrapbook
            </Link>
          </div>

          {/* Recent journals */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-base font-semibold text-ink">Your journals</h2>
              <Link href={ROUTES.journals} className="text-xs font-semibold text-flame hover:underline">
                See all
              </Link>
            </div>

            {recentJournals.length === 0 ? (
              <p className="text-xs text-ink-soft mb-4">No journals yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {recentJournals.map(j => (
                  <Link
                    key={j.id}
                    href={ROUTES.journal(j.id)}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-surface transition-colors"
                  >
                    <div
                      className="w-10 h-10 flex-shrink-0"
                      style={{ background: j.coverColor || '#E8D5C4', border: '2px solid #1C1917' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{j.title}</p>
                      <p className="text-xs text-ink-soft">{j.year}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Link href={ROUTES.newJournal} className="btn btn-secondary btn-sm btn-pill w-full justify-center">
              + New journal
            </Link>
          </div>

          {/* Quick add memory CTA */}
          <Link
            href={ROUTES.newMemory}
            className="card p-5 flex items-center gap-3 hover:border-flame/30 hover:shadow-sm transition-all group"
          >
            <div
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-sunrise text-white"
              style={{ border: '2px solid #B53C00', boxShadow: '2px 2px 0 #B53C00' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink group-hover:text-flame transition-colors">Add a memory</p>
              <p className="text-xs text-ink-soft">Photo, video, or voice note</p>
            </div>
          </Link>

        </aside>
      </div>
    </div>
  )
}
