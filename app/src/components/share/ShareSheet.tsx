'use client'

import { useState, useEffect, useRef } from 'react'
import { APP_URL } from '@/lib/constants'

export interface ShareSheetProps {
  isOpen:          boolean
  onClose:         () => void
  title:           string            // e.g. "My Reel", "Summer 2024"
  path:            string            // relative path, e.g. /reels/[id]
  isShared:        boolean
  onToggleShared:  (shared: boolean) => Promise<void>
  invitePath?:     string            // e.g. /join/[code] (optional)
  featureLabel?:   string            // e.g. "reel", "scrapbook"
}

export function ShareSheet({
  isOpen,
  onClose,
  title,
  path,
  isShared,
  onToggleShared,
  invitePath,
  featureLabel = 'creation',
}: ShareSheetProps) {
  const [shared, setShared]   = useState(isShared)
  const [copying, setCopying] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [toggling, setToggling] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Sync external isShared changes
  useEffect(() => { setShared(isShared) }, [isShared])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const publicUrl = `${APP_URL}${path}`

  async function handleToggle() {
    setToggling(true)
    const next = !shared
    await onToggleShared(next)
    setShared(next)
    setToggling(false)
  }

  async function handleCopy() {
    if (copying) return
    setCopying(true)
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => { setCopied(false); setCopying(false) }, 2000)
    } catch {
      setCopying(false)
    }
  }

  const encodedUrl   = encodeURIComponent(publicUrl)
  const encodedTitle = encodeURIComponent(`Check out my Memoalive ${featureLabel}: ${title}`)

  const socials = [
    {
      label: 'WhatsApp',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.118 1.526 5.847L.057 23.885a.5.5 0 00.606.61l6.213-1.629A11.935 11.935 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.934a9.921 9.921 0 01-5.036-1.369l-.36-.214-3.735.979.997-3.639-.235-.374A9.934 9.934 0 012.066 12C2.066 6.509 6.509 2.066 12 2.066S21.934 6.509 21.934 12 17.491 21.934 12 21.934z"/>
        </svg>
      ),
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      color: '#25D366',
    },
    {
      label: 'X / Twitter',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: '#000000',
    },
    {
      label: 'Email',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M2 7l10 7 10-7"/>
        </svg>
      ),
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedTitle}%20${encodedUrl}`,
      color: '#1C1917',
    },
  ]

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Sheet */}
      <div
        className="w-full sm:w-[440px] bg-canvas sm:rounded-lg overflow-hidden"
        style={{ border: '2.5px solid #1C1917', boxShadow: '4px 4px 0 #1C1917', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '2px solid #E7E0D8' }}>
          <h2 className="font-serif text-lg font-bold text-ink">Share</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink transition-colors w-10 h-10 flex items-center justify-center -mr-2">✕</button>
        </div>

        <div className="p-5 space-y-5">

          {/* Privacy toggle */}
          <div className="card p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">{shared ? 'Public' : 'Private'}</p>
              <p className="text-xs text-ink-soft mt-0.5">
                {shared
                  ? 'Anyone with the link can view this.'
                  : 'Only you can see this. Turn on to share.'}
              </p>
            </div>
            {/* Toggle switch */}
            <button
              onClick={handleToggle}
              disabled={toggling}
              aria-label="Toggle public sharing"
              className="relative inline-flex h-8 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
              style={{ background: shared ? '#FF5C1A' : '#D4C9B0', border: '2px solid #1C1917' }}
            >
              <span
                className="translate-x-0 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                style={{ transform: shared ? 'translateX(20px)' : 'translateX(2px)', marginTop: 6 }}
              />
            </button>
          </div>

          {/* Link + copy — only when shared */}
          {shared && (
            <div>
              <p className="text-xs font-bold tracking-widest text-ink-soft mb-2">SHAREABLE LINK</p>
              <div className="flex gap-2">
                <div
                  className="flex-1 px-3 py-2 text-xs text-ink-soft bg-surface truncate"
                  style={{ border: '2px solid #E7E0D8' }}
                >
                  {publicUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="btn btn-primary btn-sm flex-shrink-0"
                  style={{ minWidth: 80 }}
                >
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          )}

          {/* Social share — only when shared */}
          {shared && (
            <div>
              <p className="text-xs font-bold tracking-widest text-ink-soft mb-3">SHARE TO</p>
              <div className="flex gap-3">
                {socials.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded transition-colors hover:bg-surface"
                    style={{ border: '2px solid #E7E0D8' }}
                  >
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <span className="text-[10px] font-semibold text-ink-soft">{s.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Invite to app */}
          <div>
            <p className="text-xs font-bold tracking-widest text-ink-soft mb-2">INVITE TO MEMOALIVE</p>
            <a
              href={invitePath ?? '/join'}
              className="card p-4 flex items-center gap-3 hover:border-flame/30 transition-colors group"
            >
              <div
                className="w-9 h-9 flex items-center justify-center flex-shrink-0 bg-sunrise text-white"
                style={{ border: '2px solid #B53C00', boxShadow: '2px 2px 0 #B53C00' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink group-hover:text-flame transition-colors">Invite someone</p>
                <p className="text-xs text-ink-soft">Send them a link to join Memoalive</p>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-ink-faint">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
