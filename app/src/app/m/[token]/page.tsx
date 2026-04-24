'use client'

/**
 * /m/[token] — Mobile photo upload page.
 *
 * Opened by scanning a QR code from the desktop scrapbook editor.
 * No login required — the session token is the security.
 * Lets the user pick photos from their camera roll or take new ones,
 * then uploads them one by one with clear per-photo feedback.
 */

import { useState, useRef, useEffect } from 'react'

interface SessionInfo {
  valid: boolean
  scrapbookTitle?: string | null
  expiresAt?: string
}

interface PhotoState {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}

export default function MobileUploadPage({
  params,
}: {
  params: { token: string }
}) {
  const { token } = params
  const [session,  setSession]  = useState<SessionInfo | null>(null)
  const [photos,   setPhotos]   = useState<PhotoState[]>([])
  const [allDone,  setAllDone]  = useState(false)

  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef  = useRef<HTMLInputElement>(null)

  // ── Fetch session info ────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/upload/${token}`)
      .then(r => r.json())
      .then((d: SessionInfo) => setSession(d))
      .catch(() => setSession({ valid: false }))
  }, [token])

  // ── Handle file selection ─────────────────────────────────────────────────

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const newPhotos: PhotoState[] = Array.from(files).map(file => ({
      id:      crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status:  'pending',
    }))

    setPhotos(prev => {
      const next = [...prev, ...newPhotos]
      // Start uploading after state update
      setTimeout(() => uploadQueue(next), 0)
      return next
    })
  }

  // ── Upload queue: one at a time ───────────────────────────────────────────

  async function uploadQueue(list: PhotoState[]) {
    for (const photo of list) {
      if (photo.status !== 'pending') continue
      await uploadOne(photo)
    }
    setAllDone(true)
  }

  async function uploadOne(photo: PhotoState) {
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'uploading' } : p))

    try {
      const form = new FormData()
      form.append('file', photo.file)

      const res  = await fetch(`/api/upload/${token}`, { method: 'POST', body: form })
      const data = await res.json() as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setPhotos(prev => prev.map(p =>
          p.id === photo.id ? { ...p, status: 'error', error: data.error ?? 'Upload failed' } : p
        ))
      } else {
        setPhotos(prev => prev.map(p =>
          p.id === photo.id ? { ...p, status: 'done', url: data.url } : p
        ))
      }
    } catch {
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, status: 'error', error: 'Network error' } : p
      ))
    }
  }

  async function retryFailed() {
    const failed = photos.filter(p => p.status === 'error')
    setAllDone(false)
    for (const p of failed) {
      setPhotos(prev => prev.map(x => x.id === p.id ? { ...x, status: 'pending' } : x))
    }
    for (const p of failed) await uploadOne({ ...p, status: 'pending' })
    setAllDone(true)
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (session === null) {
    return (
      <MobileShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-flame border-t-transparent animate-spin" />
        </div>
      </MobileShell>
    )
  }

  // ── Invalid/expired session ───────────────────────────────────────────────

  if (!session.valid) {
    return (
      <MobileShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">⏱️</div>
          <h2 className="text-xl font-semibold text-ink">Link expired</h2>
          <p className="text-ink-soft text-sm leading-relaxed">
            This upload link has expired or is invalid.
            Go back to Memoalive on your computer to generate a fresh one.
          </p>
        </div>
      </MobileShell>
    )
  }

  // ── Counts ────────────────────────────────────────────────────────────────

  const total     = photos.length
  const doneCount = photos.filter(p => p.status === 'done').length
  const failCount = photos.filter(p => p.status === 'error').length
  const uploading = photos.some(p => p.status === 'uploading')

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MobileShell>
      {/* Header */}
      <div className="px-5 pt-10 pb-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-flame/15 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">📸</span>
        </div>
        <h1 className="text-xl font-bold text-ink leading-tight">
          {session.scrapbookTitle
            ? `Add to "${session.scrapbookTitle}"`
            : 'Upload photos'}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Pick photos from your library or take new ones.
          They'll appear instantly on your computer.
        </p>
      </div>

      {/* Upload buttons (only show when not all done) */}
      {!allDone && (
        <div className="px-5 space-y-3">
          {/* Camera */}
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-2xl bg-flame text-white font-semibold py-4 text-base
                       active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📷</span> Take a photo
          </button>

          {/* Library */}
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-2xl border-2 border-ink/15 bg-white text-ink font-semibold py-4 text-base
                       active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🖼️</span> Choose from library
          </button>

          {/* Hidden inputs */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Photo list */}
      {photos.length > 0 && (
        <div className="mt-6 px-5 space-y-3">
          {total > 1 && (
            <p className="text-xs text-ink-faint font-medium uppercase tracking-wide">
              {doneCount} of {total} uploaded
              {failCount > 0 && ` · ${failCount} failed`}
            </p>
          )}
          {photos.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white border border-ink/8 p-3">
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt=""
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-medium truncate">
                  {p.file.name}
                </p>
                <p className="text-xs text-ink-soft mt-0.5">
                  {(p.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
                {p.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5">{p.error}</p>
                )}
              </div>
              {/* Status */}
              <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                {p.status === 'pending'   && <span className="text-ink-faint text-lg">○</span>}
                {p.status === 'uploading' && (
                  <div className="w-5 h-5 rounded-full border-2 border-flame border-t-transparent animate-spin" />
                )}
                {p.status === 'done'      && <span className="text-green-500 text-lg">✓</span>}
                {p.status === 'error'     && <span className="text-red-500 text-lg">✕</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All done state */}
      {allDone && doneCount > 0 && (
        <div className="mt-6 px-5">
          <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="font-semibold text-green-800">
              {doneCount} photo{doneCount > 1 ? 's' : ''} uploaded!
            </h2>
            <p className="text-sm text-green-700 mt-1">
              They're ready to add to your scrapbook on your computer.
            </p>
          </div>

          {/* Add more */}
          <button
            type="button"
            onClick={() => { setAllDone(false); libraryRef.current?.click() }}
            className="w-full mt-3 rounded-2xl border-2 border-ink/15 bg-white text-ink font-semibold py-4 text-base
                       active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">＋</span> Add more photos
          </button>
        </div>
      )}

      {/* Retry failed */}
      {allDone && failCount > 0 && (
        <div className="px-5 mt-3">
          <button
            type="button"
            onClick={retryFailed}
            className="w-full rounded-2xl border-2 border-red-200 text-red-600 font-semibold py-3 text-sm active:scale-95 transition-all"
          >
            Retry {failCount} failed photo{failCount > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-5 py-8 text-center">
        <p className="text-[11px] text-ink-faint">
          Memoalive · This link expires in 1 hour
        </p>
      </div>
    </MobileShell>
  )
}

// ── Shell layout ──────────────────────────────────────────────────────────────

function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFF8F5 0%, #FFF5F0 100%)' }}
    >
      {children}
    </div>
  )
}
