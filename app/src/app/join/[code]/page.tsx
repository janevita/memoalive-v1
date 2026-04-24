import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'
import { joinEvent } from '@/lib/actions/events'

interface JoinPageProps {
  params: { code: string }
}

export default async function JoinPage({ params }: JoinPageProps) {
  const supabase = await createServerClient()

  // Look up event via security-definer RPC (works for anon visitors too)
  const { data: rows } = await supabase
    .rpc('get_event_preview', { invite_code_input: params.code })

  const group = rows?.[0] ?? null

  if (!group) {
    return (
      <main className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}
        >
          <span className="font-serif text-white text-2xl font-bold">?</span>
        </div>
        <p className="text-eyebrow mb-2">Invite</p>
        <h1 className="font-serif text-2xl font-bold text-ink mb-3">Link not found</h1>
        <p className="text-sm text-ink-soft mb-8 max-w-xs">
          This invite link may have expired or the event no longer exists.
        </p>
        <Link href={ROUTES.home} className="btn btn-primary btn-md btn-pill">
          Back to Memoalive
        </Link>
      </main>
    )
  }

  // Check if visitor is already logged in
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, try to join automatically
  if (user) {
    const result = await joinEvent(params.code)
    if (!result?.error) {
      // joinEvent redirects to the event page on success
      // If we reach here the event page redirect already happened
    }
    // If there's an error (e.g. already a participant), redirect to event anyway
    // joinEvent redirects on success; on error we fall through to the page
  }

  return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}
          >
            <span className="font-serif text-white text-xl font-bold">M</span>
          </div>
          <p className="text-xs text-ink-soft font-medium">Memoalive</p>
        </div>

        {/* Invite card */}
        <div className="card p-8 text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white font-serif text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}
          >
            {group.name.charAt(0).toUpperCase()}
          </div>

          <p className="text-eyebrow mb-2">You're invited to</p>
          <h1 className="font-serif text-2xl font-bold text-ink mb-2 leading-tight">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-sm text-ink-soft mb-4 leading-relaxed">{group.description}</p>
          )}
          <p className="text-xs text-ink-faint mb-8">
            {group.member_count} participant{group.member_count !== 1 ? 's' : ''} sharing memories
          </p>

          {user ? (
            // Logged in — joining was attempted above; show a link in case redirect failed
            <Link
              href={ROUTES.event(group.id)}
              className="btn btn-primary btn-lg w-full btn-pill"
            >
              Open event
            </Link>
          ) : (
            <div className="space-y-3">
              <Link
                href={`${ROUTES.signup}?invite=${params.code}`}
                className="btn btn-primary btn-lg w-full btn-pill"
              >
                Create account &amp; join
              </Link>
              <Link
                href={`${ROUTES.login}?invite=${params.code}`}
                className="btn btn-secondary btn-lg w-full btn-pill"
              >
                Sign in to join
              </Link>
              <p className="text-xs text-ink-faint pt-1">
                Free · No credit card needed
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-ink-faint">
          Memoalive keeps memories of people you care about.
        </p>
      </div>
    </main>
  )
}
