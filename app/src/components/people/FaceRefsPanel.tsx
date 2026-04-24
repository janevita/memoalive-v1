'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FaceRef } from '@/lib/types'

interface FaceRefsPanelProps {
  faceRefs: FaceRef[]
  storagePrefix: string        // e.g. `face-refs/${userId}` or `face-refs/person/${personId}`
  onAdd:    (url: string) => Promise<void>
  onRemove: (index: number) => Promise<void>
}

export function FaceRefsPanel({ faceRefs, storagePrefix, onAdd, onRemove }: FaceRefsPanelProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 MB per photo.'); return }

    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${storagePrefix}/${Date.now()}.${ext}`

      const { data, error: uploadErr } = await supabase.storage
        .from('avatars')          // reuse avatars bucket for face refs
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
      await onAdd(publicUrl)
    } catch (err: any) {
      setError(err.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-ink-mid">Face reference photos</p>
          <p className="text-[11px] text-ink-faint mt-0.5">
            Clear photos of their face help AI identify them in group memories
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn btn-ghost btn-sm btn-pill text-xs"
        >
          {uploading ? 'Uploading…' : '+ Add photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      {faceRefs.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-ink/12 rounded-xl py-6 text-center hover:border-flame/40 hover:bg-flame-glow/10 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center mx-auto mb-2">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M3 20a9 9 0 0118 0" />
            </svg>
          </div>
          <p className="text-xs text-ink-soft font-medium">Add a clear face photo</p>
          <p className="text-[10px] text-ink-faint mt-0.5">Enables AI recognition in uploads</p>
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {faceRefs.map((ref, i) => (
            <div key={i} className="relative group w-16 h-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ref.url}
                alt={ref.label ?? `Face ${i + 1}`}
                className="w-full h-full object-cover rounded-xl border border-[#E7E0D8]"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ink/70 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                ×
              </button>
              {ref.label && (
                <p className="text-[9px] text-ink-faint text-center mt-0.5 truncate max-w-[64px]">{ref.label}</p>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-xl border-2 border-dashed border-ink/15 flex items-center justify-center hover:border-flame/40 transition-colors text-ink-faint hover:text-flame"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
