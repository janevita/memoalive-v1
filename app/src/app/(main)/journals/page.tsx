import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getJournalsForUser } from '@/lib/data/journals'
import { ROUTES } from '@/lib/constants'
import type { Journal } from '@/lib/types'

export const metadata = { title: 'Journals' }

function JournalCoverCard({ journal }: { journal: Journal }) {
  return (
    <Link href={`/journals/${journal.id}`} className="group block">
      {/* Book cover */}
      <div
        className="relative w-full aspect-[3/4] mb-3 transition-transform group-hover:-translate-y-1"
        style={{
          background: journal.coverColor,
          border: '3px solid rgba(0,0,0,0.5)',
          boxShadow: '5px 5px 0 rgba(0,0,0,0.4)',
        }}
      >
        {/* Spine line */}
        <div className="absolute left-0 inset-y-0 w-[12px]" style={{ background: 'rgba(0,0,0,0.2)' }} />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 1px, transparent 0, transparent 50%)',
          backgroundSize: '10px 10px',
        }} />
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 mb-3 rounded-full border-[3px] border-white/80 flex items-center justify-center">
            <span className="text-white/90 text-xl">📖</span>
          </div>
          <p className="font-serif font-bold text-white text-sm leading-tight mb-1">{journal.title}</p>
          <p className="text-white/70 text-xs">About {journal.subjectName}</p>
        </div>
        {/* Year badge */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold"
             style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}>
          {journal.year}
        </div>
        {/* Private badge */}
        {!journal.isPublic && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-bold"
               style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.7)' }}>
            🔒
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-ink truncate">{journal.title}</p>
      <p className="text-xs text-ink-soft">{journal.subjectName}</p>
    </Link>
  )
}

export default async function JournalsPage() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const journals = await getJournalsForUser(user.id)
  const thisYear = new Date().getFullYear()
  const thisYearCount = journals.filter(j => j.year === thisYear).length
  const canCreate = thisYearCount < 5

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="px-6 py-8 border-b-[2.5px] border-ink" style={{ background: '#1C1917' }}>
        <div className="max-w-5xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-sunrise mb-1">Life Stories</p>
            <h1 className="font-serif text-4xl font-bold text-white">Journals</h1>
            <p className="text-white/50 text-sm mt-1">
              {thisYearCount}/5 journals this year · Private by default
            </p>
          </div>
          {canCreate && (
            <Link href={ROUTES.newJournal} className="btn btn-primary btn-md">
              + New Journal
            </Link>
          )}
          {!canCreate && (
            <div className="text-white/40 text-xs text-right">
              Limit reached for {thisYear}<br />
              <span className="text-white/25">Try again in {thisYear + 1}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {journals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📖</div>
            <p className="font-serif text-2xl font-bold text-ink mb-2">No journals yet</p>
            <p className="text-ink-soft mb-8 max-w-sm mx-auto">
              Start writing someone&apos;s life story — their memories, their words, their world.
              Journals are private to you unless you choose to share them.
            </p>
            <Link href={ROUTES.newJournal} className="btn btn-primary btn-lg">
              Write the first journal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {journals.map(j => (
              <JournalCoverCard key={j.id} journal={j} />
            ))}
            {canCreate && (
              <Link href={ROUTES.newJournal} className="block group">
                <div
                  className="w-full aspect-[3/4] mb-3 flex flex-col items-center justify-center transition-transform group-hover:-translate-y-1"
                  style={{
                    background: '#FFFBF5',
                    border: '3px dashed #D4CCC4',
                    boxShadow: '3px 3px 0 #D4CCC4',
                  }}
                >
                  <div className="text-3xl text-ink-faint mb-2">+</div>
                  <p className="text-xs font-semibold text-ink-faint">New Journal</p>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
