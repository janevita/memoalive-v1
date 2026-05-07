'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { JournalWithChapters, JournalChapter, JournalBlock, JournalBlockType } from '@/lib/types'
import {
  createChapter,
  updateChapterTitle,
  deleteChapter,
  createBlock,
  updateBlock,
  deleteBlock,
  aiGrammarCorrect,
  aiWritingSuggestions,
  aiTonePolish,
} from '@/lib/actions/journals'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  journal: JournalWithChapters
  isOwner: boolean
}

// ── Auto-grow helper ──────────────────────────────────────────────────────────

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

// ── Block Editor ──────────────────────────────────────────────────────────────

function BlockEditor({
  block,
  subjectName,
  isOwner,
  onUpdate,
  onDelete,
  onAddAfter,
}: {
  block: JournalBlock
  subjectName: string
  isOwner: boolean
  onUpdate: (id: string, patch: Partial<JournalBlock>) => void
  onDelete: (id: string) => void
  onAddAfter: (type: JournalBlockType) => void
}) {
  const [content, setContent]       = useState(block.content)
  const [focused, setFocused]       = useState(false)
  const [aiLoading, setAiLoading]   = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const [saved, setSaved]           = useState(true)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-grow on mount and whenever content changes externally
  useEffect(() => {
    autoGrow(textRef.current)
  }, [content])

  // Debounced save — 800ms after last keystroke
  const scheduleSave = useCallback((val: string) => {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      onUpdate(block.id, { content: val })
      await updateBlock(block.id, { content: val })
      setSaved(true)
    }, 800)
  }, [block.id, onUpdate])

  // Flush any pending save immediately
  const flushSave = useCallback(async (val: string) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    if (val === block.content && saved) return
    onUpdate(block.id, { content: val })
    await updateBlock(block.id, { content: val })
    setSaved(true)
  }, [block.id, block.content, onUpdate, saved])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    autoGrow(e.target)
    scheduleSave(val)
  }

  const handleBlur = () => {
    setFocused(false)
    // Only flush if no AI operation is in progress
    if (!aiLoading) flushSave(content)
  }

  // ── AI handlers ──────────────────────────────────────────────────────────

  const handleGrammar = async () => {
    if (!content.trim() || aiLoading) return
    setAiLoading('grammar')
    const { result } = await aiGrammarCorrect(content)
    if (result) {
      setContent(result)
      onUpdate(block.id, { content: result })
      await updateBlock(block.id, { content: result })
      setSaved(true)
      setTimeout(() => autoGrow(textRef.current), 0)
    }
    setAiLoading(null)
  }

  const handleTone = async () => {
    if (!content.trim() || aiLoading) return
    setAiLoading('tone')
    const { result } = await aiTonePolish(content, subjectName)
    if (result) {
      setContent(result)
      onUpdate(block.id, { content: result })
      await updateBlock(block.id, { content: result })
      setSaved(true)
      setTimeout(() => autoGrow(textRef.current), 0)
    }
    setAiLoading(null)
    textRef.current?.focus()
  }

  const handleSuggestions = async () => {
    if (aiLoading) return
    setAiLoading('suggest')
    setSuggestions(null)
    const { suggestions: s } = await aiWritingSuggestions(content, subjectName)
    setSuggestions(s ?? [])
    setAiLoading(null)
  }

  const applySuggestion = (s: string) => {
    const appended = content ? content.trimEnd() + ' ' + s : s
    setContent(appended)
    setSuggestions(null)
    scheduleSave(appended)
    setTimeout(() => {
      autoGrow(textRef.current)
      textRef.current?.focus()
      // scroll to end
      if (textRef.current) {
        textRef.current.selectionStart = appended.length
        textRef.current.selectionEnd = appended.length
      }
    }, 0)
  }

  // ── Special block types ──────────────────────────────────────────────────

  if (block.blockType === 'divider') {
    return (
      <div className="group relative my-6 flex items-center gap-3">
        <div className="flex-1 h-[2px] bg-ink/20" />
        <span className="text-ink-faint text-lg">✦</span>
        <div className="flex-1 h-[2px] bg-ink/20" />
        {isOwner && (
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => onDelete(block.id)}
            className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-faint hover:text-blossom text-xs px-1"
          >✕</button>
        )}
      </div>
    )
  }

  if (block.blockType === 'image') {
    return (
      <div className="group relative my-6">
        {block.imageUrl ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.imageUrl}
              alt={block.content || ''}
              className="w-full max-h-[500px] object-contain"
              style={{ border: '3px solid #1C1917', boxShadow: '4px 4px 0 #1C1917' }}
            />
            {block.content && (
              <figcaption className="text-center text-xs text-ink-soft italic mt-2">{block.content}</figcaption>
            )}
          </figure>
        ) : (
          <div
            className="w-full h-48 flex flex-col items-center justify-center gap-2"
            style={{ background: '#F5F0E8', border: '3px dashed #D4CCC4' }}
          >
            <span className="text-3xl">🖼</span>
            <p className="text-ink-faint text-sm font-semibold">Image block — upload coming soon</p>
          </div>
        )}
        {isOwner && (
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => onDelete(block.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#FF2D78', border: '2px solid #B5005A' }}
          >✕</button>
        )}
      </div>
    )
  }

  // ── Text blocks: heading / paragraph / quote ─────────────────────────────

  const isHeading = block.blockType === 'heading'
  const isQuote   = block.blockType === 'quote'
  const showAI    = isOwner && focused && !isHeading

  return (
    <div className="group relative">

      {/* ── AI toolbar — stays mounted while focused, buttons use onMouseDown to prevent blur ── */}
      <div className={cn(
        'flex items-center gap-1 mb-2 flex-wrap transition-all duration-150',
        showAI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none h-0 mb-0 overflow-hidden'
      )}>
        <button
          onMouseDown={e => e.preventDefault()} // prevents textarea blur
          onClick={handleGrammar}
          disabled={!!aiLoading}
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 transition-all"
          style={{ background: '#F5F0E8', border: '1.5px solid #1C1917', boxShadow: '1.5px 1.5px 0 #1C1917' }}
        >
          {aiLoading === 'grammar' ? '…fixing' : '✓ Grammar'}
        </button>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={handleTone}
          disabled={!!aiLoading}
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 transition-all"
          style={{ background: '#F5F0E8', border: '1.5px solid #1C1917', boxShadow: '1.5px 1.5px 0 #1C1917' }}
        >
          {aiLoading === 'tone' ? '…polishing' : '✨ Polish tone'}
        </button>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={handleSuggestions}
          disabled={!!aiLoading}
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 transition-all"
          style={{ background: '#F5F0E8', border: '1.5px solid #1C1917', boxShadow: '1.5px 1.5px 0 #1C1917' }}
        >
          {aiLoading === 'suggest' ? '…thinking' : '💡 Ideas'}
        </button>
        {!saved && !aiLoading && (
          <span className="text-[9px] text-ink-faint ml-1">saving…</span>
        )}
        {saved && focused && (
          <span className="text-[9px] text-sage ml-1">✓ saved</span>
        )}
      </div>

      {/* ── Writing suggestions panel ── */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-3 p-3" style={{ background: '#FFFBF5', border: '2px solid #FFAA00', boxShadow: '3px 3px 0 #B57500' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-golden mb-2">Continue the story:</p>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  className="text-sm text-ink text-left hover:text-sunrise transition-colors w-full leading-snug"
                  onClick={() => applySuggestion(s)}
                >
                  <span className="text-golden font-bold mr-1">{i + 1}.</span>{s}
                </button>
              </li>
            ))}
          </ul>
          <button
            onMouseDown={e => e.preventDefault()}
            className="text-xs text-ink-faint mt-2 hover:text-ink"
            onClick={() => setSuggestions(null)}
          >Dismiss</button>
        </div>
      )}

      {/* ── Editable or read-only ── */}
      {isOwner ? (
        <div className={cn('relative', isQuote && 'pl-4')}>
          {isQuote && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: '#FF5C1A' }} />}
          {aiLoading && (
            <div className="absolute inset-0 bg-canvas/60 flex items-center justify-center z-10 pointer-events-none">
              <span className="text-xs text-ink-soft animate-pulse">AI is writing…</span>
            </div>
          )}
          <textarea
            ref={textRef}
            value={content}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            placeholder={
              isHeading   ? 'Section heading…'
              : isQuote   ? '"A meaningful quote or memory…"'
              : 'Write here… click to start'
            }
            spellCheck
            rows={1}
            className={cn(
              'w-full resize-none outline-none bg-transparent block leading-relaxed',
              'transition-colors placeholder:text-ink-faint/50',
              isHeading
                ? 'font-serif text-2xl font-bold text-ink border-b-2 border-ink/20 pb-2 mb-2'
                : isQuote
                ? 'text-lg italic text-ink/80 pl-3'
                : 'text-base text-ink',
              focused && !isHeading && 'bg-amber-50/30 px-2 py-1 -mx-2'
            )}
            style={{ minHeight: isHeading ? '2.5rem' : '1.5rem', overflowY: 'hidden' }}
          />
        </div>
      ) : (
        /* Read-only view */
        <div>
          {isHeading && <h3 className="font-serif text-2xl font-bold text-ink border-b-2 border-ink/20 pb-2 mb-2">{content}</h3>}
          {isQuote && (
            <blockquote className="border-l-4 border-sunrise pl-4 my-4">
              <p className="text-lg italic text-ink/80">{content}</p>
            </blockquote>
          )}
          {!isHeading && !isQuote && (
            <p className="text-base text-ink leading-relaxed whitespace-pre-wrap">{content || <span className="text-ink-faint/40 italic">Empty paragraph</span>}</p>
          )}
        </div>
      )}

      {/* ── Add-block & delete row ── */}
      {isOwner && (
        <div className={cn(
          'flex items-center gap-1 mt-1 transition-opacity duration-100',
          focused ? 'opacity-70' : 'opacity-0 group-hover:opacity-60'
        )}>
          <span className="text-[10px] text-ink-faint">＋</span>
          {(['paragraph','heading','quote','image','divider'] as JournalBlockType[]).map(t => (
            <button
              key={t}
              onMouseDown={e => e.preventDefault()}
              onClick={() => onAddAfter(t)}
              title={t}
              className="text-[10px] px-1.5 py-0.5 text-ink-faint hover:text-ink font-semibold border border-transparent hover:border-ink/20 transition-all rounded"
            >
              {t === 'paragraph' ? '¶' : t === 'heading' ? 'H' : t === 'quote' ? '❝' : t === 'image' ? '🖼' : '—'}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => onDelete(block.id)}
            className="text-[10px] text-ink-faint hover:text-blossom transition-colors px-1"
          >✕</button>
        </div>
      )}
    </div>
  )
}

// ── Chapter Panel ─────────────────────────────────────────────────────────────

function ChapterPanel({
  chapter,
  subjectName,
  isOwner,
  onChapterUpdate,
  onChapterDelete,
}: {
  chapter: JournalChapter
  subjectName: string
  isOwner: boolean
  onChapterUpdate: (id: string, patch: Partial<JournalChapter>) => void
  onChapterDelete: (id: string) => void
}) {
  const [blocks, setBlocks]         = useState<JournalBlock[]>(chapter.blocks)
  const [chapterTitle, setChapterTitle] = useState(chapter.title)
  const [editingTitle, setEditingTitle] = useState(false)

  const saveTitle = async (val: string) => {
    setEditingTitle(false)
    if (val.trim() === chapter.title || !val.trim()) return
    await updateChapterTitle(chapter.id, val.trim())
    onChapterUpdate(chapter.id, { title: val.trim() })
  }

  const handleUpdateBlock = useCallback((id: string, patch: Partial<JournalBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }, [])

  const handleDeleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    await deleteBlock(id)
  }

  const handleAddAfter = async (afterBlockId: string, type: JournalBlockType) => {
    const idx = blocks.findIndex(b => b.id === afterBlockId)
    // Reorder: give new block an order that slots it after the current one
    const prev = blocks[idx]
    const next = blocks[idx + 1]
    const newOrder = prev && next
      ? (prev.blockOrder + next.blockOrder) / 2
      : prev ? prev.blockOrder + 1 : 0

    const result = await createBlock(chapter.id, type, newOrder)
    if (result.id) {
      const newBlock: JournalBlock = {
        id: result.id,
        chapterId: chapter.id,
        blockOrder: newOrder,
        blockType: type,
        content: '',
        style: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setBlocks(prev => {
        const copy = [...prev]
        copy.splice(idx + 1, 0, newBlock)
        return copy
      })
    }
  }

  const handleAddFirst = async (type: JournalBlockType = 'paragraph') => {
    const result = await createBlock(chapter.id, type, 0)
    if (result.id) {
      const newBlock: JournalBlock = {
        id: result.id,
        chapterId: chapter.id,
        blockOrder: 0,
        blockType: type,
        content: '',
        style: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setBlocks(prev => [newBlock, ...prev])
    }
  }

  return (
    <section className="mb-16">
      {/* Chapter title */}
      <div className="group flex items-center gap-3 mb-8">
        {isOwner && editingTitle ? (
          <input
            autoFocus
            value={chapterTitle}
            onChange={e => setChapterTitle(e.target.value)}
            onBlur={e => saveTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(chapterTitle) }}
            className="font-serif text-xl font-bold text-ink bg-transparent outline-none border-b-2 border-sunrise flex-1"
          />
        ) : (
          <h2
            className={cn(
              'font-serif text-xl font-bold text-ink flex-1',
              isOwner && 'cursor-pointer hover:text-sunrise transition-colors'
            )}
            title={isOwner ? 'Click to rename' : undefined}
            onClick={() => isOwner && setEditingTitle(true)}
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

      {/* Blocks */}
      <div className="space-y-5 max-w-[680px]">
        {blocks.length === 0 && isOwner ? (
          <div className="py-10 text-center">
            <p className="text-ink-faint text-sm mb-4">This chapter is empty. Start writing.</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {(['paragraph','heading','quote'] as JournalBlockType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleAddFirst(t)}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5"
                  style={{ background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }}
                >
                  {t === 'paragraph' ? '+ Paragraph' : t === 'heading' ? '+ Heading' : '+ Quote'}
                </button>
              ))}
            </div>
          </div>
        ) : (
          blocks.map(b => (
            <BlockEditor
              key={b.id}
              block={b}
              subjectName={subjectName}
              isOwner={isOwner}
              onUpdate={handleUpdateBlock}
              onDelete={handleDeleteBlock}
              onAddAfter={(type) => handleAddAfter(b.id, type)}
            />
          ))
        )}
      </div>
    </section>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function JournalEditor({ journal, isOwner }: Props) {
  const [chapters, setChapters]     = useState<JournalChapter[]>(journal.chapters)
  const [addingChapter, setAddingChapter] = useState(false)

  const handleAddChapter = async () => {
    setAddingChapter(true)
    const num = chapters.length + 1
    const result = await createChapter(journal.id, `Chapter ${num}`, num)
    if (result.id) {
      setChapters(prev => [...prev, {
        id: result.id!,
        journalId: journal.id,
        chapterNumber: num,
        title: `Chapter ${num}`,
        createdAt: new Date().toISOString(),
        blocks: [],
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
    <div className="max-w-4xl mx-auto px-6 py-10 flex gap-8">

      {/* Sidebar: chapter list */}
      <aside className="hidden lg:block w-48 flex-shrink-0">
        <div className="sticky top-24">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-ink-soft mb-3">Chapters</p>
          <nav className="space-y-1">
            {chapters.map(c => (
              <a
                key={c.id}
                href={`#chapter-${c.id}`}
                className="block text-sm text-ink-soft hover:text-ink transition-colors py-0.5 truncate"
              >
                {c.title}
              </a>
            ))}
          </nav>
          {isOwner && (
            <button
              onClick={handleAddChapter}
              disabled={addingChapter}
              className="mt-4 w-full text-xs font-bold px-2 py-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }}
            >
              {addingChapter ? '…' : '+ Add chapter'}
            </button>
          )}
        </div>
      </aside>

      {/* Book content */}
      <main className="flex-1 min-w-0">

        {/* Cover strip */}
        <div
          className="mb-10 px-6 py-8 relative overflow-hidden"
          style={{
            background: journal.coverColor,
            border: '3px solid rgba(0,0,0,0.4)',
            boxShadow: '6px 6px 0 rgba(0,0,0,0.35)',
          }}
        >
          <div className="absolute left-0 inset-y-0 w-4" style={{ background: 'rgba(0,0,0,0.2)' }} />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 1px, transparent 0, transparent 50%)',
            backgroundSize: '10px 10px',
          }} />
          <div className="relative pl-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
              Life Stories · {journal.year}
            </p>
            <h1 className="font-serif text-3xl font-bold text-white mb-1">{journal.title}</h1>
            <p className="text-white/70 text-sm">The story of {journal.subjectName}</p>
          </div>
        </div>

        {/* Chapters */}
        {chapters.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl font-bold text-ink mb-2">Begin the story</p>
            <p className="text-ink-soft text-sm mb-8 max-w-sm mx-auto">
              Add your first chapter and start writing {journal.subjectName}&apos;s life story.
            </p>
            {isOwner && (
              <button
                onClick={handleAddChapter}
                disabled={addingChapter}
                className="btn btn-primary btn-md"
              >
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

            {/* Mobile: add chapter at bottom */}
            {isOwner && (
              <div className="pt-8 border-t-[2px] border-ink/10">
                <button
                  onClick={handleAddChapter}
                  disabled={addingChapter}
                  className="btn btn-ghost btn-md"
                  style={{ border: '2px dashed #D4CCC4' }}
                >
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
