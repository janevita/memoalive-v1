'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-flame-glow flex items-center justify-center mx-auto mb-6">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#F9761C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h2 className="font-serif text-2xl font-bold text-ink mb-2">Something went wrong</h2>
      <p className="text-sm text-ink-soft mb-8">
        {error.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={reset} className="btn btn-primary btn-md btn-pill">
          Try again
        </button>
        <Link href={ROUTES.dashboard} className="btn btn-secondary btn-md btn-pill">
          Go home
        </Link>
      </div>
    </div>
  )
}
