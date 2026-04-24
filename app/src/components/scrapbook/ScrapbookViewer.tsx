'use client'

/**
 * ScrapbookViewer — template-aware masonry grid with:
 *   • Template-driven visual styling (background, photo borders, shadows, tilt)
 *   • Inline edit mode for title, description, and template
 *   • Per-photo caption editing
 *   • Remove-item and delete-scrapbook controls
 */

import { useState, useTransition, CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ROUTES,
  SCRAPBOOK_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  type ScrapbookTemplateId,
} from '@/lib/constants'
import {
  removeScrapbookItem,
  deleteScrapbook,
  updateScrapbook,
  updateScrapbookItem,
} from '@/lib/actions/scrapbooks'
import type { ScrapbookWithItems, ScrapbookItem } from '@/lib/types'
import { TemplatePicker } from '@/components/scrapbook/TemplatePicker'

interface Props {
  scrapbook: ScrapbookWithItems
}

// Deterministic tilt angles per item — cycle through small offsets
const TILTS = [-2.5, 1.8, -1.2, 2.2, -1.8, 1.4, -2.1, 0.9]
function getTilt(index: number) {
  return TILTS[index % TILTS.length]!
}

export function ScrapbookViewer({ scrapbook }: Props) {
  const router = useRouter()

  // ── Template ─────────────────────────────────────────────────────────────
  const templateId = (scrapbook.template ?? DEFAULT_TEMPLATE_ID) as ScrapbookTemplateId
  const tpl = SCRAPBOOK_TEMPLATES.find(t => t.id === templateId)
          ?? SCRAPBOOK_TEMPLATES[0]!

  // ── State ─────────────────────────────────────────────────────────────────
  const [items, setItems]           = useState<ScrapbookItem[]>(scrapbook.items)
  const [hoveredId, setHoveredId]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Delete scrapbook confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit scrapbook mode
  const [editMode, setEditMode]       = useState(false)
  const [editTitle, setEditTitle]     = useState(scrapbook.title)
  const [editDesc, setEditDesc]       = useState(scrapbook.description ?? '')
  const [editTemplate, setEditTemplate] = useState<ScrapbookTemplateId>(templateId)
  const [editError, setEditError]     = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  // Local display values (updated on successful save)
  const [displayTitle, setDisplayTitle]     = useState(scrapbook.title)
  const [displayDesc, setDisplayDesc]       = useState(scrapbook.description ?? '')
  const [displayTemplate, setDisplayTemplate] = useState<ScrapbookTemplateId>(templateId)
  // Live template while editing (for instant preview feel)
  const activeTpl = editMode
    ? (SCRAPBOOK_TEMPLATES.find(t => t.id === editTemplate) ?? tpl)
    : (SCRAPBOOK_TEMPLATES.find(t => t.id === displayTemplate) ?? tpl)

  // Caption editing
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null)
  const [captionDraft, setCaptionDraft]          = useState('')
  const [savingCaption, setSavingCaption]        = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleRemoveItem(item: ScrapbookItem) {
    setDeletingId(item.id)
    startTransition(async () => {
      const result = await removeScrapbookItem(scrapbook.id, item.id)
      if (!result.error) {
        setItems(prev => prev.filter(i => i.id !== item.id))
      }
      setDeletingId(null)
    })
  }

  function handleDeleteScrapbook() {
    startTransition(async () => {
      await deleteScrapbook(scrapbook.id)
    })
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) { setEditError('Title is required.'); return }
    setSaving(true)
    setEditError(null)
    const result = await updateScrapbook(scrapbook.id, {
      title:       editTitle.trim(),
      description: editDesc.trim() || undefined,
      template:    editTemplate,
    })
    setSaving(false)
    if (result.error) { setEditError(result.error); return }
    setDisplayTitle(editTitle.trim())
    setDisplayDesc(editDesc.trim())
    setDisplayTemplate(editTemplate)
    setEditMode(false)
    router.refresh()
  }

  function openCaptionEdit(item: ScrapbookItem) {
    setEditingCaptionId(item.id)
    setCaptionDraft(item.caption ?? '')
  }

  async function handleSaveCaption(item: ScrapbookItem) {
    setSavingCaption(true)
    const result = await updateScrapbookItem(scrapbook.id, item.id, captionDraft)
    setSavingCaption(false)
    if (!result.error) {
      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, caption: captionDraft.trim() || undefined } : i)
      )
      setEditingCaptionId(null)
    }
  }

  // ── Page background ───────────────────────────────────────────────────────
  const pageStyle: CSSProperties = activeTpl.pageBg.startsWith('#') || activeTpl.pageBg.startsWith('rgb')
    ? { backgroundColor: activeTpl.pageBg }
    : { background: activeTpl.pageBg }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen transition-all duration-500"
      style={pageStyle}
    >
      <div className="max-w-5xl mx-auto px-5 py-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <Link
              href={ROUTES.scrapbooks}
              className="text-xs text-ink-soft hover:text-flame transition-colors mb-1 inline-block"
            >
              ← My scrapbooks
            </Link>
            <h1 className={`font-serif text-3xl font-bold text-ink leading-tight`}>
              {displayTitle}
            </h1>
            {displayDesc && (
              <p className="text-ink-soft text-sm mt-1">{displayDesc}</p>
            )}
            <p className="text-xs text-ink-faint mt-2">
              {items.length} photo{items.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <Link
              href={ROUTES.addToScrapbook(scrapbook.id)}
              className="btn btn-primary btn-sm btn-pill"
            >
              + Add photos
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditTitle(displayTitle)
                setEditDesc(displayDesc)
                setEditTemplate(displayTemplate)
                setEditError(null)
                setEditMode(true)
              }}
              className="btn btn-ghost btn-sm btn-pill text-ink-soft hover:text-ink"
              title="Edit scrapbook"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-ghost btn-sm btn-pill text-ink-soft hover:text-red-500"
              title="Delete scrapbook"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Edit panel ── */}
        {editMode && (
          <div className="mb-8 rounded-2xl bg-canvas border border-ink/10 shadow-lg p-6 space-y-6">
            <h2 className="font-serif text-lg font-semibold text-ink">Edit scrapbook</h2>

            {editError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="input w-full"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-ink">
                Description{' '}
                <span className="text-ink-faint text-xs font-normal">(optional)</span>
              </label>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={2}
                className="input w-full resize-none"
                placeholder="A short note about this collection…"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Style</label>
              <TemplatePicker
                value={editTemplate}
                onChange={setEditTemplate}
                name=""
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="btn btn-ghost btn-pill flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn btn-primary btn-pill flex-1"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── Delete confirm ── */}
        {showDeleteConfirm && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex items-center justify-between gap-4">
            <p className="text-sm text-red-800 font-medium">
              Delete "{displayTitle}"? This cannot be undone.
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost btn-sm btn-pill"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteScrapbook}
                disabled={isPending}
                className="btn btn-sm btn-pill bg-red-500 text-white hover:bg-red-600"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <div className="card p-16 text-center">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="font-serif text-lg font-semibold text-ink mb-2">
              No photos yet
            </h3>
            <p className="text-sm text-ink-soft mb-6 max-w-xs mx-auto">
              Add photos from your events or upload new ones to fill your scrapbook.
            </p>
            <Link
              href={ROUTES.addToScrapbook(scrapbook.id)}
              className="btn btn-primary btn-pill btn-md"
            >
              + Add photos
            </Link>
          </div>
        )}

        {/* ── Masonry grid ── */}
        {items.length > 0 && (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {items.map((item, idx) => {
              const isHovered        = hoveredId === item.id
              const isDeleting       = deletingId === item.id
              const isEditingCaption = editingCaptionId === item.id

              const tiltDeg = activeTpl.rotated ? getTilt(idx) : 0
              const cardStyle: CSSProperties = tiltDeg
                ? { transform: `rotate(${tiltDeg}deg)` }
                : {}

              return (
                <div
                  key={item.id}
                  className={[
                    'relative break-inside-avoid rounded-xl overflow-hidden group transition-transform duration-200',
                    activeTpl.photoShadow,
                    activeTpl.photoRing,
                  ].join(' ')}
                  style={{ ...cardStyle, backgroundColor: activeTpl.photoBg }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Photo */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.caption ?? ''}
                    className="w-full h-auto block"
                  />

                  {/* Caption edit textarea (inline, below photo) */}
                  {isEditingCaption && (
                    <div
                      className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-3 gap-2"
                      onClick={e => e.stopPropagation()}
                    >
                      <textarea
                        className="w-full rounded-lg bg-white/90 text-ink text-xs px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-flame"
                        rows={3}
                        value={captionDraft}
                        onChange={e => setCaptionDraft(e.target.value)}
                        placeholder="Add a caption…"
                        autoFocus
                      />
                      <div className="flex gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => setEditingCaptionId(null)}
                          className="flex-1 rounded-lg bg-white/20 text-white text-xs py-1.5 hover:bg-white/30 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCaption(item)}
                          disabled={savingCaption}
                          className="flex-1 rounded-lg bg-flame text-white text-xs py-1.5 font-semibold hover:bg-flame/90 transition-colors"
                        >
                          {savingCaption ? '…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hover overlay (hidden while editing caption) */}
                  {!isEditingCaption && (
                    <div className={[
                      'absolute inset-0 flex flex-col justify-between p-2.5 transition-opacity duration-200',
                      `bg-gradient-to-t ${activeTpl.overlayFrom} via-transparent to-transparent`,
                      isHovered ? 'opacity-100' : 'opacity-0',
                    ].join(' ')}>
                      {/* Top row: caption edit + remove */}
                      <div className="flex justify-between items-start gap-1">
                        <button
                          type="button"
                          onClick={() => openCaptionEdit(item)}
                          className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                          title="Edit caption"
                        >
                          <PencilIcon className="w-3 h-3 text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          disabled={isDeleting}
                          className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-red-500 transition-colors"
                          title="Remove from scrapbook"
                        >
                          {isDeleting
                            ? <span className="text-white text-[9px]">…</span>
                            : <XIcon className="w-3 h-3 text-white" />
                          }
                        </button>
                      </div>

                      {/* Bottom: caption + source link */}
                      <div className="space-y-1">
                        {item.caption && (
                          <p className={`text-xs leading-snug line-clamp-2 ${activeTpl.accentText}`}>
                            {item.caption}
                          </p>
                        )}
                        {item.sourceEventId && (
                          <Link
                            href={
                              item.sourceMemoryId
                                ? ROUTES.memory(item.sourceEventId, item.sourceMemoryId)
                                : ROUTES.event(item.sourceEventId)
                            }
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-white/70 text-[10px] hover:text-white transition-colors"
                          >
                            <LinkIcon className="w-2.5 h-2.5" />
                            View in event
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}
