'use client'

import { useState, useRef, useCallback } from 'react'
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

// ── Block Renderer ────────────────────────────────────────────────────────────

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
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(block.content)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const save = useCallback(async (val: string) => {
    if (val === block.content) return
    onUpdate(block.id, { content: val })
    await updateBlock(block.id, { content: val })
  }, [block.id, block.content, onUpdate])

  const handleBlur = () => {
    setEditing(false)
    save(content)
  }

  // Auto-grow textarea
  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  // AI: grammar correct
  const handleGrammar = async () => {
    if (!content.trim()) return
    setAiLoading('grammar')
    const { result } = await aiGrammarCorrect(content)
    if (result) { setContent(result); await save(result) }
    setAiLoading(null)
  }

  // AI: tone polish
  const handleTone = async () => {
    if (!content.trim()) return
    setAiLoading('tone')
    const { result } = await aiTonePolish(content, subjectName)
    if (result) { setContent(result); await save(result) }
    setAiLoading(null)
  }

  // AI: writing suggestions
  const handleSuggestions = async () => {
    setAiLoading('suggest')
    const { suggestions: s } = await aiWritingSuggestions(content, subjectName)
    setSuggestions(s ?? [])
    setAiLoading(null)
  }

  if (block.blockType === 'divider') {
    return (
      <div className="group relative my-6 flex items-center gap-3">
        <div className="flex-1 h-[2px] bg-ink/20" />
        <span className="text-ink-faint text-lg">✦</span>
        <div className="flex-1 h-[2px] bg-ink/20" />
        {isOwner && (
          <button
            onClick={() => onDelete(block.id)}
            className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-faint hover:text-blossom text-xs px-1"
          >
            ✕
          </button>
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
            className="w-full h-48 flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ background: '#F5F0E8', border: '3px dashed #D4CCC4', boxShadow: '3px 3px 0 #D4CCC4' }}
          >
            <span className="text-3xl">🖼</span>
            <p className="text-ink-faint text-sm font-semibold">Image block</p>
            <p className="text-ink-faint text-xs">(Upload coming soon)</p>
          </div>
        )}
        {isOwner && (
          <button
            onClick={() => onDelete(block.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#FF2D78', border: '2px solid #B5005A' }}
          >
            ✕
          </button>
        )}
      </div>
    )
  }

  // Text blocks: heading, paragraph, quote
  const isHeading = block.blockType === 'heading'
  const isQuote = block.blockType === 'quote'

  return (
    <div className="group relative">
      {/* AI toolbar — appears on focus */}
      {isOwner && editing && !isHeading && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <button
            onClick={handleGrammar}
            disabled={!!aiLoading}
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: '#F5F0E8', border: '1.5px solid #1C1917', boxShadow: '1.5px 1.5px 0 #1C1917' }}
          >
            {aiLoading === 'grammar' ? '…' : '✓ Grammar'}
          </button>
          <button
            onClick={handleTone}
            disabled={!!aiLoading}
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: '#F5F0E8', border: '1.5px solid #1C1917', boxShadow: '1.5px 1.5px 0 #1C1917' }}
          >
            {aiLoading === 'tone' ? '…' : '✨ Polish tone'}
          </button>
          <button
            onClick={handleSuggestions}
            disabled={!!aiLoading}
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: '#F5F0E8', border: '1.5px solid #1C1917', boxShadow: '1.5px 1.5px 0 #1C1917' }}
          >
            {aiLoading === 'suggest' ? '…' : '💡 Suggestions'}
          </button>
          {!isOwner && null}
        </div>
      )}

      {/* Suggestions panel */}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-3 p-3" style={{ background: '#FFFBF5', border: '2px solid #FFAA00', boxShadow: '3px 3px 0 #B57500' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-golden mb-2">Writing prompts to continue:</p>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  className="text-sm text-ink text-left hover:text-sunrise transition-colors w-full"
                  onClick={() => {
                    const appended = content ? content + ' ' + s : s
                    setContent(appended)
                    setSuggestions(null)
                    setTimeout(() => textRef.current?.focus(), 0)
                  }}
                >
                  <span className="text-golden font-bold">{i + 1}.</span> {s}
                </button>
              </li>
            ))}
          </ul>
          <button className="text-xs text-ink-faint mt-2 hover:text-ink" onClick={() => setSuggestions(null)}>Dismiss</button>
        </div>
      )}

      {isOwner ? (
        <div className="relative">
          {isQuote && (
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: '#FF5C1A' }} />
          )}
          <textarea
            ref={textRef}
            value={content}
            onChange={e => { setContent(e.target.value); autoGrow(e.target) }}
            onFocus={() => setEditing(true)}
            onBlur={handleBlur}
            placeholder={
              isHeading ? 'Section heading…'
              : isQuote ? '"A meaningful quote or memory…"'
              : 'Write here…'
            }
            className={cn(
              'w-full resize-none outline-none bg-transparent transition-colors',
              isHeading ? 'font-serif text-2xl font-bold text-ink border-b-2 border-ink/20 pb-2 mb-4' : '',
              isQuote ? 'text-lg italic text-ink/80 pl-5' : '',
              !isHeading && !isQuote ? 'text-base text-ink leading-relaxed' : '',
              editing ? 'bg-golden/5 px-2 py-1' : ''
            )}
            rows={1}
            style={{ minHeight: isHeading ? '2.5rem' : '1.5rem' }}
            onInput={e => autoGrow(e.currentTarget)}
          />
        </div>
      ) : (
        /* Read-only */
        <div>
          {isHeading && <h3 className="font-serif text-2xl font-bold text-ink border-b-2 border-ink/20 pb-2 mb-4">{content}</h3>}
          {isQuote && (
            <blockquote className="border-l-4 border-sunrise pl-5 my-4">
              <p className="text-lg italic text-ink/80">{content}</p>
            </blockquote>
          )}
          {!isHeading && !isQuote && (
            <p className="text-base text-ink leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
        </div>
      )}

      {/* Delete / add-after controls */}
      {isOwner && (
        <div className={cn('flex items-center gap-1 mt-1', editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity')}>
          <span className="text-[10px] text-ink-faint">Add:</span>
          {(['paragraph','heading','quote','image','divider'] as JournalBlockType[]).map(t => (
            <button
              key={t}
              onClick={() => onAddAfter(t)}
              className="text-[10px] px-1.5 py-0.5 text-ink-faint hover:text-ink font-semibold border border-transparent hover:border-ink/20 transition-all"
            >
              {t === 'paragraph' ? '¶' : t === 'heading' ? 'H' : t === 'quote' ? '❝' : t === 'image' ? '🖼' : '—'}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => onDelete(block.id)} className="text-[10px] text-ink-faint hover:text-blossom transition-colors px-1">✕</button>
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
  onChapterUpdate: (id: string, patch: Partial<JournalChapter & { blocks: JournalBlock[] }>) => void
  onChapterDelete: (id: string) => void
}) {
  const [blocks, setBlocks] = useState<JournalBlock[]>(chapter.blocks)
  const [chapterTitle, setChapterTitle] = useState(chapter.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleSaving, setTitleSaving] = useState(false)

  const saveTitle = async () => {
    setEditingTitle(false)
    if (chapterTitle === chapter.title) return
    setTitleSaving(true)
    await updateChapterTitle(chapter.id, chapterTitle)
    onChapterUpdate(chapter.id, { title: chapterTitle })
    setTitleSaving(false)
  }

  const handleUpdateBlock = (id: string, patch: Partial<JournalBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  const handleDeleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    await deleteBlock(id)
  }

  const handleAddAfter = async (afterBlockId: string, type: JournalBlockType) => {
    const idx = blocks.findIndex(b => b.id === afterBlockId)
    const newOrder = idx >= 0 ? blocks[idx]!.blockOrder + 0.5 : blocks.length
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
        const next = [...prev]
        next.splice(idx + 1, 0, newBlock)
        return next
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
            onBlur={saveTitle}
            onKeyDown={e => e.key === 'Enter' && saveTitle()}
            className="font-serif text-xl font-bold text-ink bg-transparent outline-none border-b-2 border-sunrise flex-1"
          />
        ) : (
          <h2
            className={cn('font-serif text-xl font-bold text-ink flex-1', isOwner && 'cursor-pointer hover:text-sunrise transition-colors')}
            onClick={() => isOwner && setEditingTitle(true)}
          >
            {chapterTitle}
            {titleSaving && <span className="text-xs text-ink-faint ml-2 font-sans font-normal">saving…</span>}
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
      <div className="space-y-4 max-w-[680px]">
        {blocks.length === 0 && isOwner ? (
          <div className="py-8 text-center">
            <p className="text-ink-faint text-sm mb-4">This chapter is empty. Start writing.</p>
            <div className="flex justify-center gap-2">
              {(['paragraph','heading','quote'] as JournalBlockType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleAddFirst(t)}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                  style={{ background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }}
                >
                  {t === 'paragraph' ? '+ Text' : t === 'heading' ? '+ Heading' : '+ Quote'}
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
  const [chapters, setChapters] = useState<JournalChapter[]>(journal.chapters)
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

  const handleChapterUpdate = (id: string, patch: Partial<JournalChapter>) => {
    setChapters(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  const handleChapterDelete = async (id: string) => {
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
              className="mt-4 w-full text-xs font-bold px-2 py-2 transition-all"
              style={{ background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }}
            >
              {addingChapter ? '…' : '+ Add chapter'}
            </button>
          )}
        </div>
      </aside>

      {/* Book content */}
      <main className="flex-1 min-w-0">
        {/* Book-style cover strip */}
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
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Life Stories · {journal.year}</p>
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
