'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createJournal } from '@/lib/actions/journals'
import { ROUTES } from '@/lib/constants'

const JOURNAL_GENRES = [
  { value: 'romance',       icon: '💕', label: 'Romance',       desc: 'Love stories & relationships' },
  { value: 'drama',         icon: '🎭', label: 'Drama',         desc: 'Life\'s challenges & triumphs' },
  { value: 'adventure',     icon: '🌍', label: 'Adventure',     desc: 'Travel & exploration' },
  { value: 'comedy',        icon: '😄', label: 'Comedy',        desc: 'Lighthearted & joyful memories' },
  { value: 'documentary',   icon: '📽️', label: 'Documentary',   desc: 'Real life, recorded truthfully' },
  { value: 'coming-of-age', icon: '🌱', label: 'Coming of Age', desc: 'Growth & milestones' },
]

const COVER_COLORS = [
  { value: '#FF5C1A', label: 'Sunrise',  dark: '#B53C00' },
  { value: '#FF2D78', label: 'Blossom',  dark: '#B5005A' },
  { value: '#FFAA00', label: 'Golden',   dark: '#B57500' },
  { value: '#2E90FA', label: 'Sky',      dark: '#1A6BC4' },
  { value: '#12B76A', label: 'Sage',     dark: '#0D7A3B' },
  { value: '#8B5CF6', label: 'Dusk',     dark: '#5B2DC0' },
  { value: '#1C1917', label: 'Midnight', dark: '#000000' },
]

export default function NewJournalPage() {
  const router = useRouter()

  const [subjectName, setSubjectName] = useState('')
  const [title, setTitle] = useState('')
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]!.value)
  const [genre, setGenre] = useState('drama')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedColor = COVER_COLORS.find(c => c.value === coverColor) ?? COVER_COLORS[0]!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectName.trim() || !title.trim()) return
    setLoading(true)
    setError('')
    const result = await createJournal(subjectName.trim(), title.trim(), coverColor, genre)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.id) {
      router.push(ROUTES.journal(result.id))
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b-[2.5px] border-ink" style={{ background: '#1C1917' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3 sm:gap-4">
          <Link href={ROUTES.journals} className="text-white/50 hover:text-white transition-colors text-sm font-semibold">
            ← Journals
          </Link>
          <span className="text-white/20">/</span>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-sunrise">New Journal</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          {/* Live cover preview — shown above form on mobile, beside it on desktop */}
          <div className="flex-shrink-0 flex sm:block items-center gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-ink-soft mb-0 sm:mb-3">Preview</p>
            <div
              className="w-20 sm:w-32 relative"
              style={{
                background: coverColor,
                border: '3px solid rgba(0,0,0,0.5)',
                boxShadow: '6px 6px 0 rgba(0,0,0,0.4)',
                aspectRatio: '3/4',
              }}
            >
              {/* Spine */}
              <div className="absolute left-0 inset-y-0 w-[10px]" style={{ background: 'rgba(0,0,0,0.2)' }} />
              {/* Pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 1px, transparent 0, transparent 50%)',
                backgroundSize: '10px 10px',
              }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                <div className="w-9 h-9 mb-2 rounded-full border-[2.5px] border-white/80 flex items-center justify-center">
                  <span className="text-white/90 text-base">📖</span>
                </div>
                <p className="font-serif font-bold text-white text-[10px] leading-tight mb-1 line-clamp-2">
                  {title || 'Journal Title'}
                </p>
                <p className="text-white/70 text-[9px]">
                  {subjectName ? `About ${subjectName}` : 'About...'}
                </p>
              </div>
              <div className="absolute top-1.5 right-1.5 px-1 py-0.5 text-[8px] font-bold"
                   style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}>
                {new Date().getFullYear()}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-5 sm:space-y-6">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mb-1">Create a journal</h1>
              <p className="text-ink-soft text-sm">A life story, told beautifully.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                Who is this journal about?
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Grandma Rosa"
                value={subjectName}
                onChange={e => setSubjectName(e.target.value)}
                required
                maxLength={80}
              />
              <p className="text-xs text-ink-faint mt-1">The person whose story you are telling.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                Journal title
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. A Life Full of Color"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-3">
                Cover color
              </label>
              <div className="flex flex-wrap gap-3">
                {COVER_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setCoverColor(color.value)}
                    className="w-11 h-11 flex-shrink-0 transition-transform hover:-translate-y-0.5"
                    style={{
                      background: color.value,
                      border: coverColor === color.value ? `3px solid ${color.dark}` : '3px solid transparent',
                      boxShadow: coverColor === color.value ? `3px 3px 0 ${color.dark}` : '3px 3px 0 #D4CCC4',
                      outline: coverColor === color.value ? `2px solid white` : 'none',
                      outlineOffset: '-5px',
                    }}
                    title={color.label}
                  />
                ))}
              </div>
              <p className="text-xs text-ink-faint mt-2">{selectedColor.label}</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-3">
                Cinematic genre
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {JOURNAL_GENRES.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGenre(g.value)}
                    className="flex flex-col items-start p-3 text-left transition-transform hover:-translate-y-0.5"
                    style={{
                      border: genre === g.value ? '2.5px solid #FF5C1A' : '2px solid #E7E0D8',
                      boxShadow: genre === g.value ? '3px 3px 0 #B53C00' : '2px 2px 0 #D4C9B0',
                      background: genre === g.value ? '#FFF5F0' : '#F5F0E8',
                    }}
                  >
                    <span className="text-2xl mb-1">{g.icon}</span>
                    <span className="text-xs font-bold text-ink">{g.label}</span>
                    <span className="text-[10px] text-ink-soft mt-0.5">{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 text-sm font-semibold text-blossom bg-blossom/10 border-2 border-blossom">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !subjectName.trim() || !title.trim()}
                className="btn btn-primary btn-md"
              >
                {loading ? 'Creating…' : 'Create journal'}
              </button>
              <Link href={ROUTES.journals} className="btn btn-ghost btn-md">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
