import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getJournal } from '@/lib/data/journals'
import { JournalEditor } from '@/components/journal/JournalEditor'
import { ROUTES } from '@/lib/constants'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const journal = await getJournal(params.id)
  return { title: journal?.title ?? 'Journal' }
}

export default async function JournalPage({ params }: { params: { id: string } }) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const journal = await getJournal(params.id)
  if (!journal) notFound()

  const isOwner = journal.createdBy === user.id

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-[2.5px] border-ink sticky top-0 z-40" style={{ background: '#1C1917' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href={ROUTES.journals} className="text-white/50 hover:text-white transition-colors text-xs sm:text-sm font-semibold flex-shrink-0">
              ← <span className="hidden sm:inline">Journals</span>
            </Link>
            <span className="text-white/20 flex-shrink-0 hidden sm:inline">/</span>
            <div className="min-w-0">
              <p className="font-serif font-bold text-white text-sm truncate">{journal.title}</p>
              <p className="text-white/40 text-[10px] sm:text-xs">About {journal.subjectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={ROUTES.printJournal(journal.id)}
              className="btn btn-ghost btn-sm text-white/70 hover:text-white"
              style={{ border: '2px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
            >
              🖨 <span className="hidden sm:inline">Print</span>
            </Link>
          </div>
        </div>
      </div>

      <JournalEditor journal={journal} isOwner={isOwner} />
    </div>
  )
}
