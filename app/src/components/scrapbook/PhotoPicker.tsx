'use client'

/**
 * PhotoPicker — lets users select photos from their events or upload new ones.
 * Used inside the Add-to-scrapbook flow.
 */

import React, { useCallback, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addItemsToScrapbook } from '@/lib/actions/scrapbooks'
import type { PickablePhoto } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

type TabId = 'events' | 'upload'

interface Props {
  scrapbookId: string
  photos:      PickablePhoto[]   // server-fetched, passed in as prop
}

export function PhotoPicker({ scrapbookId, photos }: Props) {
  const router  = useRouter()
  const [tab, setTab]           = useState<TabId>('events')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadPreviews, setUploadPreviews] = useState<{ url: string; file: File }[]>([])
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  // Group event photos by event
  const eventGroups = groupByEvent(photos)
  const eventIds    = Object.keys(eventGroups)

  // ── Selection toggle ────────────────────────────────────────────────────────

  function togglePhoto(url: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else               next.add(url)
      return next
    })
  }

  function toggleEvent(eventId: string, select: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      const group = eventGroups[eventId] ?? []
      for (const p of group) {
        if (select) next.add(p.url)
        else        next.delete(p.url)
      }
      return next
    })
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    const supabase = createClient()
    const newPreviews: { url: string; file: File }[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `scrapbooks/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('memory-media')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (upErr) continue

      const { data: { publicUrl } } = supabase.storage
        .from('memory-media')
        .getPublicUrl(path)

      newPreviews.push({ url: publicUrl, file })
    }

    setUploadPreviews(prev => [...prev, ...newPreviews])
    // Auto-select all newly uploaded
    setSelected(prev => {
      const next = new Set(prev)
      for (const p of newPreviews) next.add(p.url)
      return next
    })
    setUploading(false)
  }, [])

  // ── Save ────────────────────────────────────────────────────────────────────

  function handleSave() {
    if (selected.size === 0) return
    setError(null)

    // Build payload — attach event/memory metadata for event photos
    const urlToMeta: Record<string, Omit<PickablePhoto, 'url' | 'thumbnailUrl'>> = {}
    for (const p of photos) urlToMeta[p.url] = p

    const items = Array.from(selected).map(url => {
      const meta = urlToMeta[url]
      return {
        url,
        sourceMemoryId: meta?.memoryId,
        sourceEventId:  meta?.eventId,
      }
    })

    startTransition(async () => {
      const result = await addItemsToScrapbook(scrapbookId, items)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push(ROUTES.scrapbook(scrapbookId))
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink/10">
        {(['events', 'upload'] as TabId[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-flame text-flame'
                : 'border-transparent text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            {t === 'events' ? 'From events' : 'Upload new'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab: Events */}
      {tab === 'events' && (
        <div className="space-y-6">
          {eventIds.length === 0 && (
            <p className="text-center text-sm text-ink-soft py-8">
              No photos in your events yet. Upload photos to an event first.
            </p>
          )}
          {eventIds.map(eventId => {
            const group  = eventGroups[eventId]!
            const allSel = group.every(p => selected.has(p.url))
            return (
              <div key={eventId}>
                {/* Event header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {group[0]!.eventName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleEvent(eventId, !allSel)}
                    className="text-xs text-ink-soft hover:text-flame transition-colors"
                  >
                    {allSel ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {/* Photo grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {group.map(photo => {
                    const sel = selected.has(photo.url)
                    return (
                      <button
                        key={photo.url}
                        type="button"
                        onClick={() => togglePhoto(photo.url)}
                        className="relative aspect-square rounded-lg overflow-hidden focus:outline-none"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.thumbnailUrl ?? photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {/* Selection overlay */}
                        <div className={[
                          'absolute inset-0 transition-all',
                          sel
                            ? 'bg-flame/20 ring-2 ring-flame ring-inset'
                            : 'bg-transparent hover:bg-ink/10',
                        ].join(' ')} />
                        {sel && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-flame flex items-center justify-center shadow">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Upload */}
      {tab === 'upload' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={[
              'w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3',
              'transition-colors cursor-pointer',
              'border-ink/15 hover:border-flame/60 hover:bg-flame-glow/30',
            ].join(' ')}
          >
            <UploadIcon className="w-8 h-8 text-ink-soft" />
            <span className="text-sm text-ink-soft">
              {uploading ? 'Uploading…' : 'Tap to choose photos'}
            </span>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={e => handleUploadFiles(e.target.files)}
          />

          {uploadPreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {uploadPreviews.map(({ url }) => {
                const sel = selected.has(url)
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => togglePhoto(url)}
                    className="relative aspect-square rounded-lg overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className={[
                      'absolute inset-0 transition-all',
                      sel
                        ? 'bg-flame/20 ring-2 ring-flame ring-inset'
                        : 'hover:bg-ink/10',
                    ].join(' ')} />
                    {sel && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-flame flex items-center justify-center shadow">
                        <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer action */}
      <div className="sticky bottom-0 bg-canvas/95 backdrop-blur-sm pt-4 pb-2 border-t border-ink/8 -mx-4 px-4 mt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={selected.size === 0 || isPending || uploading}
          className="btn btn-primary btn-pill w-full"
        >
          {isPending ? 'Saving…' : `Add ${selected.size > 0 ? selected.size : ''} photo${selected.size !== 1 ? 's' : ''} to scrapbook`}
        </button>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByEvent(photos: PickablePhoto[]): Record<string, PickablePhoto[]> {
  const out: Record<string, PickablePhoto[]> = {}
  for (const p of photos) {
    if (!out[p.eventId]) out[p.eventId] = []
    out[p.eventId]!.push(p)
  }
  return out
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
