import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Colour blobs */}
      <div className="absolute top-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(236,71,153,0.22) 0%, rgba(249,118,28,0.10) 50%, transparent 70%)' }} />
      <div className="absolute bottom-[-100px] left-[10%] w-[320px] h-[320px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(61,132,246,0.16) 0%, rgba(54,198,101,0.08) 60%, transparent 75%)' }} />

      {/* Logo */}
      <div className="relative z-10 text-center mb-10">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center relative flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}>
            <div className="w-[22px] h-[22px] rounded-full border-[2.5px] border-white/85 absolute" />
          </div>
          <h1 className="font-serif text-6xl font-bold text-white tracking-tight leading-none">
            Memo<span className="text-flame">alive</span>
          </h1>
        </div>
        <p className="font-serif text-xl italic text-white/60 leading-snug">
          "Keeps memories of people you care about."
        </p>
      </div>

      {/* CTA */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4">
        <Link
          href={ROUTES.signup}
          className="btn btn-primary btn-xl btn-pill"
        >
          Get started — it's free
        </Link>
        <Link
          href={ROUTES.login}
          className="btn btn-secondary btn-xl btn-pill"
          style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'white' }}
        >
          Sign in
        </Link>
      </div>

      {/* Footer note */}
      <p className="relative z-10 mt-12 text-xs text-white/30 text-center">
        Private · Family-first · No ads · Your stories, forever
      </p>
    </main>
  )
}
