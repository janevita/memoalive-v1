'use client'

import { useState, useCallback } from 'react'
import { APP_URL } from '@/lib/constants'

interface InviteButtonProps {
  inviteCode: string
  eventName:  string
}

export function InviteButton({ inviteCode, eventName }: InviteButtonProps) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = `${APP_URL}/join/${inviteCode}`

  const handleShare = useCallback(async () => {
    // Try native share sheet first (mobile / desktop where supported)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join "${eventName}" on Memoalive`,
          text:  `You've been invited to share memories in "${eventName}".`,
          url:   inviteUrl,
        })
        return
      } catch {
        // User cancelled or API not supported — fall through to copy
      }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Last resort: open in new tab so user can copy manually
      window.open(inviteUrl, '_blank')
    }
  }, [inviteUrl, eventName])

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 text-xs text-flame font-semibold hover:underline transition-colors"
      title={`Invite link: ${inviteUrl}`}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Link copied!
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Invite people
        </>
      )}
    </button>
  )
}
