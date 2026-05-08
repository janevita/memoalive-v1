'use client'

import { useState, useCallback } from 'react'
import type { JournalWithChapters, JournalChapter, JournalBlock } from '@/lib/types'
import {
  createChapter, updateChapterTitle, deleteChapter,
} from '@/lib/actions/journals'
import { cn } from '@/lib/utils'
import { RichChapterEditor } from './RichChapterEditor'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props { journal: JournalWithChapters; isOwner: boolean }

// ── Backward-compat helper ────────────────────────────────────────────────────
// Converts old multi-block chapters (heading/paragraph/quote rows) to a single
// Tiptap-compatible HTML string. New chapters will already have HTML in blocks[0].

function escHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function blocksToHtml(blocks: JournalBlock[]): string {
  if (!blocks.length) return ''

  // New-style: single block whose content is already HTML (starts with '<')
  if (blocks.length === 1 && blocks[0]!.content.trimStart().startsWith('<')) {
    return blocks[0]!.content
  }

  // Old-style: convert each block type to a Tiptap-safe HTML element
  return blocks
    .filter(b => b.blockType !== 'image') // images handled separately later
    .map(b => {
      if (!b.content.trim()) return ''
      switch (b.blockType) {
        case 'heading':  return `<h2>${escHtml(b.content)}</h2>`
        case 'quote':    return `<blockquote><p>${escHtml(b.content)}</p></blockquote>`
        case 'divider':  return '<hr>'
        default:         return `<p>${escHtml(b.content)}</p>`
      }
    })
    .filter(Boolean)
    .join('\n')
}

// ── Chapter Panel ─────────────────────────────────────────────────────────────

function ChapterPanel({
  chapter, subjectName, isOwner, onChapterUpdate, onChapterDelete,
}: {
  chapter: JournalChapter
  subjectName: string
  isOwner: boolean
  onChapterUpdate: (id: string, patch: Partial<JournalChapter>) => void
  onChapterDelete: (id: string) => void
}) {
  const [chapterTitle, setChapterTitle] = useState(chapter.title)
  const [editingTitle, setEditingTitle] = useState(false)

  const saveTitle = async (val: string) => {
    setEditingTitle(false)
    if (!val.trim() || val.trim() === chapter.title) return
    await updateChapterTitle(chapter.id, val.trim())
    onChapterUpdate(chapter.id, { title: val.trim() })
  }

  const initialHtml = blocksToHtml(chapter.blocks)

  return (
    <section className="mb-16">
      {/* Chapter header */}
      <div className="group flex items-center gap-3 mb-8">
        {isOwner && editingTitle ? (
          <input
            autoFocus
            value={chapterTitle}
            onChange={e => setChapterTitle(e.target.value)}
            onBlur={e => saveTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveTitle(chapterTitle)}
            className="font-serif text-xl font-bold text-ink bg-transparent outline-none border-b-2 border-sunrise flex-1"
          />
        ) : (
          <h2
            onClick={() => isOwner && setEditingTitle(true)}
            className={cn(
              'font-serif text-xl font-bold text-ink flex-1',
              isOwner && 'cursor-pointer hover:text-sunrise transition-colors'
            )}
            title={isOwner ? 'Click to rename' : undefined}
          >
            {chapterTitle}
          </h2>
        )}
        {isOwner && (
          <button
            onClick={() => onChapterDelete(chapter.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-faint hover:text-blossom"
          >
            Delete chapter
          </button>
        )}
      </div>

      {/* Rich text editor — one per chapter */}
      <div className="max-w-full sm:max-w-[700px]">
        <RichChapterEditor
          chapterId={chapter.id}
          subjectName={subjectName}
          isOwner={isOwner}
          initialHtml={initialHtml}
        />
      </div>
    </section>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function JournalEditor({ journal, isOwner }: Props) {
  const [chapters,       setChapters]       = useState<JournalChapter[]>(journal.chapters)
  const [addingChapter,  setAddingChapter]  = useState(false)

  const handleAddChapter = async () => {
    setAddingChapter(true)
    const num    = chapters.length + 1
    const result = await createChapter(journal.id, `Chapter ${num}`, num)
    if (result.id) {
      setChapters(prev => [...prev, {
        id: result.id!, journalId: journal.id, chapterNumber: num,
        title: `Chapter ${num}`, createdAt: new Date().toISOString(), blocks: [],
      }])
    }
    setAddingChapter(false)
  }

  const handleChapterUpdate = useCallback((id: string, patch: Partial<JournalChapter>) => {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }, [])

  const handleChapterDelete = async (id: string) => {
    if (!confirm('Delete this chapter and all its content?')) return
    setChapters(prev => prev.filter(c => c.id !== id))
    await deleteChapter(id)
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 flex flex-col md:flex-row gap-6 md:gap-8">

      {/* Sidebar — hidden on mobile, visible from md up */}
      <aside className="hidden md:block w-40 flex-shrink-0">
        <div className="sticky top-24">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-ink-soft mb-3">Chapters</p>
          <nav className="space-y-1">
            {chapters.map(c => (
              <a key={c.id} href={`#chapter-${c.id}`}
                className="block text-sm text-ink-soft hover:text-ink transition-colors py-0.5 truncate">
                {c.title}
              </a>
            ))}
          </nav>
          {isOwner && (
            <button
              onClick={handleAddChapter}
              disabled={addingChapter}
              className="mt-4 w-full text-xs font-bold px-2 py-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
              style={{ background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }}
            >
              {addingChapter ? '…' : '+ Add chapter'}
            </button>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        {/* Cover strip */}
        <div className="mb-8 sm:mb-10 px-4 py-6 sm:px-6 sm:py-8 relative overflow-hidden"
          style={{ background: journal.coverColor, border: '3px solid rgba(0,0,0,0.4)', boxShadow: '4px 4px 0 rgba(0,0,0,0.35)' }}>
          <div className="absolute left-0 inset-y-0 w-3 sm:w-4" style={{ background: 'rgba(0,0,0,0.2)' }} />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 1px,transparent 0,transparent 50%)',
            backgroundSize: '10px 10px',
          }} />
          <div className="relative pl-3 sm:pl-4">
            <p className="text-white/60 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-1 sm:mb-2">
              Life Stories · {journal.year}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">{journal.title}</h1>
            <p className="text-white/70 text-xs sm:text-sm">The story of {journal.subjectName}</p>
          </div>
        </div>

        {/* Mobile chapter nav strip — horizontal scroll, visible only on small screens */}
        {chapters.length > 1 && isOwner && (
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
            {chapters.map(c => (
              <a key={c.id} href={`#chapter-${c.id}`}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink border border-ink/20 whitespace-nowrap"
                style={{ background: '#F5F0E8' }}>
                {c.title}
              </a>
            ))}
            {isOwner && (
              <button onClick={handleAddChapter} disabled={addingChapter}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={{ background: '#F5F0E8', border: '1.5px dashed #D4CCC4' }}>
                + Chapter
              </button>
            )}
          </div>
        )}

        {/* Chapters */}
        {chapters.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-bold text-ink mb-2">Begin the story</p>
            <p className="text-ink-soft text-sm mb-8 max-w-sm mx-auto">
              Add your first chapter and start writing {journal.subjectName}&apos;s life story.
            </p>
            {isOwner && (
              <button onClick={handleAddChapter} disabled={addingChapter} className="btn btn-primary btn-md">
                {addingChapter ? 'Adding…' : '+ Add first chapter'}
              </button>
            )}
          </div>
        ) : (
          <>
            {chapters.map(c => (
              <div key={c.id} id={`chapter-${c.id}`}>
                <ChapterPanel
                  chapter={c}
                  subjectName={journal.subjectName}
                  isOwner={isOwner}
                  onChapterUpdate={handleChapterUpdate}
                  onChapterDelete={handleChapterDelete}
                />
              </div>
            ))}
            {isOwner && (
              <div className="pt-8 border-t-[2px] border-ink/10">
                <button onClick={handleAddChapter} disabled={addingChapter}
                  className="btn btn-ghost btn-md"
                  style={{ border: '2px dashed #D4CCC4' }}>
                  {addingChapter ? 'Adding…' : '+ Add chapter'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
