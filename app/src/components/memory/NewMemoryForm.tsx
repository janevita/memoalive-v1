'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ROUTES, GENRES } from '@/lib/constants'
import type { Genre, EventWithParticipants, AlbumWithPreview } from '@/lib/types'
import { cn } from '@/lib/utils'
import { createMemory } from '@/lib/actions/memories'
import { createClient } from '@/lib/supabase/client'
import type { Visibility } from '@/lib/types'
import { TagPeopleStep } from '@/components/people/TagPeopleStep'
import type { TaggablePerson } from '@/lib/data/people'

const GENRE_LABELS: Record<Genre, string> = {
  adventure:       'Adventure',
  drama:           'Drama',
  comedy:          'Comedy',
  romance:         'Romance',
  'coming-of-age': 'Coming of Age',
  documentary:     'Documentary',
}

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime'
const MAX_MB   = 50

interface MediaFile {
  file:       File
  previewUrl: string   // object URL for preview
  type:       'photo' | 'video'
}

interface NewMemoryFormProps {
  groups: Pick<EventWithParticipants, 'id' | 'name'>[]
  albumsByGroup: Record<string, Pick<AlbumWithPreview, 'id' | 'title'>[]>
  peopleByGroup: Record<string, TaggablePerson[]>
  defaultGroupId?: string
  defaultAlbumId?: string
}

type Step = 'details' | 'media' | 'people' | 'preview'

export function NewMemoryForm({ groups, albumsByGroup, peopleByGroup, defaultGroupId, defaultAlbumId }: NewMemoryFormProps) {
  const [step, setStep] = useState<Step>('details')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  // Form fields
  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [genre,   setGenre]   = useState<Genre>('adventure')
  const [groupId, setGroupId] = useState(defaultGroupId ?? groups[0]?.id ?? '')
  const [takenAt,     setTakenAt]     = useState('')
  const [visibility,  setVisibility]  = useState<Visibility>('group')
  const [albumId,     setAlbumId]     = useState<string>(defaultAlbumId ?? '')

  // Albums available for the currently selected group
  const groupAlbums = albumsByGroup[groupId] ?? []
  const groupPeople = peopleByGroup[groupId]  ?? []

  // Tagged people
  const [taggedIds, setTaggedIds] = useState<Set<string>>(new Set())

  function handleToggleTag(person: TaggablePerson) {
    setTaggedIds(prev => {
      const next = new Set(prev)
      if (next.has(person.id)) next.delete(person.id)
      else next.add(person.id)
      return next
    })
  }

  // Media
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)

  // ── File handling ─────────────────────────────────────────────────────────

  function addFiles(fileList: FileList | null) {
    if (!fileList) return
    const next: MediaFile[] = []
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds 50 MB — skipped.`)
        continue
      }
      next.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'photo',
      })
    }
    setMediaFiles(prev => [...prev, ...next])
  }

  function removeFile(index: number) {
    setMediaFiles(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Drag-and-drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dropzoneRef.current?.classList.remove('border-flame', 'bg-flame-glow/40')
    addFiles(e.dataTransfer.files)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dropzoneRef.current?.classList.add('border-flame', 'bg-flame-glow/40')
  }, [])

  const handleDragLeave = useCallback(() => {
    dropzoneRef.current?.classList.remove('border-flame', 'bg-flame-glow/40')
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const supabase  = createClient()
      const memoryId  = crypto.randomUUID()
      const uploadedItems: Array<{ url: string; thumbnailUrl: null; type: string }> = []

      // Upload media files
      if (mediaFiles.length > 0) {
        setUploadProgress(`Uploading 0 / ${mediaFiles.length}…`)
        for (let i = 0; i < mediaFiles.length; i++) {
          const { file, type } = mediaFiles[i]
          const ext  = file.name.split('.').pop() ?? (type === 'video' ? 'mp4' : 'jpg')
          const path = `${memoryId}/${i}-${Date.now()}.${ext}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('memory-media')
            .upload(path, file, { contentType: file.type, upsert: false })

          if (uploadError) {
            setError(`Upload failed: ${uploadError.message}`)
            setUploadProgress(null)
            return
          }

          const { data: { publicUrl } } = supabase.storage
            .from('memory-media')
            .getPublicUrl(uploadData.path)

          uploadedItems.push({ url: publicUrl, thumbnailUrl: null, type })
          setUploadProgress(`Uploading ${i + 1} / ${mediaFiles.length}…`)
        }
        setUploadProgress(null)
      }

      // Build form data and call server action
      const fd = new FormData()
      fd.set('title',   title)
      fd.set('content', content)
      fd.set('genre',   genre)
      fd.set('groupId', groupId)
      if (takenAt)  fd.set('takenAt',  takenAt)
      if (albumId)  fd.set('albumId',  albumId)
      fd.set('visibility', visibility)
      if (uploadedItems.length > 0) fd.set('mediaItems', JSON.stringify(uploadedItems))

      // Encode tagged people into the form data so the server action can insert them
      if (taggedIds.size > 0) {
        const tags = Array.from(taggedIds)
          .map(id => {
            const p = groupPeople.find(pp => pp.id === id)
            return p ? { id: p.id, type: p.type } : null
          })
          .filter(Boolean)
        if (tags.length > 0) fd.set('taggedPeople', JSON.stringify(tags))
      }

      const result = await createMemory(fd)
      if (result?.error) {
        setError(result.error)
        setStep('details')
      }
      // On success, createMemory redirects
    })
  }

  const STEPS = (['details', 'media', 'people', 'preview'] as Step[])
  const stepIndex = STEPS.indexOf(step)
  const coverPreview = mediaFiles[0]

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={ROUTES.dashboard}
          className="w-9 h-9 rounded-full bg-ink/5 flex items-center justify-center text-ink-soft hover:text-ink hover:bg-ink/10 transition-colors flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          <p className="text-eyebrow mb-0.5">New memory</p>
          <h1 className="font-serif text-2xl font-bold text-ink leading-tight">What happened?</h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
              step === s        ? 'bg-flame text-white'
              : i < stepIndex   ? 'bg-flame/20 text-flame'
              :                   'bg-ink/8 text-ink-soft'
            )}>
              {i < stepIndex ? (
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={cn('text-xs font-medium capitalize', step === s ? 'text-ink' : 'text-ink-soft')}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="h-px bg-ink/10 w-6" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-6">
          {error}
        </div>
      )}

      {/* ── Step 1: Details ── */}
      {step === 'details' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">
              Title <span className="text-flame">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Summer barbecue at Grandma's"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">
              When did this happen?
            </label>
            <input
              type="date"
              className="input"
              value={takenAt}
              onChange={e => setTakenAt(e.target.value)}
            />
          </div>

          {groups.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1.5">
                Add to event <span className="text-flame">*</span>
              </label>
              <select
                className="input"
                value={groupId}
                onChange={e => { setGroupId(e.target.value); setAlbumId('') }}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Album selector — shown only when the selected group has albums */}
          {groupAlbums.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1.5">
                Add to album <span className="text-ink-faint font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAlbumId('')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all',
                    !albumId
                      ? 'bg-ink text-white border-ink'
                      : 'border-ink/15 text-ink-soft hover:border-ink/30'
                  )}
                >
                  No album
                </button>
                {groupAlbums.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAlbumId(a.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-all',
                      albumId === a.id
                        ? 'bg-flame text-white border-flame'
                        : 'border-ink/15 text-ink-soft hover:border-flame/40 hover:text-flame'
                    )}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-2">
              What kind of memory is this?
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g as Genre)}
                  className={cn(
                    'genre-badge cursor-pointer transition-all',
                    `genre-${g}`,
                    genre === g && 'ring-2 ring-offset-1 ring-flame scale-105'
                  )}
                >
                  {GENRE_LABELS[g as Genre]}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-2">Who can see this?</label>
            <div className="grid grid-cols-2 gap-2">
              {(['group', 'public'] as Visibility[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-xl border-[1.5px] text-left transition-all',
                    visibility === v
                      ? 'border-flame bg-flame-glow/40 text-flame'
                      : 'border-ink/10 text-ink-soft hover:border-ink/20'
                  )}
                >
                  {v === 'group' ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                    </svg>
                  )}
                  <div>
                    <p className="text-xs font-semibold capitalize leading-none mb-0.5">
                      {v === 'group' ? 'Group only' : 'Public'}
                    </p>
                    <p className="text-[10px] leading-snug opacity-70">
                      {v === 'group' ? 'Participants only' : 'Anyone with link'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-mid mb-1.5">Caption</label>
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="Tell the story…"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg w-full"
            disabled={!title.trim() || !groupId}
            onClick={() => setStep('media')}
          >
            Next: Add photos &amp; video
          </button>
        </div>
      )}

      {/* ── Step 2: Media ── */}
      {step === 'media' && (
        <div className="space-y-5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />

          {/* Dropzone */}
          <div
            ref={dropzoneRef}
            role="button"
            tabIndex={0}
            aria-label="Add photos or video"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="border-2 border-dashed border-ink/15 rounded-2xl p-10 text-center hover:border-flame/50 hover:bg-flame-glow/20 transition-all cursor-pointer select-none"
          >
            <div className="w-14 h-14 rounded-full bg-flame-glow flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#F9761C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink mb-1">
              {mediaFiles.length > 0 ? 'Add more photos or video' : 'Add photos or video'}
            </p>
            <p className="text-xs text-ink-soft">Click or drag &amp; drop · JPG, PNG, GIF, MP4 up to 50 MB</p>
          </div>

          {/* Previews */}
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {mediaFiles.map((mf, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-ink/5">
                  {mf.type === 'photo' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mf.previewUrl}
                      alt={mf.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-ink/8">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M15 10l4.553-2.277A1 1 0 0121 8.7v6.6a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                      <span className="text-[10px] text-ink-soft font-medium">Video</span>
                    </div>
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ink"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  {/* Cover badge */}
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[9px] font-semibold bg-ink/60 text-white px-1.5 py-0.5 rounded-full">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {mediaFiles.length > 0 && (
            <p className="text-xs text-ink-faint text-center">
              {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''} selected · First photo is the cover
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary btn-lg flex-1" onClick={() => setStep('details')}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-lg flex-1" onClick={() => setStep('people')}>
              {mediaFiles.length > 0 ? 'Next: Tag people' : 'Skip photos'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Tag people ── */}
      {step === 'people' && (
        <div className="space-y-5">
          <TagPeopleStep
            people={groupPeople}
            selected={taggedIds}
            onToggle={handleToggleTag}
          />
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-secondary btn-lg flex-1" onClick={() => setStep('media')}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-lg flex-1" onClick={() => setStep('preview')}>
              {taggedIds.size > 0
                ? `Next: Preview (${taggedIds.size} tagged)`
                : 'Skip tagging'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Preview & submit ── */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="card overflow-hidden">
            {/* Cover image preview */}
            {coverPreview?.type === 'photo' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview.previewUrl}
                alt="Cover"
                className="w-full h-48 object-cover"
              />
            )}
            {coverPreview?.type === 'video' && (
              <div className="w-full h-48 bg-ink/8 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M15 10l4.553-2.277A1 1 0 0121 8.7v6.6a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
            )}
            {!coverPreview && (
              <div className="w-full h-32 photo-gradient" />
            )}

            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
                <span className={cn('genre-badge flex-shrink-0', `genre-${genre}`)}>
                  {GENRE_LABELS[genre]}
                </span>
              </div>
              {content && <p className="text-sm text-ink-soft leading-relaxed">{content}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-ink-faint">
                {takenAt && (
                  <span>{new Date(takenAt + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                )}
                <span>{groups.find(g => g.id === groupId)?.name}</span>
                {mediaFiles.length > 0 && (
                  <span>{mediaFiles.length} photo{mediaFiles.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>

          {uploadProgress && (
            <div className="flex items-center gap-2 text-sm text-ink-soft bg-flame-glow/40 rounded-xl px-4 py-3">
              <div className="w-4 h-4 border-2 border-flame/40 border-t-flame rounded-full animate-spin flex-shrink-0" />
              {uploadProgress}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary btn-lg flex-1"
              onClick={() => setStep('people')}
              disabled={isPending}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg flex-1"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (uploadProgress ?? 'Sharing…') : 'Share memory'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
