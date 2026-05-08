import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Colour blobs — smaller on mobile */}
      <div className="absolute top-[-40px] right-[-40px] sm:top-[-80px] sm:right-[-80px] w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(255,92,26,0.30) 0%, rgba(255,45,120,0.12) 50%, transparent 70%)' }} />
      <div className="absolute bottom-[-60px] left-[5%] sm:bottom-[-100px] sm:left-[10%] w-[200px] h-[200px] sm:w-[320px] sm:h-[320px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, rgba(46,144,250,0.10) 60%, transparent 75%)' }} />
      <div className="hidden sm:block absolute top-[30%] left-[-60px] w-[240px] h-[240px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(255,170,0,0.18) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="relative z-10 text-center mb-10 px-4">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
          <div
            className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center relative flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF5C1A, #FF2D78)', border: '3px solid #B53C00', boxShadow: '4px 4px 0 #B53C00' }}
          >
            <div className="w-[14px] h-[14px] sm:w-[22px] sm:h-[22px] border-[2.5px] sm:border-[3px] border-white/85" />
          </div>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white tracking-tight leading-none">
            Memo<span className="text-sunrise">alive</span>
          </h1>
        </div>
        <p className="font-serif text-base sm:text-xl italic text-white/60 leading-snug">
          &ldquo;Keeps memories of people you care about.&rdquo;
        </p>
      </div>

      {/* CTA */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-4">
        <Link
          href={ROUTES.signup}
          className="btn btn-primary btn-xl"
        >
          Get started — it's free
        </Link>
        <Link
          href={ROUTES.login}
          className="btn btn-xl"
          style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.30)', color: 'white', boxShadow: '0 4px 0 rgba(255,255,255,0.15)' }}
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
