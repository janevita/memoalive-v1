'use client'

/**
 * ScrapbookCanvas — interactive A4-landscape canvas editor.
 *
 * Canvas is 1200×848 logical pixels, displayed scaled to fit the container.
 * Elements are absolutely positioned in that space and support:
 *   • Drag to move
 *   • Rotation handle (arc above element)
 *   • Corner resize handles
 *   • Double-click to edit text
 *   • Per-element z-order controls
 *   • Template-driven backgrounds and default font styles
 *
 * All changes save optimistically to the server on interaction end.
 */

import { useState, useEffect, useRef, useCallback, CSSProperties, MutableRefObject } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  SCRAPBOOK_TEMPLATES, ROUTES, DEFAULT_TEMPLATE_ID,
  type ScrapbookTemplateId,
} from '@/lib/constants'
import type { ScrapbookWithPages, ScrapbookPage, CanvasElement, ElementStyle } from '@/lib/types'
import {
  createPage, deletePage, createElement, updateElement, deleteElement,
  updateScrapbook, deleteScrapbook, toggleScrapbookSharing,
} from '@/lib/actions/scrapbooks'
import { StickerPicker } from './StickerPicker'
import { CommentPanel } from './CommentPanel'
import { createUploadSession, getSessionPhotos, type SessionPhoto } from '@/lib/actions/upload'

// ── Canvas constants ──────────────────────────────────────────────────────────

const CW = 1200   // canvas logical width
const CH = 848    // canvas logical height (A4 landscape ≈ 1:√2)

// Auto-layout positions for photos (in logical px), cycled by element count
const PHOTO_LAYOUTS = [
  { x: 30,  y: 40,  w: 460, h: 345, r: -2   },
  { x: 660, y: 30,  w: 480, h: 280, r: 1.5  },
  { x: 680, y: 330, w: 360, h: 270, r: -1   },
  { x: 50,  y: 420, w: 360, h: 270, r: 2    },
]

// Template-specific text colours (for new text elements)
const TEMPLATE_TEXT_COLOR: Record<string, string> = {
  'vintage-kraft':    '#3D2B18',
  'pastel-dreams':    '#7D3060',
  'travel-adventure': '#BAE6FD',
  'botanical':        '#3D5A30',
  'modern-minimal':   '#1A1A1A',
  'golden-hour':      '#7A4800',
}

// Template font styles (for new text elements)
const TEMPLATE_FONT: Record<string, Pick<ElementStyle, 'fontFamily' | 'fontStyle' | 'fontWeight'>> = {
  'vintage-kraft':    { fontFamily: 'Georgia, serif', fontStyle: 'italic' },
  'pastel-dreams':    { fontFamily: 'Georgia, serif', fontStyle: 'italic' },
  'travel-adventure': { fontFamily: 'sans-serif', fontWeight: '900' },
  'botanical':        { fontFamily: 'Georgia, serif', fontStyle: 'italic' },
  'modern-minimal':   { fontFamily: 'sans-serif', fontWeight: '900' },
  'golden-hour':      { fontFamily: 'Georgia, serif', fontStyle: 'italic' },
}

// ── Drag state ────────────────────────────────────────────────────────────────

type DragMode = 'move' | 'rotate' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se'

interface DragState {
  mode: DragMode
  elementId: string
  startClientX: number
  startClientY: number
  startEl: CanvasElement
  wasAlreadySelected: boolean   // true if element was selected before this interaction
  hasMoved: boolean             // true if pointer moved more than the drag threshold
  // rotate only
  centerScreenX?: number
  centerScreenY?: number
  startAngle?: number
}

// ── Helper: photo count on page (for layout cycling) ─────────────────────────

function nextPhotoLayout(elements: CanvasElement[], templateId: string, rotation: boolean) {
  const photos = elements.filter(e => e.type === 'photo').length
  const base = PHOTO_LAYOUTS[photos % PHOTO_LAYOUTS.length]!
  return { ...base, r: rotation ? base.r : 0 }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  scrapbook: ScrapbookWithPages
  isOwner: boolean
  pickablePhotos: { url: string; thumbnailUrl?: string; eventName: string; memoryTitle?: string }[]
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScrapbookCanvas({ scrapbook, isOwner, pickablePhotos }: Props) {
  const router = useRouter()

  // ── Template ─────────────────────────────────────────────────────────────
  const templateId = (scrapbook.template ?? DEFAULT_TEMPLATE_ID) as ScrapbookTemplateId
  const tpl = SCRAPBOOK_TEMPLATES.find(t => t.id === templateId) ?? SCRAPBOOK_TEMPLATES[0]!

  // Page background style (base + optional pattern overlay)
  const pageBgStyle: CSSProperties = {
    ...(tpl.pageBg.startsWith('#') || tpl.pageBg.startsWith('rgb')
      ? { backgroundColor: tpl.pageBg }
      : { background: tpl.pageBg }),
    ...(tpl.pageBgPattern
      ? { backgroundImage: tpl.pageBgPattern + (tpl.pageBg.startsWith('#') ? '' : ''), backgroundSize: tpl.id === 'polaroid-wall' ? '24px 24px' : undefined }
      : {}),
  }

  // ── Page state ────────────────────────────────────────────────────────────
  const [pages, setPages]             = useState<ScrapbookPage[]>(scrapbook.pages)
  const [currentPageIdx, setPageIdx]  = useState(0)
  const currentPage                   = pages[currentPageIdx]
  const [elements, setElements]       = useState<CanvasElement[]>(currentPage?.elements ?? [])
  const [saving, setSaving]           = useState(false)

  // Sync elements when page changes
  useEffect(() => {
    setElements(pages[currentPageIdx]?.elements ?? [])
    setSelectedId(null)
  }, [currentPageIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection & interaction ───────────────────────────────────────────────
  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [editingTextId,   setEditingTextId]   = useState<string | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // ── Canvas scale ──────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth
      setScale(Math.min(1, w / CW))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── UI panels ─────────────────────────────────────────────────────────────
  const [showStickers,    setShowStickers]    = useState(false)
  const [showComments,    setShowComments]    = useState(false)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  // When set, the next photo picked fills this slot instead of creating a new element
  const [targetSlotId,    setTargetSlotId]    = useState<string | null>(null)
  const [showShareModal,  setShowShareModal]  = useState(false)
  const [isShared,        setIsShared]        = useState(scrapbook.isShared)
  const [shareToken]                          = useState(scrapbook.shareToken)
  const [shareToggling,   setShareToggling]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingScrapbook, setDeletingScrapbook] = useState(false)

  // ── Sync elements helper ──────────────────────────────────────────────────
  function patchElement(id: string, patch: Partial<CanvasElement>) {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    // Also update in pages so page-change sync is correct
    setPages(prev => prev.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.map(e => e.id === id ? { ...e, ...patch } : e) }
        : p
    ))
  }

  function removeElementLocally(id: string) {
    setElements(prev => prev.filter(e => e.id !== id))
    setPages(prev => prev.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.filter(e => e.id !== id) }
        : p
    ))
  }

  // ── Pointer capture drag ──────────────────────────────────────────────────

  function startDrag(
    e: React.PointerEvent,
    el: CanvasElement,
    mode: DragMode
  ) {
    e.stopPropagation()
    if (!isOwner) return
    if (editingTextId === el.id) return // don't drag while editing text

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    let centerScreenX: number | undefined
    let centerScreenY: number | undefined
    let startAngle: number | undefined

    if (mode === 'rotate' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      centerScreenX = rect.left + (el.x + el.width  / 2) * scale
      centerScreenY = rect.top  + (el.y + el.height / 2) * scale
      startAngle = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX)
    }

    dragRef.current = {
      mode,
      elementId:          el.id,
      startClientX:       e.clientX,
      startClientY:       e.clientY,
      startEl:            { ...el },
      wasAlreadySelected: selectedId === el.id,
      hasMoved:           false,
      centerScreenX,
      centerScreenY,
      startAngle,
    }
    setSelectedId(el.id)
  }

  function handlePointerMove(e: React.PointerEvent, el: CanvasElement) {
    const drag = dragRef.current
    if (!drag || drag.elementId !== el.id) return

    const dx = (e.clientX - drag.startClientX) / scale
    const dy = (e.clientY - drag.startClientY) / scale

    // Mark as a real drag once pointer moves more than 4 logical px
    if (!drag.hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      drag.hasMoved = true
    }

    // Don't actually move the element until the threshold is crossed
    if (!drag.hasMoved) return

    const s  = drag.startEl

    switch (drag.mode) {
      case 'move': {
        const newX = Math.max(0, Math.min(CW - s.width,  s.x + dx))
        const newY = Math.max(0, Math.min(CH - s.height, s.y + dy))
        patchElement(el.id, { x: newX, y: newY })
        break
      }
      case 'rotate': {
        const cx = drag.centerScreenX!
        const cy = drag.centerScreenY!
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx)
        const delta = (angle - drag.startAngle!) * (180 / Math.PI)
        patchElement(el.id, { rotation: s.rotation + delta })
        break
      }
      case 'resize-se': {
        patchElement(el.id, {
          width:  Math.max(60, s.width  + dx),
          height: Math.max(40, s.height + dy),
        })
        break
      }
      case 'resize-sw': {
        const newW = Math.max(60, s.width - dx)
        patchElement(el.id, {
          x: s.x + (s.width - newW),
          width:  newW,
          height: Math.max(40, s.height + dy),
        })
        break
      }
      case 'resize-ne': {
        const newH = Math.max(40, s.height - dy)
        patchElement(el.id, {
          y: s.y + (s.height - newH),
          width:  Math.max(60, s.width + dx),
          height: newH,
        })
        break
      }
      case 'resize-nw': {
        const newW = Math.max(60, s.width  - dx)
        const newH = Math.max(40, s.height - dy)
        patchElement(el.id, {
          x: s.x + (s.width  - newW),
          y: s.y + (s.height - newH),
          width:  newW,
          height: newH,
        })
        break
      }
    }
  }

  async function handlePointerUp(el: CanvasElement) {
    const drag = dragRef.current
    if (!drag || drag.elementId !== el.id) return

    const { hasMoved, wasAlreadySelected } = drag
    dragRef.current = null

    // Click (no drag) on an already-selected text element → enter edit mode
    if (!hasMoved && wasAlreadySelected && el.type === 'text' && drag.mode === 'move') {
      setEditingTextId(el.id)
      return
    }

    // If nothing moved there's nothing to save
    if (!hasMoved) return

    // Save updated position / size to server
    const current = elements.find(e => e.id === el.id)
    if (!current) return
    await updateElement(el.id, {
      x: current.x, y: current.y,
      width: current.width, height: current.height,
      rotation: current.rotation,
    })
  }

  // ── Element actions ───────────────────────────────────────────────────────

  async function handleDeleteElement(el: CanvasElement) {
    removeElementLocally(el.id)
    setSelectedId(null)
    await deleteElement(el.id, scrapbook.id)
  }

  async function handleZChange(el: CanvasElement, dir: 'up' | 'down') {
    const newZ = dir === 'up' ? el.zIndex + 1 : el.zIndex - 1
    patchElement(el.id, { zIndex: newZ })
    await updateElement(el.id, { zIndex: newZ })
  }

  async function handleTextSave(el: CanvasElement, newContent: string) {
    patchElement(el.id, { content: newContent })
    setEditingTextId(null)
    await updateElement(el.id, { content: newContent })
  }

  async function handleStyleSave(el: CanvasElement, style: Partial<ElementStyle>) {
    const newStyle = { ...el.style, ...style }
    patchElement(el.id, { style: newStyle })
    await updateElement(el.id, { style: newStyle })
  }

  async function handleFrameChange(el: CanvasElement, frameStyle: string) {
    const newStyle = { ...el.style, frameStyle }
    patchElement(el.id, { style: newStyle })
    await updateElement(el.id, { style: newStyle })
  }

  // ── Add elements ──────────────────────────────────────────────────────────

  async function addPhotoElement(url: string) {
    if (!currentPage) return
    setShowPhotoPicker(false)

    // If a slot was targeted, fill it instead of creating a new element
    if (targetSlotId) {
      const slotId = targetSlotId
      setTargetSlotId(null)
      patchElement(slotId, { content: url })
      setSelectedId(slotId)
      await updateElement(slotId, { content: url })
      return
    }

    const layout = nextPhotoLayout(elements, templateId, tpl.rotated)
    const id = crypto.randomUUID()
    const newEl: CanvasElement = {
      id, pageId: currentPage.id, type: 'photo', content: url,
      x: layout.x, y: layout.y, width: layout.w, height: layout.h,
      rotation: layout.r, zIndex: elements.length, style: {},
      createdAt: new Date().toISOString(),
    }
    setElements(prev => [...prev, newEl])
    setPages(prev => prev.map((p, i) =>
      i === currentPageIdx ? { ...p, elements: [...p.elements, newEl] } : p
    ))
    setSelectedId(id)
    await createElement(scrapbook.id, currentPage.id, {
      type: 'photo', content: url,
      x: layout.x, y: layout.y, width: layout.w, height: layout.h,
      rotation: layout.r, zIndex: elements.length,
    })
  }

  async function addTextElement() {
    if (!currentPage) return
    const id = crypto.randomUUID()
    const font = TEMPLATE_FONT[templateId] ?? {}
    const color = TEMPLATE_TEXT_COLOR[templateId] ?? '#1A1A1A'
    const style: ElementStyle = { fontSize: 36, color, ...font, textAlign: 'center' }
    const newEl: CanvasElement = {
      id, pageId: currentPage.id, type: 'text', content: 'Write something beautiful…',
      x: CW / 2 - 200, y: CH / 2 - 50, width: 400, height: 100,
      rotation: 0, zIndex: elements.length, style,
      createdAt: new Date().toISOString(),
    }
    setElements(prev => [...prev, newEl])
    setPages(prev => prev.map((p, i) =>
      i === currentPageIdx ? { ...p, elements: [...p.elements, newEl] } : p
    ))
    setSelectedId(id)
    setEditingTextId(id)
    await createElement(scrapbook.id, currentPage.id, {
      type: 'text', content: newEl.content,
      x: newEl.x, y: newEl.y, width: newEl.width, height: newEl.height,
      rotation: 0, zIndex: newEl.zIndex, style,
    })
  }

  async function addStickerElement(emoji: string) {
    if (!currentPage) return
    const id = crypto.randomUUID()
    const newEl: CanvasElement = {
      id, pageId: currentPage.id, type: 'sticker', content: emoji,
      x: CW / 2 - 50, y: CH / 2 - 50, width: 100, height: 100,
      rotation: 0, zIndex: elements.length, style: {},
      createdAt: new Date().toISOString(),
    }
    setElements(prev => [...prev, newEl])
    setPages(prev => prev.map((p, i) =>
      i === currentPageIdx ? { ...p, elements: [...p.elements, newEl] } : p
    ))
    setSelectedId(id)
    setShowStickers(false)
    await createElement(scrapbook.id, currentPage.id, {
      type: 'sticker', content: emoji,
      x: newEl.x, y: newEl.y, width: 100, height: 100,
      rotation: 0, zIndex: newEl.zIndex,
    })
  }

  // ── Page management ───────────────────────────────────────────────────────

  async function addPage() {
    setSaving(true)
    const newPageNumber = pages.length + 1
    const result = await createPage(scrapbook.id, newPageNumber)
    setSaving(false)
    if (result.error || !result.id) return
    const pageId = result.id

    // Seed elements from template layout
    const seedDefs = tpl.seedElements ?? []
    const seededElements: CanvasElement[] = []
    for (const seed of seedDefs) {
      const elResult = await createElement(scrapbook.id, pageId, {
        type: seed.type, content: seed.content,
        x: seed.x, y: seed.y, width: seed.width, height: seed.height,
        rotation: seed.rotation, zIndex: seed.zIndex,
        style: {},
      })
      if (elResult.id) {
        seededElements.push({
          id: elResult.id, pageId,
          type: seed.type, content: seed.content,
          x: seed.x, y: seed.y, width: seed.width, height: seed.height,
          rotation: seed.rotation, zIndex: seed.zIndex,
          style: {}, createdAt: new Date().toISOString(),
        })
      }
    }

    const newPage: ScrapbookPage = {
      id: pageId, scrapbookId: scrapbook.id,
      pageNumber: newPageNumber, createdAt: new Date().toISOString(),
      elements: seededElements,
    }
    setPages(prev => [...prev, newPage])
    setPageIdx(pages.length) // go to new page
  }

  async function removePage(pageId: string) {
    if (pages.length <= 1) return
    const result = await deletePage(scrapbook.id, pageId)
    if (result.error) return
    const newPages = pages
      .filter(p => p.id !== pageId)
      .map((p, i) => ({ ...p, pageNumber: i + 1 }))
    setPages(newPages)
    setPageIdx(Math.max(0, currentPageIdx - 1))
  }

  // ── Sharing ───────────────────────────────────────────────────────────────

  async function handleToggleShare() {
    setShareToggling(true)
    const result = await toggleScrapbookSharing(scrapbook.id, !isShared)
    setShareToggling(false)
    if (!result.error) setIsShared(!isShared)
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/scrapbooks/s/${shareToken}`
    : `/scrapbooks/s/${shareToken}`

  // ── Delete scrapbook ──────────────────────────────────────────────────────

  async function handleDeleteScrapbook() {
    setDeletingScrapbook(true)
    await deleteScrapbook(scrapbook.id) // redirects on success
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedId || editingTextId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const el = elements.find(el => el.id === selectedId)
        if (el) handleDeleteElement(el)
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, editingTextId, elements]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const selectedEl = elements.find(e => e.id === selectedId) ?? null

  return (
    <div className="flex flex-col min-h-screen bg-canvas">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-ink/8 bg-canvas/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={ROUTES.scrapbooks} className="text-xs text-ink-soft hover:text-flame transition-colors flex-shrink-0">
            ← Scrapbooks
          </Link>
          <span className="text-ink/20">·</span>
          <h1 className="font-serif text-base font-semibold text-ink truncate">{scrapbook.title}</h1>
          {scrapbook.description && (
            <span className="text-xs text-ink-faint hidden sm:block truncate">{scrapbook.description}</span>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className={`btn btn-sm btn-pill transition-colors ${isShared ? 'btn-primary' : 'btn-ghost border border-ink/15'}`}
            >
              <LinkIcon className="w-3.5 h-3.5 mr-1" />
              {isShared ? 'Shared' : 'Share'}
            </button>
            {/* Comments */}
            <button
              type="button"
              onClick={() => { setShowComments(s => !s); setShowPhotoPicker(false); setShowStickers(false) }}
              className="btn btn-ghost btn-sm btn-pill border border-ink/15 relative"
            >
              <CommentIcon className="w-3.5 h-3.5 mr-1" />
              {scrapbook.comments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-flame text-white text-[9px] font-bold flex items-center justify-center">
                  {scrapbook.comments.length}
                </span>
              )}
              Notes
            </button>
            {/* Print */}
            <a
              href={`/scrapbooks/${scrapbook.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm btn-pill border border-ink/15 gap-1.5"
              title="Print scrapbook"
            >
              🖨
            </a>
            {/* Delete */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-ghost btn-sm btn-pill text-ink-soft hover:text-red-500"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="card p-6 max-w-sm w-full space-y-4">
            <h2 className="font-serif text-lg font-semibold text-ink">Delete scrapbook?</h2>
            <p className="text-sm text-ink-soft">"{scrapbook.title}" and all its pages will be permanently deleted.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost btn-pill flex-1">Cancel</button>
              <button type="button" onClick={handleDeleteScrapbook} disabled={deletingScrapbook}
                className="btn btn-pill flex-1 bg-red-500 text-white hover:bg-red-600">
                {deletingScrapbook ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="card p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink">Share scrapbook</h2>
              <button type="button" onClick={() => setShowShareModal(false)} className="text-ink-faint hover:text-ink">✕</button>
            </div>
            <p className="text-sm text-ink-soft">Anyone with this link can view your scrapbook and leave comments.</p>

            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink font-mono truncate">
                {isShared ? shareUrl : '(Enable sharing to get a link)'}
              </div>
              {isShared && (
                <button type="button"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="btn btn-ghost btn-sm btn-pill border border-ink/15">
                  Copy
                </button>
              )}
            </div>

            <button type="button" onClick={handleToggleShare} disabled={shareToggling}
              className={`btn btn-pill w-full ${isShared ? 'bg-ink/10 text-ink hover:bg-ink/15' : 'btn-primary'}`}>
              {shareToggling ? '…' : isShared ? 'Disable sharing' : 'Enable sharing & copy link'}
            </button>
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Canvas + page nav ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">

          {/* Canvas area */}
          <div className="flex-1 p-4 flex flex-col items-center">
            <div ref={containerRef} className="w-full max-w-[1200px]">
              {/* Canvas outer: reserves correct height as scale changes */}
              <div style={{ position: 'relative', width: '100%', height: CH * scale }}>

                {currentPage ? (
                  <div
                    ref={canvasRef}
                    className="absolute top-0 left-0 shadow-2xl select-none"
                    style={{
                      width: CW, height: CH,
                      transformOrigin: 'top left',
                      transform: `scale(${scale})`,
                      ...pageBgStyle,
                    }}
                    onClick={() => {
                      if (editingTextId) return
                      setSelectedId(null)
                    }}
                  >
                    {sortedElements.map(el => (
                      <DraggableElement
                        key={el.id}
                        el={el}
                        isSelected={selectedId === el.id}
                        isEditing={editingTextId === el.id}
                        isOwner={isOwner}
                        tplColor={TEMPLATE_TEXT_COLOR[templateId] ?? '#1A1A1A'}
                        tpl={{ slotBg: tpl.slotBg, slotBorder: tpl.slotBorder }}
                        onSelect={() => setSelectedId(el.id)}
                        onDragStart={(e, mode) => startDrag(e, el, mode)}
                        onPointerMove={e => handlePointerMove(e, el)}
                        onPointerUp={() => handlePointerUp(el)}
                        onDelete={() => handleDeleteElement(el)}
                        onZChange={dir => handleZChange(el, dir)}
                        onStartTextEdit={() => setEditingTextId(el.id)}
                        onTextSave={text => handleTextSave(el, text)}
                        onStyleChange={style => handleStyleSave(el, style)}
                        onFrameChange={frameStyle => handleFrameChange(el, frameStyle)}
                        onOpenPhotoPicker={id => { setTargetSlotId(id); setShowPhotoPicker(true) }}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ width: '100%', height: CH * scale }}
                    className="flex items-center justify-center rounded-2xl bg-ink/5">
                    <p className="text-ink-faint text-sm">No pages yet — add one below</p>
                  </div>
                )}
              </div>
            </div>

            {/* Page indicator strip */}
            <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
              {pages.map((p, i) => (
                <button key={p.id} type="button"
                  onClick={() => setPageIdx(i)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                    i === currentPageIdx
                      ? 'bg-flame text-white shadow-[0_0_0_3px_rgba(249,118,28,0.25)]'
                      : 'bg-ink/10 text-ink-soft hover:bg-ink/20'
                  }`}>
                  {i + 1}
                </button>
              ))}
              {isOwner && (
                <button type="button" onClick={addPage} disabled={saving}
                  className="w-8 h-8 rounded-full bg-ink/8 text-ink-soft hover:bg-flame/15 hover:text-flame text-lg font-light transition-all">
                  +
                </button>
              )}
              {isOwner && pages.length > 1 && currentPage && (
                <button type="button"
                  onClick={() => removePage(currentPage.id)}
                  className="w-8 h-8 rounded-full bg-ink/8 text-red-400 hover:bg-red-50 text-xs transition-all"
                  title="Delete current page">
                  <TrashIcon className="w-3.5 h-3.5 mx-auto" />
                </button>
              )}
            </div>
          </div>

          {/* ── Toolbar (owner only) ── */}
          {isOwner && (
            <div className="sticky bottom-0 bg-canvas/95 backdrop-blur-sm border-t border-ink/8 px-5 py-3 flex items-center justify-center gap-3 flex-wrap">
              <button type="button" onClick={() => { setShowPhotoPicker(s => !s); setShowStickers(false); setShowComments(false) }}
                className="btn btn-ghost btn-sm btn-pill border border-ink/15 gap-1.5">
                <PhotoIcon className="w-4 h-4" /> Add photo
              </button>
              <button type="button" onClick={addTextElement}
                className="btn btn-ghost btn-sm btn-pill border border-ink/15 gap-1.5">
                <TextIcon className="w-4 h-4" /> Add text
              </button>
              <button type="button" onClick={() => { setShowStickers(s => !s); setShowPhotoPicker(false); setShowComments(false) }}
                className="btn btn-ghost btn-sm btn-pill border border-ink/15 gap-1.5">
                ✦ Sticker
              </button>
              {selectedEl && (
                <>
                  <div className="w-px h-5 bg-ink/15" />
                  <button type="button" onClick={() => handleZChange(selectedEl, 'up')}
                    className="btn btn-ghost btn-sm btn-pill border border-ink/15 text-xs">↑ Forward</button>
                  <button type="button" onClick={() => handleZChange(selectedEl, 'down')}
                    className="btn btn-ghost btn-sm btn-pill border border-ink/15 text-xs">↓ Back</button>
                  <button type="button" onClick={() => handleDeleteElement(selectedEl)}
                    className="btn btn-ghost btn-sm btn-pill border border-red-200 text-red-500 text-xs">Remove</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Right: sticker/comment/photo panels ── */}
        {(showStickers || showComments || showPhotoPicker) && (
          <div className="w-72 flex-shrink-0 border-l border-ink/8 overflow-y-auto">
            {showPhotoPicker && (
              <PhotoPickerPanel
                photos={pickablePhotos}
                scrapbookId={scrapbook.id}
                scrapbookTitle={scrapbook.title}
                onSelect={addPhotoElement}
                onClose={() => setShowPhotoPicker(false)}
              />
            )}
            {showStickers && (
              <StickerPicker
                onSelect={addStickerElement}
                onClose={() => setShowStickers(false)}
              />
            )}
            {showComments && (
              <CommentPanel
                scrapbookId={scrapbook.id}
                initialComments={scrapbook.comments}
                isOwner={isOwner}
                onClose={() => setShowComments(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── DraggableElement ──────────────────────────────────────────────────────────

interface DraggableElementProps {
  el: CanvasElement
  isSelected: boolean
  isEditing: boolean
  isOwner: boolean
  tplColor: string
  onSelect: () => void
  onDragStart: (e: React.PointerEvent, mode: DragMode) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onDelete: () => void
  onZChange: (dir: 'up' | 'down') => void
  onStartTextEdit: () => void
  onTextSave: (text: string) => void
  onStyleChange: (style: Partial<ElementStyle>) => void
  onFrameChange: (frameStyle: string) => void
  onOpenPhotoPicker?: (slotId: string) => void
  tpl: { slotBg?: string; slotBorder?: string }
}

function DraggableElement({
  el, isSelected, isEditing, isOwner, tplColor, tpl,
  onSelect, onDragStart, onPointerMove, onPointerUp,
  onDelete, onStartTextEdit, onTextSave, onStyleChange, onFrameChange,
  onOpenPhotoPicker,
}: DraggableElementProps) {
  const textRef = useRef<HTMLDivElement>(null)

  // Sync contentEditable when content changes from outside
  useEffect(() => {
    if (textRef.current && !isEditing) {
      textRef.current.textContent = el.content
    }
  }, [el.content, isEditing])

  const containerStyle: CSSProperties = {
    position:  'absolute',
    left:      el.x,
    top:       el.y,
    width:     el.width,
    height:    el.height,
    transform: `rotate(${el.rotation}deg)`,
    transformOrigin: 'center center',
    zIndex:    el.zIndex,
    cursor:    isOwner ? (isEditing ? 'text' : 'grab') : 'default',
    touchAction: 'none',
  }

  return (
    <div
      style={containerStyle}
      onClick={e => { e.stopPropagation(); onSelect() }}
      onPointerDown={e => { if (!isEditing && isOwner) onDragStart(e, 'move') }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* ── Content ── */}
      {el.type === 'photo' && (() => {
        // Empty slot — show a clickable placeholder
        if (!el.content) {
          return (
            <div
              onClick={isOwner ? (e) => {
                e.stopPropagation()
                onOpenPhotoPicker?.(el.id)
              } : undefined}
              style={{
                width: '100%', height: '100%',
                background: tpl.slotBg ?? 'rgba(200,200,200,0.2)',
                border: tpl.slotBorder ?? '2px dashed rgba(150,150,150,0.5)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: isOwner ? 'pointer' : 'default',
                userSelect: 'none',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ width: 32, height: 32, opacity: 0.4 }}
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span style={{ fontSize: 12, opacity: 0.45, fontFamily: 'sans-serif', fontWeight: 600 }}>
                {isOwner ? 'Add photo' : ''}
              </span>
            </div>
          )
        }

        const frame = getFrameDef(el.style.frameStyle)
        return (
          <div style={frame.wrapper}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={el.content}
              alt=""
              draggable={false}
              style={{
                display: 'block', width: '100%', height: '100%',
                objectFit: 'cover', pointerEvents: 'none', userSelect: 'none',
              }}
            />
            {/* Decorative ornaments (vintage corners, tape strips, etc.) */}
            {el.style.frameStyle && el.style.frameStyle !== 'none' && (
              <PhotoOrnaments frameStyle={el.style.frameStyle} />
            )}
          </div>
        )
      })()}

      {el.type === 'sticker' && (
        (el.content.startsWith('http') || el.content.startsWith('data:') || el.content.startsWith('blob:')) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={el.content}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.min(el.width, el.height) * 0.75,
            lineHeight: 1,
            userSelect: 'none', pointerEvents: 'none',
          }}>
            {el.content}
          </div>
        )
      )}

      {el.type === 'text' && (
        <div
          ref={textRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={e => isEditing && onTextSave(e.currentTarget.textContent ?? '')}
          onPointerDown={e => { if (isEditing) e.stopPropagation() }}
          style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center',
            justifyContent: el.style.textAlign === 'center' ? 'center'
              : el.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
            padding: 8,
            outline: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            userSelect: isEditing ? 'text' : 'none',
            cursor: isEditing ? 'text' : isOwner ? 'grab' : 'default',
            fontSize:    el.style.fontSize   ?? 36,
            color:       el.style.color      ?? tplColor,
            fontFamily:  el.style.fontFamily ?? 'Georgia, serif',
            fontWeight:  el.style.fontWeight ?? 'normal',
            fontStyle:   el.style.fontStyle  ?? 'normal',
            backgroundColor: el.style.backgroundColor ?? 'transparent',
          }}
        >
          {!isEditing && el.content}
        </div>
      )}

      {/* ── Selection handles (owner only) ── */}
      {isSelected && isOwner && !isEditing && (
        <>
          {/* Selection border */}
          <div style={{
            position: 'absolute', inset: -2,
            border: '2px solid #F9761C',
            borderRadius: 2,
            pointerEvents: 'none',
          }} />

          {/* Rotation handle */}
          <div
            style={{
              position: 'absolute', top: -28, left: '50%',
              transform: 'translateX(-50%)',
              width: 20, height: 20,
              borderRadius: '50%',
              background: '#F9761C',
              cursor: 'grab',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'none',
              zIndex: 10,
            }}
            onPointerDown={e => { e.stopPropagation(); onDragStart(e, 'rotate') }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <RotateIcon style={{ width: 12, height: 12, color: 'white' }} />
          </div>

          {/* Connector line to rotation handle */}
          <div style={{
            position: 'absolute', top: -18, left: '50%',
            transform: 'translateX(-50%)',
            width: 1, height: 16,
            background: '#F9761C',
            pointerEvents: 'none',
          }} />

          {/* Delete button */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{
              position: 'absolute', top: -10, right: -10,
              width: 20, height: 20, borderRadius: '50%',
              background: '#1A1A1A', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, cursor: 'pointer',
              zIndex: 10, border: 'none',
            }}
          >
            ✕
          </button>

          {/* Hint label for text elements: tap again to edit */}
          {el.type === 'text' && (
            <div style={{
              position: 'absolute', bottom: -22, left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 10, color: '#F9761C', fontWeight: 600,
              whiteSpace: 'nowrap', pointerEvents: 'none',
              background: 'rgba(255,255,255,0.85)', borderRadius: 4, padding: '1px 6px',
            }}>
              tap to edit text
            </div>
          )}

          {/* Resize handles — corners */}
          {(['nw', 'ne', 'sw', 'se'] as const).map(corner => {
            const isN = corner.startsWith('n')
            const isW = corner.endsWith('w')
            return (
              <div
                key={corner}
                style={{
                  position: 'absolute',
                  top:    isN ? -5 : undefined,
                  bottom: isN ? undefined : -5,
                  left:   isW ? -5 : undefined,
                  right:  isW ? undefined : -5,
                  width: 10, height: 10,
                  borderRadius: 2,
                  background: 'white',
                  border: '2px solid #F9761C',
                  cursor: `${corner}-resize`,
                  touchAction: 'none',
                  zIndex: 10,
                }}
                onPointerDown={e => { e.stopPropagation(); onDragStart(e, `resize-${corner}`) }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            )
          })}

          {/* Frame picker toolbar (photo only) */}
          {el.type === 'photo' && (
            <div
              style={{
                position: 'absolute', bottom: -52,
                left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 6, alignItems: 'center',
                background: 'white', borderRadius: 12, padding: '6px 10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
              }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              {PHOTO_FRAMES.map(f => {
                const active = (el.style.frameStyle ?? 'none') === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    title={f.label}
                    onClick={() => onFrameChange(f.id)}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 3,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    {/* Mini frame preview */}
                    <div style={{
                      width: 28, height: 22,
                      borderRadius: 4,
                      outline: active ? '2px solid #F9761C' : '1.5px solid #E8E4DE',
                      outlineOffset: active ? 1 : 0,
                      overflow: 'hidden',
                      background: f.id === 'polaroid' || f.id === 'stamp' ? '#FEFEFE'
                        : f.id === 'vintage' ? '#EAD9B5'
                        : f.id === 'dark'    ? '#1C1208'
                        : '#C8C0B0',
                      position: 'relative',
                      ...( f.id === 'polaroid' ? { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } : {} ),
                    }}>
                      {/* Inner photo area */}
                      <div style={{
                        position: 'absolute',
                        top:    f.id === 'polaroid' ? 2 : f.id === 'vintage' ? 3
                                : f.id === 'stamp'  ? 3 : f.id === 'dark'    ? 3 : 0,
                        bottom: f.id === 'polaroid' ? 6 : f.id === 'vintage' ? 3
                                : f.id === 'stamp'  ? 3 : f.id === 'dark'    ? 3 : 0,
                        left:   f.id === 'polaroid' ? 2 : f.id === 'vintage' ? 3
                                : f.id === 'stamp'  ? 3 : f.id === 'dark'    ? 3 : 0,
                        right:  f.id === 'polaroid' ? 2 : f.id === 'vintage' ? 3
                                : f.id === 'stamp'  ? 3 : f.id === 'dark'    ? 3 : 0,
                        background: '#9DB4C0',
                        borderRadius: 1,
                        ...(f.id === 'shadow' ? { boxShadow: '2px 3px 6px rgba(0,0,0,0.5)' } : {}),
                        ...(f.id === 'stamp'  ? { outline: '1.5px dashed rgba(60,40,10,0.3)' } : {}),
                      }} />
                      {/* Tape hint */}
                      {f.id === 'tape' && (
                        <div style={{
                          position: 'absolute', top: 2, left: '50%',
                          width: 12, height: 4,
                          background: 'rgba(255,242,160,0.8)',
                          transform: 'translateX(-50%) rotate(-3deg)',
                          borderRadius: 1,
                        }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: 9, color: active ? '#F9761C' : '#888',
                      fontWeight: active ? 700 : 400,
                    }}>{f.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Text style toolbar */}
          {el.type === 'text' && (
            <div
              style={{
                position: 'absolute', bottom: -44,
                left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 4, alignItems: 'center',
                background: 'white', borderRadius: 8, padding: '4px 8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
              }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              {/* Font size */}
              <button type="button" style={tbBtn}
                onClick={() => onStyleChange({ fontSize: Math.max(12, (el.style.fontSize ?? 36) - 6) })}>A-</button>
              <button type="button" style={tbBtn}
                onClick={() => onStyleChange({ fontSize: (el.style.fontSize ?? 36) + 6 })}>A+</button>
              <div style={{ width: 1, height: 16, background: '#E8E4DE' }} />
              {/* Align */}
              {(['left','center','right'] as const).map(align => (
                <button key={align} type="button" style={{
                  ...tbBtn,
                  background: el.style.textAlign === align ? '#F9761C' : 'transparent',
                  color: el.style.textAlign === align ? 'white' : '#1A1A1A',
                  borderRadius: 4,
                }}
                  onClick={() => onStyleChange({ textAlign: align })}>
                  {align === 'left' ? '⬅' : align === 'center' ? '↔' : '➡'}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: '#E8E4DE' }} />
              {/* Color swatches */}
              {['#1A1A1A','#FFFFFF','#F9761C','#C07090','#3D5A30','#7A4800','#BAE6FD'].map(c => (
                <button key={c} type="button"
                  onClick={() => onStyleChange({ color: c })}
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: c,
                    border: el.style.color === c ? '2px solid #F9761C' : '1px solid #ccc',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const tbBtn: CSSProperties = {
  padding: '2px 6px', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', background: 'transparent', border: 'none',
  color: '#1A1A1A', borderRadius: 4,
}

// ── Photo frames ──────────────────────────────────────────────────────────────

interface FrameDef {
  id:      string
  label:   string
  wrapper: CSSProperties
}

const PHOTO_FRAMES: FrameDef[] = [
  {
    id: 'none',
    label: 'None',
    wrapper: { position: 'absolute', inset: 0 },
  },
  {
    id: 'polaroid',
    label: 'Polaroid',
    wrapper: {
      position: 'absolute', inset: 0,
      background: '#FEFEFE',
      padding: '9px 9px 34px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.14), 2px 6px 20px rgba(0,0,0,0.18)',
    },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    wrapper: {
      position: 'absolute', inset: 0,
      background: '#EAD9B5',
      padding: '11px',
      boxShadow: 'inset 0 0 0 1px rgba(100,70,20,0.18), 1px 4px 18px rgba(0,0,0,0.22)',
    },
  },
  {
    id: 'shadow',
    label: 'Shadow',
    wrapper: {
      position: 'absolute', inset: 0,
      boxShadow: '6px 12px 36px rgba(0,0,0,0.45), 2px 4px 8px rgba(0,0,0,0.22)',
    },
  },
  {
    id: 'tape',
    label: 'Tape',
    wrapper: {
      position: 'absolute', inset: 0,
      boxShadow: '1px 3px 10px rgba(0,0,0,0.18)',
    },
  },
  {
    id: 'stamp',
    label: 'Stamp',
    wrapper: {
      position: 'absolute', inset: 0,
      background: '#FEFEFE',
      padding: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      outline: '3px dashed rgba(60,40,10,0.28)',
      outlineOffset: '-6px',
    },
  },
  {
    id: 'dark',
    label: 'Frame',
    wrapper: {
      position: 'absolute', inset: 0,
      background: '#1C1208',
      padding: '10px',
      boxShadow: 'inset 0 0 0 2px #6B5030, inset 0 0 0 4px #2C1E0A, 2px 5px 20px rgba(0,0,0,0.4)',
    },
  },
]

function getFrameDef(frameStyle?: string): FrameDef {
  return PHOTO_FRAMES.find(f => f.id === frameStyle) ?? PHOTO_FRAMES[0]!
}

// ── Photo ornaments ───────────────────────────────────────────────────────────

/** Corner L-mount brackets — used for vintage frame */
function VintageCorners({ color = '#9B7A3A' }: { color?: string }) {
  const mount: CSSProperties = {
    position: 'absolute', width: 22, height: 22, pointerEvents: 'none',
  }
  const arm: CSSProperties = { position: 'absolute', background: color }
  const hBar: CSSProperties = { ...arm, height: 2, width: '100%', top: 0, left: 0 }
  const vBar: CSSProperties = { ...arm, width: 2, height: '100%', top: 0, left: 0 }
  const vBarR: CSSProperties = { ...arm, width: 2, height: '100%', top: 0, right: 0 }
  const hBarB: CSSProperties = { ...arm, height: 2, width: '100%', bottom: 0, left: 0 }

  return (
    <>
      {/* top-left */}
      <div style={{ ...mount, top: 5, left: 5 }}>
        <div style={hBar} /><div style={vBar} />
      </div>
      {/* top-right */}
      <div style={{ ...mount, top: 5, right: 5, transform: 'scaleX(-1)' }}>
        <div style={hBar} /><div style={vBar} />
      </div>
      {/* bottom-left */}
      <div style={{ ...mount, bottom: 5, left: 5, transform: 'scaleY(-1)' }}>
        <div style={hBarB} /><div style={vBar} />
      </div>
      {/* bottom-right */}
      <div style={{ ...mount, bottom: 5, right: 5, transform: 'scale(-1)' }}>
        <div style={hBarB} /><div style={vBarR} />
      </div>
    </>
  )
}

/** Washi tape strips — top and bottom, slightly rotated */
function TapeStrips() {
  const tape: CSSProperties = {
    position: 'absolute', left: '50%',
    width: 56, height: 16,
    background: 'rgba(255, 242, 160, 0.72)',
    backdropFilter: 'blur(1px)',
    boxShadow: 'inset 0 0 0 1px rgba(180,160,0,0.18)',
    borderRadius: 2,
    pointerEvents: 'none',
  }
  return (
    <>
      <div style={{ ...tape, top: -8, transform: 'translateX(-50%) rotate(-4deg)' }} />
      <div style={{ ...tape, bottom: -8, transform: 'translateX(-50%) rotate(3deg)' }} />
    </>
  )
}

/** Photo ornaments dispatcher */
function PhotoOrnaments({ frameStyle }: { frameStyle: string }) {
  if (frameStyle === 'vintage') return <VintageCorners />
  if (frameStyle === 'tape')    return <TapeStrips />
  return null
}

// ── Photo Picker Panel ────────────────────────────────────────────────────────
// Tabbed panel: Library (existing event photos) | From phone (QR + live upload)

function PhotoPickerPanel({
  photos,
  scrapbookId,
  scrapbookTitle,
  onSelect,
  onClose,
}: {
  photos:         { url: string; thumbnailUrl?: string; eventName: string; memoryTitle?: string }[]
  scrapbookId:    string
  scrapbookTitle: string
  onSelect:       (url: string) => void
  onClose:        () => void
}) {
  const [tab, setTab] = useState<'library' | 'phone'>('library')

  // ── Phone tab state ──────────────────────────────────────────────────────
  const [sessionId,     setSessionId]     = useState<string | null>(null)
  const [uploadUrl,     setUploadUrl]     = useState<string | null>(null)
  const [phonePhotos,   setPhonePhotos]   = useState<SessionPhoto[]>([])
  const [loadingPhone,  setLoadingPhone]  = useState(false)
  const [phoneError,    setPhoneError]    = useState<string | null>(null)
  const [copied,        setCopied]        = useState(false)
  const [addedIds,      setAddedIds]      = useState<Set<string>>(new Set())
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const knownIds   = useRef<Set<string>>(new Set())

  // Create session the first time the phone tab is opened
  useEffect(() => {
    if (tab !== 'phone' || sessionId || loadingPhone) return
    let cancelled = false
    async function init() {
      setLoadingPhone(true)
      const result = await createUploadSession(scrapbookId, scrapbookTitle)
      if (cancelled) return
      if (result.error || !result.session) {
        setPhoneError(result.error ?? 'Could not create session.')
        setLoadingPhone(false)
        return
      }
      const { sessionId: sid, token } = result.session
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      setSessionId(sid)
      setUploadUrl(`${origin}/m/${token}`)
      setLoadingPhone(false)
    }
    init()
    return () => { cancelled = true }
  }, [tab, sessionId, loadingPhone, scrapbookId, scrapbookTitle])

  // Poll for new phone photos every 3 s once session is active
  useEffect(() => {
    if (!sessionId) return
    async function poll() {
      const incoming = await getSessionPhotos(sessionId!)
      const fresh = incoming.filter(p => !knownIds.current.has(p.id))
      if (fresh.length > 0) {
        fresh.forEach(p => knownIds.current.add(p.id))
        setPhonePhotos(prev => [...prev, ...fresh])
      }
    }
    poll()
    pollingRef.current = setInterval(poll, 3000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [sessionId])

  const qrSrc = uploadUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(uploadUrl)}&size=190x190&margin=8&color=3D2B18&bgcolor=FFF8F5`
    : null

  function handleAddPhonePhoto(photo: SessionPhoto) {
    if (addedIds.has(photo.id)) return
    setAddedIds(prev => new Set(prev).add(photo.id))
    onSelect(photo.url)
  }

  async function handleCopy() {
    if (!uploadUrl) return
    await navigator.clipboard.writeText(uploadUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/8">
        <h3 className="text-sm font-semibold text-ink">Add a photo</h3>
        <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink text-sm">✕</button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-ink/8 bg-canvas/50">
        {(['library', 'phone'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-colors ${
              tab === t
                ? 'text-flame border-b-2 border-flame -mb-px bg-white'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t === 'library' ? '📁  Library' : '📱  From phone'}
          </button>
        ))}
      </div>

      {/* ── Library tab ── */}
      {tab === 'library' && (() => {
        if (photos.length === 0) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
              <span className="text-3xl">🖼️</span>
              <p className="text-sm text-ink-soft leading-relaxed">
                No photos yet.<br />Add memories to your events first, or upload from your phone.
              </p>
            </div>
          )
        }

        // Group photos by event name
        const groups: { eventName: string; photos: typeof photos }[] = []
        const seen: Record<string, number> = {}
        for (const p of photos) {
          if (seen[p.eventName] === undefined) {
            seen[p.eventName] = groups.length
            groups.push({ eventName: p.eventName, photos: [] })
          }
          groups[seen[p.eventName]].photos.push(p)
        }

        return (
          <div className="flex-1 overflow-y-auto">
            {groups.map(group => (
              <div key={group.eventName}>
                <div className="px-3 pt-3 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint truncate">
                    {group.eventName}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5 px-3 pb-2">
                  {group.photos.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      title={p.memoryTitle}
                      onClick={() => onSelect(p.url)}
                      className="rounded-lg overflow-hidden aspect-square bg-ink/5 hover:ring-2 hover:ring-flame transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumbnailUrl ?? p.url} alt={p.memoryTitle ?? ''} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── From phone tab ── */}
      {tab === 'phone' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Loading */}
          {loadingPhone && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-flame border-t-transparent animate-spin" />
            </div>
          )}

          {/* Error */}
          {phoneError && (
            <div className="text-center py-6 space-y-1">
              <p className="text-2xl">⚠️</p>
              <p className="text-xs text-red-500">{phoneError}</p>
            </div>
          )}

          {/* QR + link */}
          {qrSrc && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-ink-soft text-center">
                Scan with your phone camera to upload photos directly.
              </p>
              <div
                className="rounded-2xl overflow-hidden border border-ink/8 shadow-sm"
                style={{ background: '#FFF8F5' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="Scan to upload" width={190} height={190} style={{ display: 'block' }} />
              </div>
              {/* Copyable link */}
              <div className="w-full flex items-center gap-2">
                <div className="flex-1 min-w-0 rounded-lg bg-ink/5 px-2 py-1.5 text-[10px] font-mono text-ink truncate">
                  {uploadUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`btn btn-sm btn-pill flex-shrink-0 transition-colors ${
                    copied ? 'bg-green-500 text-white' : 'btn-ghost border border-ink/15'
                  }`}
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-ink-faint text-center">
                Valid for 1 hour · No account needed on phone
              </p>
            </div>
          )}

          {/* Received photos */}
          {phonePhotos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">
                  {phonePhotos.length} photo{phonePhotos.length > 1 ? 's' : ''} received
                </p>
                <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {phonePhotos.map(photo => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleAddPhonePhoto(photo)}
                    disabled={addedIds.has(photo.id)}
                    className={`relative rounded-lg overflow-hidden aspect-square transition-all ${
                      addedIds.has(photo.id)
                        ? 'opacity-50 ring-2 ring-green-500'
                        : 'hover:ring-2 hover:ring-flame'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover" />
                    {addedIds.has(photo.id) && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-600 font-bold text-base">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {phonePhotos.some(p => !addedIds.has(p.id)) && (
                <button
                  type="button"
                  onClick={() => phonePhotos.filter(p => !addedIds.has(p.id)).forEach(handleAddPhonePhoto)}
                  className="btn btn-primary btn-pill btn-sm w-full"
                >
                  Add all to page
                </button>
              )}
            </div>
          )}

          {/* Waiting hint — session ready, no photos yet */}
          {!loadingPhone && !phoneError && phonePhotos.length === 0 && qrSrc && (
            <p className="text-xs text-ink-soft text-center leading-relaxed">
              Photos will appear here automatically once you upload from your phone.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PhotoIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}

function TextIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
}

function LinkIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
}

function CommentIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
}

function TrashIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}

function RotateIcon({ style }: { style?: CSSProperties }) {
  return <svg viewBox="0 0 24 24" style={style} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
}
