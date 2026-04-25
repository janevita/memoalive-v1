'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Icons (inline SVG from Memoalive icon pack)
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 4l9 8" />
      <path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12l4 4 4-4" />
      <path d="M12 8v8" />
    </svg>
  )
}

function JournalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="14" height="20" rx="1" />
      <path d="M4 6h14M4 10h10M4 14h8" />
      <path d="M2 4v16" strokeWidth="3" strokeLinecap="square" />
    </svg>
  )
}

function ScrapbookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function LogoMark() {
  return (
    <div
      className="w-8 h-8 flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #FF5C1A, #FF2D78)', border: '2px solid #B53C00', boxShadow: '2px 2px 0 #B53C00' }}
    >
      <div className="w-[11px] h-[11px] border-[2px] border-white/90" />
    </div>
  )
}

const navItems = [
  { href: ROUTES.dashboard,   label: 'Home',      icon: HomeIcon },
  { href: ROUTES.scrapbooks,  label: 'Scrapbooks', icon: ScrapbookIcon },
  { href: ROUTES.newMemory,   label: 'Add',       icon: PlusIcon, primary: true },
  { href: ROUTES.journals,    label: 'Journals',  icon: JournalIcon },
  { href: ROUTES.profile,     label: 'Profile',   icon: UserIcon },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-canvas sticky top-0 z-50" style={{ borderBottom: '2.5px solid #1C1917' }}>
        <Link href={ROUTES.dashboard} className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-serif text-xl font-bold text-ink">
            Memo<span className="text-sunrise">alive</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {navItems.filter(i => !i.primary).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all',
                  active
                    ? 'bg-sunrise text-white'
                    : 'text-ink hover:bg-surface'
                )}
                style={active
                  ? { border: '2px solid #B53C00', boxShadow: '2px 2px 0 #B53C00' }
                  : { border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
          <Link
            href={ROUTES.newMemory}
            className="btn btn-primary btn-sm ml-2"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add memory
          </Link>
        </nav>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-5 py-3 bg-canvas sticky top-0 z-50" style={{ borderBottom: '2.5px solid #1C1917' }}>
        <Link href={ROUTES.dashboard} className="flex items-center gap-2">
          <LogoMark />
          <span className="font-serif text-lg font-bold text-ink">
            Memo<span className="text-sunrise">alive</span>
          </span>
        </Link>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-canvas flex items-stretch" style={{ borderTop: '2.5px solid #1C1917' }}>
        {navItems.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
              >
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ background: '#FF5C1A', border: '2px solid #B53C00', boxShadow: '0 3px 0 #B53C00' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </Link>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
                active ? 'text-sunrise' : 'text-ink-soft'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          )
        })}
        <div className="absolute bottom-0 inset-x-0 h-safe-bottom bg-canvas" />
      </nav>

      {/* Mobile bottom nav clearance */}
      <div className="md:hidden h-16" aria-hidden />
    </>
  )
}
