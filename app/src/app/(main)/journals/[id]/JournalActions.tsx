'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { deleteJournal, toggleJournalSharing } from '@/lib/actions/journals'
import { ShareSheet } from '@/components/share/ShareSheet'
import type { Journal } from '@/lib/types'

export function JournalActions({ journal, isOwner }: { journal: Journal; isOwner: boolean }) {
  const router = useRouter()
  const [showShare,   setShowShare]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [isPublic,    setIsPublic]    = useState(journal.isPublic)

  async function handleDelete() {
    setDeleting(true)
    await deleteJournal(journal.id)
    router.push(ROUTES.journals)
  }

  async function handleToggleSharing(shared: boolean) {
    const result = await toggleJournalSharing(journal.id, shared)
    if (!result.error) setIsPublic(shared)
  }

  if (!isOwner) return null

  return (
    <>
      <button
        onClick={() => setShowShare(true)}
        className="btn btn-ghost btn-sm text-white/70 hover:text-white"
        style={{ border: '2px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
      >
        Share
      </button>
      <button
        onClick={() => setShowConfirm(true)}
        className="btn btn-ghost btn-sm text-blossom/80 hover:text-blossom"
        style={{ border: '2px solid rgba(255,45,120,0.2)', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
      >
        Delete
      </button>

      {/* Share sheet */}
      <ShareSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        title={journal.title}
        path={ROUTES.journal(journal.id)}
        isShared={isPublic}
        onToggleShared={handleToggleSharing}
        featureLabel="journal"
      />

      {/* Delete confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-canvas p-6" style={{ border: '2.5px solid #1C1917', boxShadow: '4px 4px 0 #1C1917' }}>
            <h3 className="font-serif text-lg font-bold text-ink mb-2">Delete this journal?</h3>
            <p className="text-sm text-ink-soft mb-6">This cannot be undone. All chapters and content will be permanently deleted.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-primary flex-1"
                style={{ background: '#FF2D78', borderColor: '#B5005A', boxShadow: '2px 2px 0 #B5005A' }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setShowConfirm(false)} className="btn btn-ghost flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
