'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { createReel } from '@/lib/actions/reels'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReelGenre    = 'romance' | 'drama' | 'adventure' | 'comedy' | 'documentary'
type TemplateId   = 'day' | 'thennow' | 'family' | 'journey' | 'milestones'
type MusicId      = 'piano' | 'uplifting' | 'orchestra' | 'jazz' | 'acoustic'

interface Photo { url: string }
interface PlacedSticker { emoji: string; x: number; y: number }

interface ReelState {
  genre:    ReelGenre | null
  template: TemplateId | null
  music:    MusicId | null
  sticker:  string | null
  photos:   (Photo | null)[]
  stickers: PlacedSticker[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const GENRES: { id: ReelGenre; icon: string; name: string; sub: string }[] = [
  { id: 'romance',     icon: '💕', name: 'Romance',     sub: 'Warm & heartfelt'  },
  { id: 'drama',       icon: '🎭', name: 'Drama',       sub: 'Cinematic & deep'  },
  { id: 'adventure',   icon: '🌍', name: 'Adventure',   sub: 'Energetic & bold'  },
  { id: 'comedy',      icon: '😄', name: 'Comedy',      sub: 'Fun & playful'     },
  { id: 'documentary', icon: '📽️', name: 'Documentary', sub: 'Clean & factual'   },
]

const TEMPLATES: { id: TemplateId; icon: string; name: string; desc: string }[] = [
  { id: 'day',        icon: '📅', name: 'A Day to Remember', desc: 'Chronological moments from one special day' },
  { id: 'thennow',    icon: '🔄', name: 'Then & Now',        desc: "Past vs present — see how far you've come"  },
  { id: 'family',     icon: '👨‍👩‍👧', name: 'Family Portrait',  desc: 'People-centred, warm introductions'        },
  { id: 'journey',    icon: '🗺️', name: 'The Journey',       desc: 'Travel or adventure with place cards'       },
  { id: 'milestones', icon: '🏆', name: 'Growing Up',         desc: 'Milestone moments in order'                },
]

const MUSIC: { id: MusicId; icon: string; name: string; sub: string }[] = [
  { id: 'piano',     icon: '🎹', name: 'Gentle Piano',       sub: 'Soft, reflective, tender'  },
  { id: 'uplifting', icon: '🎵', name: 'Uplifting Pop',       sub: 'Bright, optimistic, warm'  },
  { id: 'orchestra', icon: '🎻', name: 'Cinematic Orchestra', sub: 'Grand, sweeping, emotional' },
  { id: 'jazz',      icon: '🎷', name: 'Jazz & Soul',         sub: 'Warm, nostalgic, smooth'   },
  { id: 'acoustic',  icon: '🎸', name: 'Acoustic Guitar',     sub: 'Simple, intimate, earthy'  },
]

const STICKER_PACKS: Record<string, string[]> = {
  Classic: ['❤️','⭐','🌟','💫','✨','🎉','🎊','🎈','🎁','🥂','🌈','💖'],
  Film:    ['🎬','🎞️','📽️','🎥','🎦','🎫','🎟️','🏆','🎭','🎪','📸','🎙️'],
  Nature:  ['🌸','🌺','🌻','🌹','🍀','🌿','🌊','🦋','🌙','☀️','🌤️','🍂'],
  Family:  ['👨‍👩‍👧','👴','👵','🤝','💑','👶','🏠','🫂','💝','🎂','🕯️','🌻'],
}

const GENRE_FILTER: Record<ReelGenre, string> = {
  romance:     'sepia(0.15) saturate(1.2) contrast(0.95)',
  drama:       'contrast(1.15) saturate(0.8) brightness(0.88)',
  adventure:   'saturate(1.35) contrast(1.1) brightness(1.03)',
  comedy:      'saturate(1.45) brightness(1.06) contrast(1.05)',
  documentary: 'saturate(0.65) contrast(1.08) brightness(0.96)',
}

const GENRE_BARS: Record<ReelGenre, number> = {
  romance: 0, drama: 36, adventure: 0, comedy: 0, documentary: 0,
}

const TEMPLATE_NAMES: Record<TemplateId, string> = {
  day: 'A Day to Remember', thennow: 'Then & Now',
  family: 'Family Portrait', journey: 'The Journey', milestones: 'Growing Up',
}

const SLOT_COUNT    = 6
const SLIDE_DURATION = 3000

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewReelPage() {
  const router = useRouter()

  const [title, setTitle] = useState('My Reel')
  const [reel, setReel] = useState<ReelState>({
    genre: null, template: null, music: null,
    sticker: null, photos: Array(SLOT_COUNT).fill(null), stickers: [],
  })

  const [openSection, setOpenSection]         = useState<string>('genre')
  const [activeStickerPack, setActiveStickerPack] = useState('Classic')
  const [currentSlide, setCurrentSlide]       = useState(0)
  const [isPlaying, setIsPlaying]             = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingSlot  = useRef<number | null>(null)
  const playTimer    = useRef<ReturnType<typeof setInterval> | null>(null)

  const photos      = reel.photos.filter(Boolean) as Photo[]
  const totalSlides = 1 + photos.length // title card + photos
  const isReady     = reel.genre !== null && photos.length > 0

  // ── Playback ─────────────────────────────────────────────────────────────────
  const goToSlide = useCallback((n: number) => {
    setCurrentSlide(Math.max(0, Math.min(n, totalSlides - 1)))
  }, [totalSlides])

  useEffect(() => {
    if (isPlaying) {
      playTimer.current = setInterval(() => {
        setCurrentSlide(prev => {
          const next = prev + 1
          if (next >= totalSlides) { setIsPlaying(false); return prev }
          return next
        })
      }, SLIDE_DURATION)
    }
    return () => { if (playTimer.current) clearInterval(playTimer.current) }
  }, [isPlaying, totalSlides])

  function togglePlay() {
    if (!isReady) return
    setIsPlaying(p => !p)
  }

  // ── Save Reel ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!reel.genre) {
      setSaveError('Please select a genre before saving.')
      return
    }
    if (photos.length === 0) {
      setSaveError('Please add at least one photo before saving.')
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createClient()
      const uploadedPhotos: { url: string }[] = []

      for (let i = 0; i < reel.photos.length; i++) {
        const photo = reel.photos[i]
        if (!photo) continue

        // If it's a local data URL, upload to Supabase storage
        if (photo.url.startsWith('data:')) {
          const response = await fetch(photo.url)
          const blob = await response.blob()
          const path = `reels/${Date.now()}-${i}.jpg`

          const { error: uploadError } = await supabase.storage
            .from('memory-media')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

          if (uploadError) {
            setSaveError(`Failed to upload photo ${i + 1}: ${uploadError.message}`)
            setSaving(false)
            return
          }

          const { data: publicData } = supabase.storage
            .from('memory-media')
            .getPublicUrl(path)

          uploadedPhotos.push({ url: publicData.publicUrl })
        } else {
          // Already a remote URL
          uploadedPhotos.push({ url: photo.url })
        }
      }

      const result = await createReel({
        title,
        genre: reel.genre,
        template: reel.template,
        music: reel.music,
        photos: uploadedPhotos,
        stickers: reel.stickers,
      })

      if (result.error || !result.id) {
        setSaveError(result.error ?? 'Failed to save reel.')
        setSaving(false)
        return
      }

      router.push(ROUTES.reel(result.id))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setSaving(false)
    }
  }

  // ── Photos ───────────────────────────────────────────────────────────────────
  function openFilePicker(idx: number) {
    pendingSlot.current = idx
    fileInputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach((file, i) => {
      const idx = (pendingSlot.current ?? 0) + i
      if (idx >= SLOT_COUNT) return
      const reader = new FileReader()
      reader.onload = ev => {
        setReel(r => {
          const newPhotos = [...r.photos]
          newPhotos[idx] = { url: ev.target?.result as string }
          return { ...r, photos: newPhotos }
        })
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
    pendingSlot.current = null
  }

  function removePhoto(idx: number) {
    setReel(r => {
      const newPhotos = [...r.photos]
      newPhotos[idx] = null
      return { ...r, photos: newPhotos }
    })
  }

  // ── Sticker placement ────────────────────────────────────────────────────────
  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!reel.sticker) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width  * 100)
    const y = ((e.clientY - rect.top)  / rect.height * 100)
    setReel(r => ({ ...r, stickers: [...r.stickers, { emoji: reel.sticker!, x, y }] }))
  }

  function removeSticker(idx: number) {
    setReel(r => ({ ...r, stickers: r.stickers.filter((_, i) => i !== idx) }))
  }

  const progress = totalSlides > 1 ? (currentSlide / (totalSlides - 1)) * 100 : 0

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas flex flex-col">

      {/* Top nav */}
      <nav className="sticky top-0 z-50 flex items-center gap-3 px-4 sm:px-6 py-3 bg-canvas" style={{ borderBottom: '2.5px solid #1C1917' }}>
        <Link
          href={ROUTES.reels}
          className="btn btn-sm"
          style={{ fontSize: 11, letterSpacing: '0.05em', fontWeight: 700 }}
        >
          ← REELS
        </Link>
        <div>
          <p className="font-serif text-base font-bold text-ink leading-tight">🎬 Create a Memory Reel</p>
          <p className="text-xs text-ink-soft hidden sm:block">Choose a genre, add photos, stickers &amp; music</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className="btn btn-sm"
            style={{ fontSize: 11, letterSpacing: '0.05em', fontWeight: 700, opacity: isReady ? 1 : 0.4 }}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY REEL'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isReady}
            className="btn btn-primary btn-sm"
            style={{ fontSize: 11, letterSpacing: '0.05em', fontWeight: 700, opacity: (saving || !isReady) ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : '💾 SAVE REEL'}
          </button>
        </div>
      </nav>

      {/* Save error */}
      {saveError && (
        <div className="px-4 sm:px-6 py-2 bg-red-50 text-red-700 text-sm flex items-center justify-between" style={{ borderBottom: '1.5px solid #fca5a5' }}>
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-700 ml-4 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* LEFT: Builder */}
        <aside className="lg:w-[340px] lg:flex-shrink-0 bg-canvas border-b lg:border-b-0 lg:border-r border-[#E7E0D8] overflow-y-auto">

          {/* Title input */}
          <div className="px-4 py-4 border-b border-[#E7E0D8]">
            <label className="block text-[11px] font-bold tracking-widest text-ink-soft mb-2">TITLE</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My Reel"
              className="w-full px-3 py-2 text-sm font-serif font-semibold text-ink bg-white rounded focus:outline-none focus:ring-2 focus:ring-ink/20"
              style={{ border: '2px solid #E7E0D8' }}
            />
          </div>

          {/* Genre */}
          <Section
            id="genre" label="GENRE" step={1} open={openSection === 'genre'}
            done={reel.genre !== null} onToggle={setOpenSection}
          >
            <div className="grid grid-cols-2 gap-2">
              {GENRES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setReel(r => ({ ...r, genre: g.id }))}
                  className={`p-3 border-2 rounded text-center transition-all ${
                    reel.genre === g.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-[#E7E0D8] bg-canvas hover:border-ink'
                  }`}
                >
                  <span className="text-2xl block mb-1">{g.icon}</span>
                  <div className="text-[11px] font-bold tracking-wider">{g.name.toUpperCase()}</div>
                  <div className={`text-[10px] mt-0.5 ${reel.genre === g.id ? 'text-white/60' : 'text-ink-soft'}`}>{g.sub}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Template */}
          <Section
            id="template" label="TEMPLATE" step={2} open={openSection === 'template'}
            done={reel.template !== null} onToggle={setOpenSection}
          >
            <div className="flex flex-col gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setReel(r => ({ ...r, template: t.id }))}
                  className={`flex items-center gap-3 p-3 border-2 rounded text-left transition-all ${
                    reel.template === t.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-[#E7E0D8] bg-canvas hover:border-ink'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className={`text-[10px] mt-0.5 ${reel.template === t.id ? 'text-white/60' : 'text-ink-soft'}`}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Photos */}
          <Section
            id="photos" label="PHOTOS & MOMENTS" step={3} open={openSection === 'photos'}
            done={photos.length > 0} onToggle={setOpenSection}
          >
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                const photo = reel.photos[i]
                return (
                  <div key={i} className="relative aspect-square">
                    {photo ? (
                      <div className="group relative w-full h-full border-2 border-[#E7E0D8] rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <button
                            onClick={() => removePhoto(i)}
                            className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-full"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openFilePicker(i)}
                        className="w-full h-full border-2 border-dashed border-[#E7E0D8] rounded flex flex-col items-center justify-center gap-1 text-ink-soft hover:border-ink hover:bg-surface transition-all"
                      >
                        <span className="text-xl">＋</span>
                        <span className="text-[10px] font-medium">Photo {i + 1}</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-ink-soft mt-3 text-center">Tap a slot to add a photo from your device</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFileChange}
            />
          </Section>

          {/* Stickers */}
          <Section
            id="stickers" label="STICKERS" step={4} open={openSection === 'stickers'}
            done={reel.stickers.length > 0} onToggle={setOpenSection}
          >
            <div className="flex gap-1.5 flex-wrap mb-3">
              {Object.keys(STICKER_PACKS).map(pack => (
                <button
                  key={pack}
                  onClick={() => setActiveStickerPack(pack)}
                  className={`px-2.5 py-1 border rounded-full text-[11px] font-semibold transition-all ${
                    activeStickerPack === pack
                      ? 'border-ink bg-ink text-white'
                      : 'border-[#E7E0D8] text-ink-soft hover:border-ink'
                  }`}
                >
                  {pack}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {(STICKER_PACKS[activeStickerPack] ?? []).map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setReel(r => ({ ...r, sticker: r.sticker === emoji ? null : emoji }))}
                  className={`aspect-square rounded flex items-center justify-center text-xl transition-all hover:scale-110 ${
                    reel.sticker === emoji
                      ? 'border-2 border-ink bg-surface shadow-sm'
                      : 'border border-transparent hover:border-[#E7E0D8]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-soft mt-2">
              {reel.sticker
                ? `${reel.sticker} selected — tap the preview to place it`
                : 'Select a sticker, then tap anywhere on the preview'}
            </p>
          </Section>

          {/* Music */}
          <Section
            id="music" label="MUSIC MOOD" step={5} open={openSection === 'music'}
            done={reel.music !== null} onToggle={setOpenSection}
          >
            <div className="flex flex-col gap-2">
              {MUSIC.map(m => (
                <button
                  key={m.id}
                  onClick={() => setReel(r => ({ ...r, music: m.id }))}
                  className={`flex items-center gap-3 p-3 border-2 rounded text-left transition-all ${
                    reel.music === m.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-[#E7E0D8] bg-canvas hover:border-ink'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <div className="text-sm font-bold">{m.name}</div>
                    <div className={`text-[10px] mt-0.5 ${reel.music === m.id ? 'text-white/60' : 'text-ink-soft'}`}>{m.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </Section>

        </aside>

        {/* RIGHT: Preview */}
        <main className="flex-1 flex flex-col items-center p-5 sm:p-8 bg-surface overflow-y-auto">

          <p className="text-[11px] font-bold tracking-widest text-ink-soft mb-4 self-start">PREVIEW</p>

          {/* Cinema frame */}
          <div
            className="relative w-full overflow-hidden shadow-2xl cursor-pointer"
            style={{
              maxWidth: 600,
              aspectRatio: '16/9',
              background: '#111',
              filter: reel.genre ? GENRE_FILTER[reel.genre] : undefined,
              border: '2.5px solid #1C1917',
            }}
            onClick={handlePreviewClick}
          >
            {/* Cinema bars (drama genre) */}
            {reel.genre && GENRE_BARS[reel.genre] > 0 && (
              <>
                <div className="absolute top-0 left-0 right-0 bg-black z-10" style={{ height: GENRE_BARS[reel.genre] }} />
                <div className="absolute bottom-0 left-0 right-0 bg-black z-10" style={{ height: GENRE_BARS[reel.genre] }} />
              </>
            )}

            {/* Empty hint */}
            {!isReady && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 text-center px-6">
                <span className="text-4xl mb-3">🎬</span>
                <p className="text-white font-bold text-sm">Your reel preview will appear here</p>
                <p className="text-white/50 text-xs mt-1">Select a genre and add at least one photo</p>
              </div>
            )}

            {/* Slides */}
            {isReady && (
              <>
                {/* Title card */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700"
                  style={{ opacity: currentSlide === 0 ? 1 : 0 }}
                >
                  {photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[0].url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-6 text-center">
                    <p className="font-serif text-white font-bold text-2xl sm:text-3xl drop-shadow-lg">
                      {title || (reel.template ? TEMPLATE_NAMES[reel.template] : 'A Memory Reel')}
                    </p>
                    {reel.genre && (
                      <p className="text-white/60 text-xs tracking-widest uppercase mt-2">
                        {GENRES.find(g => g.id === reel.genre)?.icon} {reel.genre}
                      </p>
                    )}
                  </div>
                </div>

                {/* Photo slides */}
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: currentSlide === i + 1 ? 1 : 0 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={`Memory ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </>
            )}

            {/* Placed stickers */}
            {reel.stickers.map((s, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); removeSticker(i) }}
                className="absolute z-30 text-3xl sm:text-4xl -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                title="Click to remove"
              >
                {s.emoji}
              </button>
            ))}

            {/* Music label */}
            {reel.music && (
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-black/55 text-white/85 text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="animate-bounce">♪</span>
                {MUSIC.find(m => m.id === reel.music)?.name}
              </div>
            )}

            {/* Slide counter */}
            {isReady && (
              <div className="absolute bottom-3 right-3 z-20 bg-black/45 text-white/70 text-xs font-semibold px-2.5 py-1 rounded-full">
                {currentSlide + 1} / {totalSlides}
              </div>
            )}

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
              <div
                className="h-full bg-white/60 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2 mt-4 w-full" style={{ maxWidth: 600 }}>
            <button
              onClick={() => goToSlide(currentSlide - 1)}
              className="btn btn-sm"
              style={{ fontSize: 13, width: 36, height: 36, padding: 0 }}
            >◀</button>
            <button
              onClick={togglePlay}
              disabled={!isReady}
              className={`btn btn-sm ${isReady ? 'btn-primary' : ''}`}
              style={{ fontSize: 13, width: 36, height: 36, padding: 0, opacity: isReady ? 1 : 0.4 }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => goToSlide(currentSlide + 1)}
              className="btn btn-sm"
              style={{ fontSize: 13, width: 36, height: 36, padding: 0 }}
            >▶▶</button>

            {/* Scrub track */}
            <div
              className="flex-1 h-1 bg-[#DDD5C0] rounded-full relative cursor-pointer"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const pct  = (e.clientX - rect.left) / rect.width
                goToSlide(Math.round(pct * (totalSlides - 1)))
              }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-ink transition-all"
                style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-2 mt-4 w-full" style={{ maxWidth: 600 }}>
            {[
              { label: 'GENRE',    value: reel.genre    ? (GENRES.find(g => g.id === reel.genre)?.icon ?? '') + ' ' + reel.genre : '—' },
              { label: 'TEMPLATE', value: reel.template ? TEMPLATE_NAMES[reel.template]                                             : '—' },
              { label: 'MUSIC',    value: reel.music    ? (MUSIC.find(m => m.id === reel.music)?.name ?? '—')                       : '—' },
            ].map(chip => (
              <div key={chip.label} className="card p-2 text-center">
                <p className="text-[10px] font-bold tracking-widest text-ink-soft">{chip.label}</p>
                <p className="text-sm font-bold text-ink mt-0.5 truncate">{chip.value}</p>
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}

// ─── Section accordion ─────────────────────────────────────────────────────────

function Section({
  id, label, step, open, done, onToggle, children,
}: {
  id: string; label: string; step: number; open: boolean
  done: boolean; onToggle: (id: string) => void; children: React.ReactNode
}) {
  return (
    <div className="border-b border-[#E7E0D8]">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
        onClick={() => onToggle(open ? '' : id)}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: done ? '#15A34A' : '#1C1917' }}
          >
            {done ? '✓' : step}
          </span>
          <span className="text-[11px] font-bold tracking-widest text-ink">{label}</span>
        </div>
        <span
          className="text-ink-soft text-xs"
          style={{ transform: open ? 'rotate(180deg)' : undefined, display: 'inline-block', transition: 'transform 0.2s' }}
        >▼</span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 bg-white">{children}</div>}
    </div>
  )
}
