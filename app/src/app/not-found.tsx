import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}
      >
        <span className="font-serif text-white text-2xl font-bold">?</span>
      </div>
      <p className="text-eyebrow mb-3">404</p>
      <h1 className="font-serif text-3xl font-bold text-ink mb-3 leading-tight">
        This page doesn't exist
      </h1>
      <p className="text-sm text-ink-soft mb-8 max-w-xs">
        The memory or group you're looking for may have been removed or the link is wrong.
      </p>
      <Link href={ROUTES.dashboard} className="btn btn-primary btn-lg btn-pill">
        Go to your memories
      </Link>
    </main>
  )
}
