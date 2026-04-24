'use client'

/**
 * PhoneConnectModal — lets the scrapbook owner upload photos from their phone.
 *
 * Flow:
 *  1. Creates an upload session on mount (1-hour expiry, 12-char token).
 *  2. Builds a URL like /m/[token] and renders it as a QR code the user can scan.
 *  3. Polls getSessionPhotos() every 3 seconds; new arrivals animate in.
 *  4. Each thumbnail has an "Add to page" button that calls onAddPhoto(url).
 *
 * The QR is served by api.qrserver.com (no key required).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createUploadSession, getSessionPhotos, type SessionPhoto } from '@/lib/actions/upload'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  scrapbookId:    string
  scrapbookTitle: string
  onAddPhoto:     (url: string) => void
  onClose:        () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PhoneConnectModal({ scrapbookId, scrapbookTitle, onAddPhoto, onClose }: Props) {
  const [sessionId,  setSessionId]  = useState<string | null>(null)
  const [uploadUrl,  setUploadUrl]  = useState<string | null>(null)
  const [photos,     setPhotos]     = useState<SessionPhoto[]>([])
  const [loadingSession, setLoadingSession] = useState(true)
  const [sessionError,   setSessionError]   = useState<string | null>(null)
  const [copied,         setCopied]          = useState(false)
  const [addedIds,       setAddedIds]        = useState<Set<string>>(new Set())

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const knownIds   = useRef<Set<string>>(new Set())

  // ── Create upload session ─────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoadingSession(true)
      const result = await createUploadSession(scrapbookId, scrapbookTitle)
      if (cancelled) return

      if (result.error || !result.session) {
        setSessionError(result.error ?? 'Could not create upload session.')
        setLoadingSession(false)
        return
      }

      const { sessionId: sid, token } = result.session
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url    = `${origin}/m/${token}`

      setSessionId(sid)
      setUploadUrl(url)
      setLoadingSession(false)
    }

    init()
    return () => { cancelled = true }
  }, [scrapbookId, scrapbookTitle])

  // ── Poll for new photos ───────────────────────────────────────────────────

  const poll = useCallback(async () => {
    if (!sessionId) return
    const incoming = await getSessionPhotos(sessionId)

    // Only update state if there are genuinely new photos
    const fresh = incoming.filter(p => !knownIds.current.has(p.id))
    if (fresh.length > 0) {
      fresh.forEach(p => knownIds.current.add(p.id))
      setPhotos(prev => [...prev, ...fresh])
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    // Initial fetch
    poll()
    // Poll every 3 seconds
    pollingRef.current = setInterval(poll, 3000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [sessionId, poll])

  // ── Copy URL ──────────────────────────────────────────────────────────────

  async function handleCopy() {
    if (!uploadUrl) return
    await navigator.clipboard.writeText(uploadUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Add photo to canvas ───────────────────────────────────────────────────

  function handleAdd(photo: SessionPhoto) {
    if (addedIds.has(photo.id)) return
    setAddedIds(prev => new Set(prev).add(photo.id))
    onAddPhoto(photo.url)
  }

  // ── QR URL ────────────────────────────────────────────────────────────────

  const qrSrc = uploadUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(uploadUrl)}&size=220x220&margin=10&color=3D2B18&bgcolor=FFF8F5`
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-ink/8">
          <div>
            <h2 className="font-serif text-base font-semibold text-ink">Add photos from phone</h2>
            <p className="text-xs text-ink-soft mt-0.5">Scan the QR code with your phone camera</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-ink/8 hover:bg-ink/15 text-ink-soft flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* QR / loading / error */}
          {loadingSession && (
            <div className="flex items-center justify-center h-[220px]">
              <div className="w-8 h-8 rounded-full border-2 border-flame border-t-transparent animate-spin" />
            </div>
          )}

          {sessionError && (
            <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm text-red-500">{sessionError}</p>
              <p className="text-xs text-ink-soft">Make sure you're logged in and try refreshing the page.</p>
            </div>
          )}

          {qrSrc && (
            <div className="flex flex-col items-center gap-3">
              {/* QR code */}
              <div className="rounded-2xl overflow-hidden border border-ink/8 shadow-sm"
                   style={{ background: '#FFF8F5' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="Scan to upload photos"
                  width={220}
                  height={220}
                  style={{ display: 'block' }}
                />
              </div>

              {/* Or copy link */}
              <p className="text-xs text-ink-faint">or copy the link</p>
              <div className="w-full flex items-center gap-2">
                <div className="flex-1 rounded-xl bg-ink/5 px-3 py-2 text-[11px] text-ink font-mono truncate">
                  {uploadUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`btn btn-sm btn-pill transition-colors flex-shrink-0 ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'btn-ghost border border-ink/15'
                  }`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <p className="text-[11px] text-ink-faint text-center">
                This link works for 1 hour · No account needed on phone
              </p>
            </div>
          )}

          {/* Uploaded photos */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-ink">
                  {photos.length} photo{photos.length > 1 ? 's' : ''} received
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleAdd(photo)}
                        disabled={addedIds.has(photo.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg shadow transition-all ${
                          addedIds.has(photo.id)
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-flame hover:bg-flame hover:text-white'
                        }`}
                      >
                        {addedIds.has(photo.id) ? '✓ Added' : 'Add'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Add all button */}
              {photos.some(p => !addedIds.has(p.id)) && (
                <button
                  type="button"
                  onClick={() => photos.filter(p => !addedIds.has(p.id)).forEach(handleAdd)}
                  className="btn btn-primary btn-pill btn-sm w-full mt-3"
                >
                  Add all to page
                </button>
              )}
            </div>
          )}

          {/* Waiting state — session ready but no photos yet */}
          {!loadingSession && !sessionError && photos.length === 0 && (
            <div className="text-center py-2">
              <p className="text-xs text-ink-soft leading-relaxed">
                Waiting for photos…<br />
                Once you upload on your phone they'll appear here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
