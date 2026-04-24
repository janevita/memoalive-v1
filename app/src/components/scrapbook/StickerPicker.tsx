'use client'

/**
 * StickerPicker — two tabs:
 *   • Emoji  — built-in emoji sticker grid organised by mood category
 *   • Upload — user can upload PNG/SVG/WebP/GIF icons; stored in Supabase
 *              Storage and remembered in localStorage for future sessions
 */

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onSelect: (content: string) => void   // emoji string OR image URL
  onClose:  () => void
}

// ── Emoji categories ──────────────────────────────────────────────────────────

const STICKER_CATEGORIES = [
  { label: '💕 Love',      stickers: ['💕','❤️','🧡','💛','💚','💙','💜','🤍','🖤','💗','💓','💞','💝','🫶','😍'] },
  { label: '🌸 Nature',    stickers: ['🌸','🌺','🌹','🌻','🌼','🌷','🌿','🍃','🍂','🍁','🌾','🪻','🫧','🌊','⛰️'] },
  { label: '✨ Magic',     stickers: ['✨','⭐','🌟','💫','🌙','☀️','🌈','☁️','🌤️','❄️','🔥','⚡','🎇','🎆','🪄'] },
  { label: '🎉 Celebrate', stickers: ['🎉','🎊','🎈','🎁','🎂','🥂','🍾','🎵','🎶','📷','🎗️','🏆','🥳','🎀','🎠'] },
  { label: '✦ Shapes',    stickers: ['★','♥','✿','❋','✦','♦','✱','❊','◈','❀','⊹','✷','⋆','꩜','☽'] },
  { label: '🤍 Feelings',  stickers: ['🥹','🥰','😊','😌','🤗','😎','🌺','🫂','🙌','👏','✌️','🤞','🫶','💪','🙏'] },
]

// ── Local-storage helpers ─────────────────────────────────────────────────────

const LS_KEY = 'memoalive_custom_stickers'

function loadCustomStickers(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveCustomStickers(urls: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(urls.slice(0, 48)))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StickerPicker({ onSelect, onClose }: Props) {
  const [tab, setTab] = useState<'emoji' | 'upload'>('emoji')

  // Upload tab state
  const [customStickers, setCustomStickers] = useState<string[]>(loadCustomStickers)
  const [uploading,      setUploading]      = useState(false)
  const [uploadError,    setUploadError]    = useState<string | null>(null)
  const [dragOver,       setDragOver]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Upload handler ──────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadError(null)
    setUploading(true)

    const supabase = createClient()
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      // Validate type
      if (!['image/png','image/svg+xml','image/webp','image/gif','image/jpeg'].includes(file.type)) {
        setUploadError('Only PNG, SVG, WebP, GIF, and JPG files are supported.')
        continue
      }
      // Validate size (max 2 MB)
      if (file.size > 2 * 1024 * 1024) {
        setUploadError('Each file must be under 2 MB.')
        continue
      }

      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `stickers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data, error } = await supabase.storage
        .from('memory-media')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (error) {
        setUploadError(`Upload failed: ${error.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('memory-media')
        .getPublicUrl(data.path)

      newUrls.push(publicUrl)
    }

    setUploading(false)

    if (newUrls.length > 0) {
      setCustomStickers(prev => {
        const updated = [...newUrls, ...prev]
        saveCustomStickers(updated)
        return updated
      })
    }
  }, [])

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  // ── Remove custom sticker ───────────────────────────────────────────────────

  function removeSticker(url: string) {
    setCustomStickers(prev => {
      const updated = prev.filter(u => u !== url)
      saveCustomStickers(updated)
      return updated
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/8">
        <h3 className="text-sm font-semibold text-ink">Stickers</h3>
        <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink text-sm">✕</button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-ink/8 bg-canvas/50">
        {(['emoji', 'upload'] as const).map(t => (
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
            {t === 'emoji' ? '😊  Emoji' : '⬆  Upload'}
          </button>
        ))}
      </div>

      {/* ── Emoji tab ── */}
      {tab === 'emoji' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {STICKER_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <p className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide mb-2 px-1">
                {cat.label}
              </p>
              <div className="grid grid-cols-5 gap-1">
                {cat.stickers.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSelect(s)}
                    className="aspect-square rounded-lg hover:bg-flame/10 active:scale-90 transition-all flex items-center justify-center text-2xl"
                    title={s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload tab ── */}
      {tab === 'upload' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 py-8 px-4 text-center ${
              dragOver
                ? 'border-flame bg-flame/8 text-flame'
                : 'border-ink/15 hover:border-flame/50 hover:bg-flame/5 text-ink-soft'
            }`}
          >
            {uploading ? (
              <div className="w-6 h-6 rounded-full border-2 border-flame border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="text-2xl">🖼️</span>
                <p className="text-xs font-medium leading-relaxed">
                  Drop icons here or click to browse<br />
                  <span className="text-ink-faint font-normal">PNG · SVG · WebP · GIF · JPG · max 2 MB</span>
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/webp,image/gif,image/jpeg"
            multiple
            className="sr-only"
            onChange={e => handleFiles(e.target.files)}
          />

          {uploadError && (
            <p className="text-xs text-red-500 text-center">{uploadError}</p>
          )}

          {/* Uploaded stickers grid */}
          {customStickers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2">
                Your uploads
              </p>
              <div className="grid grid-cols-4 gap-2">
                {customStickers.map(url => (
                  <div key={url} className="relative group aspect-square">
                    <button
                      type="button"
                      onClick={() => onSelect(url)}
                      className="w-full h-full rounded-xl overflow-hidden bg-ink/5 border border-ink/8 hover:ring-2 hover:ring-flame transition-all flex items-center justify-center p-1.5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="max-w-full max-h-full object-contain" />
                    </button>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeSticker(url)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customStickers.length === 0 && !uploading && (
            <p className="text-xs text-ink-faint text-center leading-relaxed">
              Uploaded icons and stickers will appear here.<br />
              They&apos;re saved for all your future scrapbooks.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
