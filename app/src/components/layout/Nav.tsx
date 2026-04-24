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
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}
    >
      <div className="w-[11px] h-[11px] rounded-full border-[1.5px] border-white/85" />
    </div>
  )
}

const navItems = [
  { href: ROUTES.dashboard,   label: 'Home',      icon: HomeIcon },
  { href: ROUTES.search,      label: 'Search',    icon: SearchIcon },
  { href: ROUTES.newMemory,   label: 'Add',       icon: PlusIcon, primary: true },
  { href: ROUTES.scrapbooks,  label: 'Scrapbooks', icon: ScrapbookIcon },
  { href: ROUTES.profile,     label: 'Profile',   icon: UserIcon },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-ink/8 bg-canvas/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href={ROUTES.dashboard} className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-serif text-xl font-bold text-ink">
            Memo<span className="text-flame">alive</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.filter(i => !i.primary).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  active
                    ? 'bg-flame-glow text-flame'
                    : 'text-ink-soft hover:text-ink hover:bg-ink/5'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
          <Link
            href={ROUTES.newMemory}
            className="btn btn-primary btn-sm btn-pill ml-2"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add memory
          </Link>
        </nav>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-5 py-3 border-b border-ink/8 bg-canvas/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href={ROUTES.dashboard} className="flex items-center gap-2">
          <LogoMark />
          <span className="font-serif text-lg font-bold text-ink">
            Memo<span className="text-flame">alive</span>
          </span>
        </Link>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-canvas/95 backdrop-blur-sm border-t border-ink/8 flex items-stretch">
        {navItems.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
              >
                <div className="w-10 h-10 rounded-full bg-flame flex items-center justify-center shadow-md">
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
                active ? 'text-flame' : 'text-ink-soft'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        {/* Safe-area spacer */}
        <div className="absolute bottom-0 inset-x-0 h-safe-bottom bg-canvas/95" />
      </nav>

      {/* Mobile bottom nav clearance */}
      <div className="md:hidden h-16" aria-hidden />
    </>
  )
}
