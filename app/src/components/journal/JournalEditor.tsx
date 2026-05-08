'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { JournalWithChapters, JournalChapter, JournalBlock, JournalBlockType } from '@/lib/types'
import {
  createChapter, updateChapterTitle, deleteChapter,
  createBlock, updateBlock, deleteBlock,
  aiWritingSuggestions, aiTonePolish,
} from '@/lib/actions/journals'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props { journal: JournalWithChapters; isOwner: boolean }
type Panel = 'grammar' | 'tone' | 'suggestions' | null
type ToneKey = 'warm' | 'vivid' | 'simple' | 'storytelling'

// ── Local grammar rules ───────────────────────────────────────────────────────

const GRAMMAR_RULES = [
  { pattern: /\bi\b/g,                         type: 'error',  issue: '"i" not capitalised',             fix: 'I' },
  { pattern: /\balot\b/gi,                     type: 'error',  issue: '"alot" is not a word',            fix: 'a lot' },
  { pattern: /\brecieve\b/gi,                  type: 'error',  issue: 'Spelling: "recieve"',             fix: 'receive' },
  { pattern: /\bdefinately\b/gi,               type: 'error',  issue: 'Spelling: "definately"',          fix: 'definitely' },
  { pattern: /\boccured\b/gi,                  type: 'error',  issue: 'Spelling: "occured"',             fix: 'occurred' },
  { pattern: /\bseperately\b/gi,               type: 'error',  issue: 'Spelling: "seperately"',         fix: 'separately' },
  { pattern: /\b(dont|wont|cant|isnt|arent|wasnt|werent|didnt|doesnt)\b/gi,
                                                type: 'error',  issue: 'Missing apostrophe',              fix: null },
  { pattern: /\b(\w+) \1\b/gi,                 type: 'warn',   issue: 'Repeated word',                  fix: null },
  { pattern: /\.\s+[a-z]/g,                    type: 'warn',   issue: 'Lowercase after full stop',      fix: null },
  { pattern: /\b(very|really)\s+(good|bad|big|small|nice|great)\b/gi,
                                                type: 'style',  issue: 'Weak intensifier phrase',        fix: null },
  { pattern: /\b(thing|things|stuff)\b/gi,      type: 'style',  issue: 'Vague word — be more specific', fix: null },
] as const

function runLocalGrammar(text: string) {
  const found: { type: string; issue: string; matched: string; fix: string | null }[] = []
  GRAMMAR_RULES.forEach(rule => {
    const matches = [...text.matchAll(rule.pattern as RegExp)].slice(0, 2)
    matches.forEach(m => found.push({ type: rule.type, issue: rule.issue, matched: m[0], fix: rule.fix ?? null }))
  })
  return found
}

// ── Tone preview transforms (instant, no API) ─────────────────────────────────

const TONE_TRANSFORMS: Record<ToneKey, (t: string) => string> = {
  warm: t => t
    .replace(/\bI remember\b/gi, 'I still cherish the memory of')
    .replace(/\bIt was\b/gi, 'It was such a beautiful moment when')
    .replace(/\bgood\b/gi, 'wonderful').replace(/\bnice\b/gi, 'lovely'),
  vivid: t => t
    .replace(/\bwent\b/gi, 'journeyed').replace(/\bsaw\b/gi, 'witnessed')
    .replace(/\bbig\b/gi, 'vast').replace(/\bgood\b/gi, 'extraordinary')
    .replace(/\bnice\b/gi, 'breathtaking'),
  simple: t => t
    .replace(/\butilise\b/gi, 'use').replace(/\bcommence\b/gi, 'start')
    .replace(/\battempt\b/gi, 'try').replace(/\bwonderful\b/gi, 'great'),
  storytelling: t => {
    const sentences = t.split(/(?<=[.!?])\s+/)
    if (sentences.length < 2) return 'It all started when ' + t.charAt(0).toLowerCase() + t.slice(1)
    return sentences.map((s, i) => {
      if (i === 0) return 'It all started when ' + s.charAt(0).toLowerCase() + s.slice(1)
      if (i === sentences.length - 1) return 'And in that moment, ' + s.charAt(0).toLowerCase() + s.slice(1)
      return s
    }).join(' ')
  },
}

const TONES: { key: ToneKey; icon: string; label: string; desc: string }[] = [
  { key: 'warm',         icon: '🤍', label: 'Warm',         desc: 'Heartfelt & personal' },
  { key: 'vivid',        icon: '🌈', label: 'Vivid',        desc: 'Rich & descriptive' },
  { key: 'simple',       icon: '💬', label: 'Simple',       desc: 'Clear & easy to read' },
  { key: 'storytelling', icon: '📖', label: 'Storytelling', desc: 'Narrative flow' },
]

// ── Context-aware suggestions ─────────────────────────────────────────────────

const ALL_SUGGESTIONS = [
  { icon: '📅', test: /\b(yesterday|today|last|ago|year|month|day|week|when I)\b/i,
    text: 'Add when this happened',       insert: ' It was on [date / season] when ' },
  { icon: '👤', test: /\b(we|he|she|they|family|friend|mum|dad|mom|grandma|grandpa)\b/i,
    text: 'Name who was there',           insert: ' [Name] was with me, and ' },
  { icon: '🌍', test: /\b(at the|in the|went to|visited|was in)\b/i,
    text: 'Describe where you were',      insert: ' We were at [place], where ' },
  { icon: '😊', test: /\b(felt|feeling|happy|sad|proud|scared|laugh|cried|moved)\b/i,
    text: 'Capture how it felt',          insert: ' I felt [emotion] because ' },
  { icon: '🔊', test: /\b(sound|smell|taste|hear|noise|scent)\b/i,
    text: 'Add a sound, smell or taste',  insert: ' I still remember the [sound / smell] of ' },
  { icon: '📸', test: /\b(photo|picture|image|photograph)\b/i,
    text: 'Reference a photo or keepsake', insert: " There's a photo of this moment that shows " },
  { icon: '💬', test: /\b(said|told|asked|replied|whispered)\b/i,
    text: 'Add something that was said',  insert: ' Someone said, "[quote]" ' },
  { icon: '🔗', test: /\b(remind|similar|like the time|remember when)\b/i,
    text: 'Connect it to another memory', insert: ' This reminds me of the time when ' },
]

function getSmartSuggestions(text: string) {
  return ALL_SUGGESTIONS
    .filter(s => !s.test.test(text))
    .slice(0, 5)
}

// ── Auto-grow textarea ────────────────────────────────────────────────────────

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function wordCount(text: string) {
  const w = text.trim().split(/\s+/).filter(Boolean).length
  return w === 1 ? '1 word' : `${w} words`
}

// ── Block Editor ──────────────────────────────────────────────────────────────

function BlockEditor({
  block, subjectName, isOwner, onUpdate, onDelete, onAddAfter,
}: {
  block: JournalBlock
  subjectName: string
  isOwner: boolean
  onUpdate: (id: string, patch: Partial<JournalBlock>) => void
  onDelete: (id: string) => void
  onAddAfter: (type: JournalBlockType) => void
}) {
  const [content, setContent]         = useState(block.content)
  const [focused, setFocused]         = useState(false)
  const [saved, setSaved]             = useState(true)
  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [aiLoading, setAiLoading]     = useState(false)

  // Grammar state
  const [grammarItems, setGrammarItems] = useState<ReturnType<typeof runLocalGrammar>>([])

  // Tone state
  const [selectedTone, setSelectedTone]   = useState<ToneKey | null>(null)
  const [tonePreview, setTonePreview]     = useState('')
  const [toneApplying, setToneApplying]   = useState(false)

  // Suggestions state
  const [suggestions, setSuggestions] = useState<typeof ALL_SUGGESTIONS>([])

  const textRef   = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { autoGrow(textRef.current) }, [content])

  // ── Save ──────────────────────────────────────────────────────────────────

  const scheduleSave = useCallback((val: string) => {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      onUpdate(block.id, { content: val })
      await updateBlock(block.id, { content: val })
      setSaved(true)
    }, 800)
  }, [block.id, onUpdate])

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
    // Live grammar on panel open
    if (activePanel === 'grammar') setGrammarItems(runLocalGrammar(val))
    if (activePanel === 'suggestions') setSuggestions(getSmartSuggestions(val))
  }

  // ── Panel toggle ──────────────────────────────────────────────────────────

  const togglePanel = (panel: Panel) => {
    const next = activePanel === panel ? null : panel
    setActivePanel(next)
    if (next === 'grammar')     setGrammarItems(runLocalGrammar(content))
    if (next === 'suggestions') setSuggestions(getSmartSuggestions(content))
    if (next === 'tone')        { setSelectedTone(null); setTonePreview('') }
  }

  // ── Grammar fix ───────────────────────────────────────────────────────────

  const applyGrammarFix = (matched: string, fix: string) => {
    const updated = content.replace(matched, fix)
    setContent(updated)
    scheduleSave(updated)
    setGrammarItems(runLocalGrammar(updated))
    setTimeout(() => autoGrow(textRef.current), 0)
  }

  // ── Tone ──────────────────────────────────────────────────────────────────

  const handleSelectTone = (key: ToneKey) => {
    setSelectedTone(key)
    setTonePreview(content.trim() ? TONE_TRANSFORMS[key](content) : 'Write some text first to preview the tone.')
  }

  const handleApplyTone = async () => {
    if (!selectedTone || !content.trim()) return
    setToneApplying(true)
    // First apply local preview immediately for responsiveness, then AI-polish
    const localPreview = TONE_TRANSFORMS[selectedTone](content)
    setContent(localPreview)
    autoGrow(textRef.current)
    // Then try AI for a better rewrite — send the already-transformed text
    const subjectDesc = `${subjectName} (${selectedTone} tone)`
    const { result } = await aiTonePolish(localPreview, subjectDesc)
    if (result) {
      setContent(result)
      onUpdate(block.id, { content: result })
      await updateBlock(block.id, { content: result })
      setSaved(true)
      setTimeout(() => autoGrow(textRef.current), 0)
    } else {
      scheduleSave(localPreview)
    }
    setToneApplying(false)
    setSelectedTone(null)
    setTonePreview('')
    setActivePanel(null)
  }

  // ── Insert suggestion at cursor ───────────────────────────────────────────

  const insertAtCursor = (snippet: string) => {
    const ta = textRef.current
    if (!ta) return
    const start = ta.selectionStart ?? content.length
    const end   = ta.selectionEnd   ?? content.length
    const updated = content.slice(0, start) + snippet + content.slice(end)
    setContent(updated)
    scheduleSave(updated)
    setTimeout(() => {
      autoGrow(ta)
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + snippet.length
    }, 0)
  }

  // ── Wrap selection with markers (bold/italic via markdown syntax) ──────────

  const wrapSelection = (open: string, close: string) => {
    const ta = textRef.current
    if (!ta) return
    const start    = ta.selectionStart ?? content.length
    const end      = ta.selectionEnd   ?? content.length
    const selected = content.slice(start, end)
    const updated  = content.slice(0, start) + open + selected + close + content.slice(end)
    setContent(updated)
    scheduleSave(updated)
    setTimeout(() => {
      autoGrow(ta)
      ta.focus()
      // Re-select the wrapped text
      ta.selectionStart = start + open.length
      ta.selectionEnd   = start + open.length + selected.length
    }, 0)
  }

  // ── Special blocks ────────────────────────────────────────────────────────

  if (block.blockType === 'divider') {
    return (
      <div className="group relative my-6 flex items-center gap-3">
        <div className="flex-1 h-[2px] bg-ink/20" />
        <span className="text-ink-faint text-lg">✦</span>
        <div className="flex-1 h-[2px] bg-ink/20" />
        {isOwner && (
          <button onMouseDown={e => e.preventDefault()} onClick={() => onDelete(block.id)}
            className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-ink-faint hover:text-blossom text-xs px-1">
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
            <img src={block.imageUrl} alt={block.content || ''} className="w-full max-h-[500px] object-contain"
              style={{ border: '3px solid #1C1917', boxShadow: '4px 4px 0 #1C1917' }} />
            {block.content && <figcaption className="text-center text-xs text-ink-soft italic mt-2">{block.content}</figcaption>}
          </figure>
        ) : (
          <div className="w-full h-48 flex flex-col items-center justify-center gap-2"
            style={{ background: '#F5F0E8', border: '3px dashed #D4CCC4' }}>
            <span className="text-3xl">🖼</span>
            <p className="text-ink-faint text-sm font-semibold">Image block — upload coming soon</p>
          </div>
        )}
        {isOwner && (
          <button onMouseDown={e => e.preventDefault()} onClick={() => onDelete(block.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#FF2D78', border: '2px solid #B5005A' }}>✕</button>
        )}
      </div>
    )
  }

  // ── Text blocks ───────────────────────────────────────────────────────────

  const isHeading = block.blockType === 'heading'
  const isQuote   = block.blockType === 'quote'

  return (
    <div className="group relative">

      {/* ── AI Panel buttons — always mounted, visible when focused ── */}
      {isOwner && (
        <div className={cn(
          'flex items-center gap-1.5 mb-2 flex-wrap transition-all duration-150',
          (focused || activePanel) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none h-0 mb-0 overflow-hidden'
        )}>
          {!isHeading && (
            <>
              {(['grammar','tone','suggestions'] as Panel[]).filter(Boolean).map(p => (
                <button key={p!}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => togglePanel(p)}
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all',
                    activePanel === p
                      ? 'text-white'
                      : 'text-ink hover:text-ink'
                  )}
                  style={activePanel === p
                    ? { background: '#1C1917', border: '2px solid #000', boxShadow: 'none', transform: 'translateY(1px)' }
                    : { background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }
                  }
                >
                  {p === 'grammar' ? '✓ Grammar' : p === 'tone' ? '✨ Tone' : '💡 Ideas'}
                </button>
              ))}
            </>
          )}
          <div className="flex-1" />
          {!isHeading && content.trim() && (
            <span className="text-[10px] text-ink-faint">{wordCount(content)}</span>
          )}
          {!saved && <span className="text-[9px] text-ink-faint ml-1">saving…</span>}
          {saved && focused && <span className="text-[9px] text-sage ml-1">✓ saved</span>}
        </div>
      )}

      {/* ── Editor area ── */}
      {isOwner ? (
        <div className="relative">
          {/* Top formatting bar (sits above the editor when focused) */}
          {focused && !isHeading && (
            <div className="flex items-center gap-0.5 px-2 py-1 mb-0"
              style={{ background: '#F0EBE0', border: '1.5px solid #1C1917', borderBottom: 'none' }}>
              <button onMouseDown={e => { e.preventDefault(); wrapSelection('**', '**') }}
                className="w-6 h-6 flex items-center justify-center text-xs font-bold text-ink hover:bg-ink/10 rounded" title="Bold"><b>B</b></button>
              <button onMouseDown={e => { e.preventDefault(); wrapSelection('_', '_') }}
                className="w-6 h-6 flex items-center justify-center text-xs italic text-ink hover:bg-ink/10 rounded" title="Italic"><i>I</i></button>
              <div className="w-px h-3 bg-ink/20 mx-1" />
              <span className="text-[10px] text-ink-faint ml-auto pr-1">
                {isQuote ? 'Quote' : 'Paragraph'}
              </span>
            </div>
          )}
          {isQuote && <div className="absolute left-0 top-0 bottom-0 w-1 z-10" style={{ background: '#FF5C1A' }} />}
          <textarea
            ref={textRef}
            value={content}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); if (!aiLoading) flushSave(content) }}
            placeholder={isHeading ? 'Section heading…' : isQuote ? '"A meaningful quote or memory…"' : 'Write here…'}
            spellCheck
            rows={1}
            className={cn(
              'w-full resize-none outline-none bg-transparent block leading-relaxed transition-colors placeholder:text-ink-faint/50',
              isHeading ? 'font-serif text-2xl font-bold text-ink border-b-2 border-ink/20 pb-2 mb-2'
                : isQuote ? 'text-lg italic text-ink/80 pl-4'
                : 'text-base text-ink',
              focused && !isHeading
                ? 'border-2 border-t-0 border-ink px-3 py-2'
                : focused && isHeading
                ? 'px-0'
                : ''
            )}
            style={{ minHeight: isHeading ? '2.5rem' : '1.5rem', overflowY: 'hidden' }}
          />
        </div>
      ) : (
        <div>
          {isHeading  && <h3 className="font-serif text-2xl font-bold text-ink border-b-2 border-ink/20 pb-2 mb-2">{content}</h3>}
          {isQuote    && <blockquote className="border-l-4 border-sunrise pl-4 my-4"><p className="text-lg italic text-ink/80">{content}</p></blockquote>}
          {!isHeading && !isQuote && <p className="text-base text-ink leading-relaxed whitespace-pre-wrap">{content}</p>}
        </div>
      )}

      {/* ── Grammar panel ── */}
      {activePanel === 'grammar' && (
        <div className="mt-2" style={{ border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917', background: '#FAFAF8' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink"
            style={{ background: '#F0EBE0', borderBottom: '1.5px solid #1C1917' }}>
            ✓ Grammar check
          </div>
          <div className="px-3 py-2">
            {!content.trim() ? (
              <p className="text-xs text-ink-faint py-2 text-center">Start typing to check grammar</p>
            ) : grammarItems.length === 0 ? (
              <p className="text-xs text-sage font-semibold py-2 text-center">✓ No issues found — looking good!</p>
            ) : (
              <ul className="space-y-2 py-1">
                {grammarItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                      style={{ background: item.type === 'error' ? '#e53e3e' : item.type === 'warn' ? '#d69e2e' : '#2E90FA' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink">"{item.matched}"</p>
                      <p className="text-xs text-ink-soft">{item.issue}</p>
                      {item.fix && (
                        <button onMouseDown={e => e.preventDefault()}
                          onClick={() => applyGrammarFix(item.matched, item.fix!)}
                          className="mt-1 text-[10px] font-bold px-2 py-0.5 text-sky hover:text-white hover:bg-sky transition-all"
                          style={{ border: '1px solid #2E90FA', borderRadius: 10 }}>
                          → {item.fix}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Tone panel ── */}
      {activePanel === 'tone' && (
        <div className="mt-2" style={{ border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917', background: '#FAFAF8' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink"
            style={{ background: '#F0EBE0', borderBottom: '1.5px solid #1C1917' }}>
            ✨ Polish tone
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {TONES.map(t => (
                <button key={t.key}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelectTone(t.key)}
                  className={cn(
                    'p-2 text-left transition-all',
                    selectedTone === t.key ? 'text-white' : 'hover:border-sky text-ink'
                  )}
                  style={selectedTone === t.key
                    ? { background: '#1C1917', border: '2px solid #000' }
                    : { background: '#F5F0E8', border: '1.5px solid #D4CCC4', boxShadow: '2px 2px 0 #D4CCC4' }
                  }
                >
                  <span className="text-base block mb-0.5">{t.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">{t.label}</span>
                  <span className="text-[9px] opacity-70 block">{t.desc}</span>
                </button>
              ))}
            </div>

            {/* Preview */}
            {tonePreview && (
              <div className="mb-3 p-2.5 text-xs text-ink leading-relaxed"
                style={{ background: '#F0EBE0', border: '1px solid #D4CCC4' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">Preview</p>
                {tonePreview}
              </div>
            )}

            {selectedTone && content.trim() && (
              <button onMouseDown={e => e.preventDefault()} onClick={handleApplyTone}
                disabled={toneApplying}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                style={{ background: '#1C1917', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}>
                {toneApplying ? 'Applying with AI…' : `Apply ${TONES.find(t => t.key === selectedTone)?.label}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Suggestions panel ── */}
      {activePanel === 'suggestions' && (
        <div className="mt-2" style={{ border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917', background: '#FAFAF8' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink"
            style={{ background: '#F0EBE0', borderBottom: '1.5px solid #1C1917' }}>
            💡 Story ideas
          </div>
          <div className="px-3 py-2">
            {!content.trim() ? (
              <p className="text-xs text-ink-faint py-2 text-center">Write a few words to get suggestions</p>
            ) : suggestions.length === 0 ? (
              <p className="text-xs text-ink-soft py-2 text-center">Great — your text already covers the key story elements!</p>
            ) : (
              <ul className="divide-y divide-ink/5">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 py-2.5">
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink leading-snug">{s.text}</p>
                      <button onMouseDown={e => e.preventDefault()}
                        onClick={() => insertAtCursor(s.insert)}
                        className="mt-1.5 text-[10px] font-bold px-2 py-0.5 text-ink hover:text-white hover:bg-ink transition-all"
                        style={{ background: '#F0EBE0', border: '1px solid #D4CCC4', borderRadius: 10 }}>
                        Insert →
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Add-block & delete row ── */}
      {isOwner && (
        <div className={cn(
          'flex items-center gap-1 mt-1.5 transition-opacity duration-100',
          focused || activePanel ? 'opacity-60' : 'opacity-0 group-hover:opacity-40'
        )}>
          <span className="text-[10px] text-ink-faint">＋</span>
          {(['paragraph','heading','quote','image','divider'] as JournalBlockType[]).map(t => (
            <button key={t} onMouseDown={e => e.preventDefault()} onClick={() => onAddAfter(t)}
              title={t}
              className="text-[10px] px-1.5 py-0.5 text-ink-faint hover:text-ink border border-transparent hover:border-ink/20 transition-all">
              {t === 'paragraph' ? '¶' : t === 'heading' ? 'H' : t === 'quote' ? '❝' : t === 'image' ? '🖼' : '—'}
            </button>
          ))}
          <div className="flex-1" />
          <button onMouseDown={e => e.preventDefault()} onClick={() => onDelete(block.id)}
            className="text-[10px] text-ink-faint hover:text-blossom transition-colors px-1">✕</button>
        </div>
      )}
    </div>
  )
}

// ── Chapter Panel ─────────────────────────────────────────────────────────────

function ChapterPanel({
  chapter, subjectName, isOwner, onChapterUpdate, onChapterDelete,
}: {
  chapter: JournalChapter; subjectName: string; isOwner: boolean
  onChapterUpdate: (id: string, patch: Partial<JournalChapter>) => void
  onChapterDelete: (id: string) => void
}) {
  const [blocks, setBlocks]             = useState<JournalBlock[]>(chapter.blocks)
  const [chapterTitle, setChapterTitle] = useState(chapter.title)
  const [editingTitle, setEditingTitle] = useState(false)

  const saveTitle = async (val: string) => {
    setEditingTitle(false)
    if (!val.trim() || val.trim() === chapter.title) return
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

  const handleAddAfter = async (afterId: string, type: JournalBlockType) => {
    const idx  = blocks.findIndex(b => b.id === afterId)
    const prev = blocks[idx]
    const next = blocks[idx + 1]
    const order = prev && next ? (prev.blockOrder + next.blockOrder) / 2 : prev ? prev.blockOrder + 1 : 0
    const result = await createBlock(chapter.id, type, order)
    if (result.id) {
      const nb: JournalBlock = { id: result.id, chapterId: chapter.id, blockOrder: order,
        blockType: type, content: '', style: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      setBlocks(prev => { const c = [...prev]; c.splice(idx + 1, 0, nb); return c })
    }
  }

  const handleAddFirst = async (type: JournalBlockType = 'paragraph') => {
    const result = await createBlock(chapter.id, type, 0)
    if (result.id) {
      const nb: JournalBlock = { id: result.id, chapterId: chapter.id, blockOrder: 0,
        blockType: type, content: '', style: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      setBlocks(prev => [nb, ...prev])
    }
  }

  return (
    <section className="mb-16">
      <div className="group flex items-center gap-3 mb-8">
        {isOwner && editingTitle ? (
          <input autoFocus value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
            onBlur={e => saveTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveTitle(chapterTitle)}
            className="font-serif text-xl font-bold text-ink bg-transparent outline-none border-b-2 border-sunrise flex-1" />
        ) : (
          <h2 onClick={() => isOwner && setEditingTitle(true)}
            className={cn('font-serif text-xl font-bold text-ink flex-1', isOwner && 'cursor-pointer hover:text-sunrise transition-colors')}
            title={isOwner ? 'Click to rename' : undefined}>
            {chapterTitle}
          </h2>
        )}
        {isOwner && (
          <button onClick={() => onChapterDelete(chapter.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-faint hover:text-blossom">
            Delete chapter
          </button>
        )}
      </div>

      <div className="space-y-6 max-w-[680px]">
        {blocks.length === 0 && isOwner ? (
          <div className="py-10 text-center">
            <p className="text-ink-faint text-sm mb-4">This chapter is empty. Start writing.</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {(['paragraph','heading','quote'] as JournalBlockType[]).map(t => (
                <button key={t} onClick={() => handleAddFirst(t)}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 transition-transform"
                  style={{ background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }}>
                  {t === 'paragraph' ? '+ Paragraph' : t === 'heading' ? '+ Heading' : '+ Quote'}
                </button>
              ))}
            </div>
          </div>
        ) : (
          blocks.map(b => (
            <BlockEditor key={b.id} block={b} subjectName={subjectName} isOwner={isOwner}
              onUpdate={handleUpdateBlock} onDelete={handleDeleteBlock}
              onAddAfter={type => handleAddAfter(b.id, type)} />
          ))
        )}
      </div>
    </section>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function JournalEditor({ journal, isOwner }: Props) {
  const [chapters, setChapters]           = useState<JournalChapter[]>(journal.chapters)
  const [addingChapter, setAddingChapter] = useState(false)

  const handleAddChapter = async () => {
    setAddingChapter(true)
    const num    = chapters.length + 1
    const result = await createChapter(journal.id, `Chapter ${num}`, num)
    if (result.id) {
      setChapters(prev => [...prev, { id: result.id!, journalId: journal.id, chapterNumber: num,
        title: `Chapter ${num}`, createdAt: new Date().toISOString(), blocks: [] }])
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

      {/* Sidebar */}
      <aside className="hidden lg:block w-48 flex-shrink-0">
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
            <button onClick={handleAddChapter} disabled={addingChapter}
              className="mt-4 w-full text-xs font-bold px-2 py-2 hover:-translate-y-0.5 transition-transform disabled:opacity-50"
              style={{ background: '#F5F0E8', border: '2px solid #1C1917', boxShadow: '2px 2px 0 #1C1917' }}>
              {addingChapter ? '…' : '+ Add chapter'}
            </button>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        {/* Cover strip */}
        <div className="mb-10 px-6 py-8 relative overflow-hidden"
          style={{ background: journal.coverColor, border: '3px solid rgba(0,0,0,0.4)', boxShadow: '6px 6px 0 rgba(0,0,0,0.35)' }}>
          <div className="absolute left-0 inset-y-0 w-4" style={{ background: 'rgba(0,0,0,0.2)' }} />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 1px,transparent 0,transparent 50%)',
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
              <button onClick={handleAddChapter} disabled={addingChapter} className="btn btn-primary btn-md">
                {addingChapter ? 'Adding…' : '+ Add first chapter'}
              </button>
            )}
          </div>
        ) : (
          <>
            {chapters.map(c => (
              <div key={c.id} id={`chapter-${c.id}`}>
                <ChapterPanel chapter={c} subjectName={journal.subjectName} isOwner={isOwner}
                  onChapterUpdate={handleChapterUpdate} onChapterDelete={handleChapterDelete} />
              </div>
            ))}
            {isOwner && (
              <div className="pt-8 border-t-[2px] border-ink/10">
                <button onClick={handleAddChapter} disabled={addingChapter} className="btn btn-ghost btn-md"
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
