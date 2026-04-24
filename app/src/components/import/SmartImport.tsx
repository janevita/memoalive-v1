'use client'

/**
 * SmartImport — 5-step wizard for bulk photo import.
 *
 * Steps:
 *   pick     → file picker / drag-drop
 *   analyze  → reading EXIF, clustering, geocoding (progress bar)
 *   review   → editable cluster cards, skip toggle
 *   creating → uploading to Storage, calling server action
 *   done     → success screen with links to created events
 */

import React, { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'
import Link from 'next/link'
import {
  readAllExif,
  clusterPhotos,
  geocodeClusters,
  type PhotoCluster,
  type PhotoWithMeta,
} from '@/lib/utils/clustering'
import { importClusters, type ImportResult } from '@/lib/actions/import'

// ── Types & state ────────────────────────────────────────────────────────────

type Step = 'pick' | 'analyze' | 'review' | 'creating' | 'done'

interface AnalyzeStatus {
  phase:   'reading' | 'clustering' | 'geocoding'
  done:    number
  total:   number
}

// ── Utility components ────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full bg-ink/8 rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F9761C, #EC4799)' }}
      />
    </div>
  )
}

function ClusterThumbs({ photos }: { photos: PhotoWithMeta[] }) {
  const shown = photos.slice(0, 4)
  return (
    <div className="grid grid-cols-4 gap-1 rounded-lg overflow-hidden aspect-[4/1]">
      {shown.map((p, i) => (
        <div key={i} className="relative bg-ink/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      {Array.from({ length: 4 - shown.length }).map((_, i) => (
        <div key={`empty-${i}`} className="bg-ink/5" />
      ))}
    </div>
  )
}

// ── Step: Pick ────────────────────────────────────────────────────────────────

function PickStep({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const jpegs = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (jpegs.length > 0) onFiles(jpegs)
  }, [onFiles])

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold text-ink">Import photos</h2>
        <p className="text-ink-soft text-sm max-w-sm">
          Select photos from any device. We'll read the dates and locations to
          group them into events automatically.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={[
          'w-full max-w-sm border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4',
          'transition-colors cursor-pointer',
          dragging
            ? 'border-flame bg-flame-glow'
            : 'border-ink/15 hover:border-flame/60 hover:bg-flame-glow/40',
        ].join(' ')}
      >
        <UploadIcon className="w-10 h-10 text-ink-soft" />
        <span className="text-sm font-medium text-ink-soft">
          Tap to choose photos or drag and drop
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ── Step: Analyze ─────────────────────────────────────────────────────────────

function AnalyzeStep({ status }: { status: AnalyzeStatus }) {
  const labels: Record<AnalyzeStatus['phase'], string> = {
    reading:    'Reading photo metadata…',
    clustering: 'Grouping by date and location…',
    geocoding:  'Looking up place names…',
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold text-ink">Analysing photos</h2>
        <p className="text-ink-soft text-sm">{labels[status.phase]}</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <ProgressBar value={status.done} max={status.total || 1} />
        <p className="text-center text-xs text-ink-soft">
          {status.total > 0 ? `${status.done} / ${status.total}` : '…'}
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-flame animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Step: Review ──────────────────────────────────────────────────────────────

function ReviewStep({
  clusters,
  onClusters,
  onConfirm,
}: {
  clusters: PhotoCluster[]
  onClusters: (clusters: PhotoCluster[]) => void
  onConfirm: () => void
}) {
  const active = clusters.filter(c => !c.skip)

  function update(id: string, patch: Partial<PhotoCluster>) {
    onClusters(clusters.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-bold text-ink">
          {clusters.length} event{clusters.length !== 1 ? 's' : ''} detected
        </h2>
        <p className="text-ink-soft text-sm">
          Review and name each event before creating them.
        </p>
      </div>

      <div className="space-y-4">
        {clusters.map(cluster => (
          <div
            key={cluster.id}
            className={[
              'rounded-2xl border p-4 space-y-3 transition-opacity',
              cluster.skip
                ? 'border-ink/10 opacity-50'
                : 'border-ink/15 bg-canvas shadow-soft',
            ].join(' ')}
          >
            {/* Thumbnails */}
            <ClusterThumbs photos={cluster.photos} />

            {/* Name field */}
            <input
              type="text"
              value={cluster.name}
              onChange={e => update(cluster.id, { name: e.target.value })}
              disabled={cluster.skip}
              placeholder="Event name"
              className="w-full text-sm font-medium bg-transparent border-b border-ink/10 focus:border-flame pb-1 outline-none disabled:pointer-events-none"
            />

            {/* Meta row */}
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span>
                {cluster.photos.length} photo{cluster.photos.length !== 1 ? 's' : ''}
                {cluster.location ? ` · ${cluster.location}` : ''}
                {cluster.startTime
                  ? ` · ${cluster.startTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : ''}
              </span>

              <button
                type="button"
                onClick={() => update(cluster.id, { skip: !cluster.skip })}
                className="text-ink-soft hover:text-ink transition-colors text-xs"
              >
                {cluster.skip ? 'Include' : 'Skip'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 flex flex-col gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={active.length === 0}
          className="btn btn-primary btn-pill w-full"
        >
          Create {active.length} event{active.length !== 1 ? 's' : ''}
        </button>
        {active.length < clusters.length && (
          <p className="text-center text-xs text-ink-soft">
            {clusters.length - active.length} event{clusters.length - active.length !== 1 ? 's' : ''} will be skipped
          </p>
        )}
      </div>
    </div>
  )
}

// ── Step: Creating ────────────────────────────────────────────────────────────

function CreatingStep({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold text-ink">Creating events…</h2>
        <p className="text-ink-soft text-sm">Uploading photos and saving your events</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <ProgressBar value={done} max={total || 1} />
        <p className="text-center text-xs text-ink-soft">
          {done} / {total} events
        </p>
      </div>
    </div>
  )
}

// ── Step: Done ────────────────────────────────────────────────────────────────

function DoneStep({ results }: { results: ImportResult[] }) {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center space-y-2">
        <div className="text-4xl">🎉</div>
        <h2 className="font-serif text-2xl font-bold text-ink">All done!</h2>
        <p className="text-ink-soft text-sm">
          {results.length} event{results.length !== 1 ? 's' : ''} created from your photos.
        </p>
      </div>

      <div className="w-full space-y-2">
        {results.map(r => (
          <Link
            key={r.eventId}
            href={ROUTES.event(r.eventId)}
            className="flex items-center justify-between w-full p-4 rounded-2xl border border-ink/10 bg-canvas hover:bg-ink/3 transition-colors"
          >
            <span className="text-sm font-medium text-ink">{r.eventName}</span>
            <ChevronRightIcon className="w-4 h-4 text-ink-soft flex-shrink-0" />
          </Link>
        ))}
      </div>

      <Link href={ROUTES.dashboard} className="btn btn-ghost btn-pill text-sm">
        Back to home
      </Link>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────

export function SmartImport() {
  const [step, setStep]         = useState<Step>('pick')
  const [status, setStatus]     = useState<AnalyzeStatus>({ phase: 'reading', done: 0, total: 0 })
  const [clusters, setClusters] = useState<PhotoCluster[]>([])
  const [createDone, setCreateDone] = useState(0)
  const [results, setResults]   = useState<ImportResult[]>([])
  const [error, setError]       = useState<string | null>(null)

  // Track all object URLs so we can revoke them on completion
  const objectUrlsRef = useRef<string[]>([])

  // ── Phase 1: pick → analyze ───────────────────────────────────────────────

  async function handleFiles(files: File[]) {
    setStep('analyze')
    setError(null)

    try {
      // Read EXIF
      setStatus({ phase: 'reading', done: 0, total: files.length })
      const photos = await readAllExif(files, (done, total) =>
        setStatus({ phase: 'reading', done, total })
      )
      objectUrlsRef.current = photos.map(p => p.previewUrl)

      // Cluster
      setStatus({ phase: 'clustering', done: 0, total: 1 })
      const raw = clusterPhotos(photos)
      setStatus({ phase: 'clustering', done: 1, total: 1 })

      // Geocode
      const needsGeo = raw.filter(c => c.centerLat !== null).length
      setStatus({ phase: 'geocoding', done: 0, total: needsGeo || 1 })
      const geocoded = await geocodeClusters(raw, (done, total) =>
        setStatus({ phase: 'geocoding', done, total })
      )

      setClusters(geocoded)
      setStep('review')
    } catch (e) {
      setError('Something went wrong reading your photos. Please try again.')
      setStep('pick')
    }
  }

  // ── Phase 2: review → creating → done ────────────────────────────────────

  async function handleConfirm() {
    const active = clusters.filter(c => !c.skip)
    if (active.length === 0) return

    setStep('creating')
    setCreateDone(0)
    setError(null)

    const supabase = createClient()
    const importData = []

    for (let i = 0; i < active.length; i++) {
      const cluster = active[i]
      const uploadedPhotos = []

      // Upload each photo to Supabase Storage
      for (const photo of cluster.photos) {
        try {
          const ext    = photo.file.name.split('.').pop() ?? 'jpg'
          const path   = `imports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('memory-media')
            .upload(path, photo.file, { contentType: photo.file.type, upsert: false })

          if (upErr) continue

          const { data: { publicUrl } } = supabase.storage
            .from('memory-media')
            .getPublicUrl(path)

          uploadedPhotos.push({
            url:          publicUrl,
            thumbnailUrl: null,
            takenAt:      photo.timestamp?.toISOString() ?? null,
          })
        } catch {
          // Skip individual failed uploads
        }
      }

      importData.push({
        name:      cluster.name,
        startTime: cluster.startTime?.toISOString() ?? null,
        endTime:   cluster.endTime?.toISOString()   ?? null,
        location:  cluster.location,
        photos:    uploadedPhotos,
      })

      setCreateDone(i + 1)
    }

    // Call server action
    const { results: created, error: importErr } = await importClusters(importData)
    if (importErr) {
      setError(importErr)
      setStep('review')
      return
    }

    // Revoke object URLs
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    objectUrlsRef.current = []

    setResults(created ?? [])
    setStep('done')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'pick'     && <PickStep onFiles={handleFiles} />}
      {step === 'analyze'  && <AnalyzeStep status={status} />}
      {step === 'review'   && (
        <ReviewStep
          clusters={clusters}
          onClusters={setClusters}
          onConfirm={handleConfirm}
        />
      )}
      {step === 'creating' && <CreatingStep done={createDone} total={clusters.filter(c => !c.skip).length} />}
      {step === 'done'     && <DoneStep results={results} />}
    </div>
  )
}

// ── Inline icons ──────────────────────────────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
