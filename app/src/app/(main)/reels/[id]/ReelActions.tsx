'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES, APP_URL } from '@/lib/constants'
import { deleteReel, toggleReelSharing } from '@/lib/actions/reels'
import { ShareSheet } from '@/components/share/ShareSheet'
import type { Reel } from '@/lib/types'

export function ReelActions({ reel }: { reel: Reel }) {
  const router = useRouter()
  const [showShare,   setShowShare]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [isShared,    setIsShared]    = useState(reel.isShared)

  async function handleDelete() {
    setDeleting(true)
    await deleteReel(reel.id)
    router.push(ROUTES.reels)
  }

  async function handleToggleShared(shared: boolean) {
    const result = await toggleReelSharing(reel.id, shared)
    if (!result.error) setIsShared(shared)
  }

  return (
    <>
      <button
        onClick={() => setShowShare(true)}
        className="btn btn-sm btn-ghost"
      >
        Share
      </button>
      <button
        onClick={() => setShowConfirm(true)}
        className="btn btn-sm btn-ghost text-blossom hover:bg-blossom/10"
      >
        Delete
      </button>

      {/* Share sheet */}
      <ShareSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        title={reel.title}
        path={ROUTES.reel(reel.id)}
        isShared={isShared}
        onToggleShared={handleToggleShared}
        featureLabel="reel"
      />

      {/* Delete confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-canvas p-6" style={{ border: '2.5px solid #1C1917', boxShadow: '4px 4px 0 #1C1917' }}>
            <h3 className="font-serif text-lg font-bold text-ink mb-2">Delete this reel?</h3>
            <p className="text-sm text-ink-soft mb-6">This cannot be undone. Your photos will remain in your library.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-primary bg-blossom border-blossom flex-1"
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
