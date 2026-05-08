'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { upsertChapterContent, aiWritingSuggestions, aiTonePolish } from '@/lib/actions/journals'

// ── Types ─────────────────────────────────────────────────────────────────────

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
    matches.forEach(m => found.push({ type: rule.type, issue: rule.issue, matched: m[0], fix: (rule as { fix: string | null }).fix ?? null }))
  })
  return found
}

// ── Tone transforms ───────────────────────────────────────────────────────────

const TONE_TRANSFORMS: Record<ToneKey, (t: string) => string> = {
  warm: t => t
    .replace(/\bI remember\b/gi, 'I still cherish the memory of')
    .replace(/\bIt was\b/gi, 'It was such a beautiful moment when')
    .replace(/\bgood\b/gi, 'wonderful').replace(/\bnice\b/gi, 'lovely'),
  vivid: t => t
    .replace(/\bwent\b/gi, 'journeyed').replace(/\bsaw\b/gi, 'witnessed')
    .replace(/\bbig\b/gi, 'vast').replace(/\bgood\b/gi, 'extraordinary'),
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
  { key: 'storytelling', icon: '📖', label: 'Story',        desc: 'Narrative flow' },
]

// ── Context suggestions ───────────────────────────────────────────────────────

const ALL_SUGGESTIONS = [
  { icon: '📅', test: /\b(yesterday|today|last|ago|year|month|day|week|when I)\b/i,
    text: 'Add when this happened',        insert: 'It was on [date / season] when ' },
  { icon: '👤', test: /\b(we|he|she|they|family|friend|mum|dad|mom|grandma|grandpa)\b/i,
    text: 'Name who was there',            insert: '[Name] was with me, and ' },
  { icon: '🌍', test: /\b(at the|in the|went to|visited|was in)\b/i,
    text: 'Describe where you were',       insert: 'We were at [place], where ' },
  { icon: '😊', test: /\b(felt|feeling|happy|sad|proud|scared|laugh|cried|moved)\b/i,
    text: 'Capture how it felt',           insert: 'I felt [emotion] because ' },
  { icon: '🔊', test: /\b(sound|smell|taste|hear|noise|scent)\b/i,
    text: 'Add a sound, smell or taste',   insert: 'I still remember the [sound / smell] of ' },
  { icon: '💬', test: /\b(said|told|asked|replied|whispered)\b/i,
    text: 'Add something that was said',   insert: 'Someone said, "[quote]" ' },
  { icon: '🔗', test: /\b(remind|similar|like the time|remember when)\b/i,
    text: 'Connect it to another memory',  insert: 'This reminds me of the time when ' },
]

function getSmartSuggestions(text: string) {
  return ALL_SUGGESTIONS.filter(s => !s.test.test(text)).slice(0, 5)
}

// ── Color palette ─────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  { label: 'Ink',    value: '#1C1917' },
  { label: 'Warm',   value: '#78716C' },
  { label: 'Orange', value: '#FF5C1A' },
  { label: 'Red',    value: '#DC2626' },
  { label: 'Sage',   value: '#48A14B' },
  { label: 'Sky',    value: '#2E90FA' },
  { label: 'Purple', value: '#7C3AED' },
  { label: 'Sepia',  value: '#92400E' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#FEF08A' },
  { label: 'Orange', value: '#FED7AA' },
  { label: 'Pink',   value: '#FBCFE8' },
  { label: 'Mint',   value: '#BBF7D0' },
]

// ── Toolbar button ─────────────────────────────────────────────────────────────

function ToolBtn({
  onClick, active = false, title, children, className,
}: {
  onClick: () => void; active?: boolean; title?: string; children: React.ReactNode; className?: string
}) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn(
        'h-7 min-w-[28px] px-1.5 flex items-center justify-center text-xs font-bold transition-all',
        active
          ? 'text-white'
          : 'text-ink hover:bg-ink/10',
        className,
      )}
      style={active ? { background: '#1C1917' } : undefined}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  chapterId: string
  subjectName: string
  isOwner: boolean
  initialHtml: string
}

export function RichChapterEditor({ chapterId, subjectName, isOwner, initialHtml }: Props) {
  const [focused,       setFocused]       = useState(false)
  const [saved,         setSaved]         = useState(true)
  const [activePanel,   setActivePanel]   = useState<Panel>(null)
  const [showColorPick, setShowColorPick] = useState(false)
  const [showHlPick,    setShowHlPick]    = useState(false)
  const [wordCount,     setWordCount]     = useState(0)

  // AI panels
  const [grammarItems,   setGrammarItems]   = useState<ReturnType<typeof runLocalGrammar>>([])
  const [selectedTone,   setSelectedTone]   = useState<ToneKey | null>(null)
  const [tonePreview,    setTonePreview]    = useState('')
  const [toneApplying,   setToneApplying]   = useState(false)
  const [suggestions,    setSuggestions]    = useState<typeof ALL_SUGGESTIONS>([])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Tiptap editor ────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: true,
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: 'Write here… start with a heading or just begin your story.',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialHtml || '',
    editable: isOwner,
    immediatelyRender: false,
    onFocus: () => setFocused(true),
    onBlur:  () => setFocused(false),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate: ({ editor: e }: { editor: any }) => {
      const html = e.getHTML()
      const text = e.getText()
      const words = text.trim().split(/\s+/).filter(Boolean).length
      setWordCount(words)

      // Live panel updates
      if (activePanel === 'grammar')     setGrammarItems(runLocalGrammar(text))
      if (activePanel === 'suggestions') setSuggestions(getSmartSuggestions(text))

      scheduleSave(html)
    },
  })

  // Update wordCount on mount from initial content
  useEffect(() => {
    if (!editor) return
    const text = editor.getText()
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length)
  }, [editor])

  // ── Save ─────────────────────────────────────────────────────────────────

  const scheduleSave = useCallback((html: string) => {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await upsertChapterContent(chapterId, html)
      setSaved(true)
    }, 900)
  }, [chapterId])

  // ── Panel toggle ──────────────────────────────────────────────────────────

  const togglePanel = (panel: Panel) => {
    const next = activePanel === panel ? null : panel
    setActivePanel(next)
    setShowColorPick(false)
    setShowHlPick(false)
    if (!editor) return
    const text = editor.getText()
    if (next === 'grammar')     setGrammarItems(runLocalGrammar(text))
    if (next === 'suggestions') setSuggestions(getSmartSuggestions(text))
    if (next === 'tone')        { setSelectedTone(null); setTonePreview('') }
  }

  // ── Grammar ───────────────────────────────────────────────────────────────

  const applyGrammarFix = (matched: string, fix: string) => {
    if (!editor) return
    const text = editor.getText()
    const updated = text.replace(matched, fix)
    // Replace plain text in editor by setting content preserving headings is tricky;
    // simplest correct approach: use replaceAll on the HTML
    const html = editor.getHTML().replace(matched, fix)
    editor.commands.setContent(html)
    setGrammarItems(runLocalGrammar(updated))
    scheduleSave(html)
  }

  // ── Tone ──────────────────────────────────────────────────────────────────

  const handleSelectTone = (key: ToneKey) => {
    setSelectedTone(key)
    if (!editor) return
    const text = editor.getText()
    setTonePreview(text.trim() ? TONE_TRANSFORMS[key](text) : 'Write some text first.')
  }

  const handleApplyTone = async () => {
    if (!selectedTone || !editor) return
    const text = editor.getText()
    if (!text.trim()) return

    setToneApplying(true)
    const localPreview = TONE_TRANSFORMS[selectedTone](text)
    const previewHtml = `<p>${localPreview.replace(/\n/g, '</p><p>')}</p>`
    editor.commands.setContent(previewHtml)
    scheduleSave(previewHtml)

    const subjectDesc = `${subjectName} (${selectedTone} tone)`
    const { result } = await aiTonePolish(localPreview, subjectDesc)
    if (result) {
      const resultHtml = `<p>${result.replace(/\n/g, '</p><p>')}</p>`
      editor.commands.setContent(resultHtml)
      scheduleSave(resultHtml)
    }

    setToneApplying(false)
    setSelectedTone(null)
    setTonePreview('')
    setActivePanel(null)
  }

  // ── Insert suggestion ─────────────────────────────────────────────────────

  const insertSuggestion = (snippet: string) => {
    editor?.chain().focus().insertContent(snippet).run()
  }

  // ── Heading label ─────────────────────────────────────────────────────────

  const headingLabel = () => {
    if (!editor) return 'Normal'
    if (editor.isActive('heading', { level: 1 })) return 'Title'
    if (editor.isActive('heading', { level: 2 })) return 'Heading'
    if (editor.isActive('heading', { level: 3 })) return 'Subheading'
    return 'Normal'
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showToolbar = focused || activePanel !== null

  return (
    <div className="relative">

      {/* ── Editor styles (scoped) ── */}
      <style>{`
        .rich-chapter-editor .ProseMirror {
          outline: none;
          min-height: 120px;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 1rem;
          line-height: 1.85;
          color: #1C1917;
        }
        .rich-chapter-editor .ProseMirror p { margin: 0.6rem 0; }
        .rich-chapter-editor .ProseMirror h1 {
          font-size: 2rem; font-weight: 700; margin: 1.5rem 0 0.5rem;
          line-height: 1.2; color: #1C1917;
        }
        .rich-chapter-editor .ProseMirror h2 {
          font-size: 1.4rem; font-weight: 700; margin: 1.25rem 0 0.4rem;
          border-bottom: 1.5px solid #D4CCC4; padding-bottom: 0.2rem; color: #1C1917;
        }
        .rich-chapter-editor .ProseMirror h3 {
          font-size: 1.1rem; font-weight: 700; margin: 1rem 0 0.3rem;
          text-transform: uppercase; letter-spacing: 0.06em; color: #78716C;
        }
        .rich-chapter-editor .ProseMirror blockquote {
          border-left: 4px solid #FF5C1A; padding-left: 1rem;
          margin: 1.25rem 0; font-style: italic; color: #555;
        }
        .rich-chapter-editor .ProseMirror hr {
          border: none; border-top: 2px solid #D4CCC4; margin: 1.5rem 0;
        }
        .rich-chapter-editor .ProseMirror ul { list-style: disc; padding-left: 1.5rem; margin: 0.6rem 0; }
        .rich-chapter-editor .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; margin: 0.6rem 0; }
        .rich-chapter-editor .ProseMirror strong { font-weight: 700; }
        .rich-chapter-editor .ProseMirror em { font-style: italic; }
        .rich-chapter-editor .ProseMirror u  { text-decoration: underline; }
        .rich-chapter-editor .ProseMirror mark { border-radius: 2px; padding: 0 2px; }
        .rich-chapter-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #aaa; content: attr(data-placeholder); float: left;
          height: 0; pointer-events: none; font-style: italic;
        }
        .rich-chapter-editor .ProseMirror *::selection { background: rgba(255, 92, 26, 0.15); }
      `}</style>

      {/* ── Toolbar ── */}
      <div
        className={cn(
          'transition-all duration-150 overflow-hidden',
          showToolbar ? 'mb-0' : 'opacity-0 pointer-events-none h-0'
        )}
      >
        {editor && isOwner && (
          <div
            className="flex flex-wrap items-center gap-0.5 px-2 py-1"
            style={{ background: '#F0EBE0', border: '2px solid #1C1917', borderBottom: 'none' }}
          >
            {/* Text type dropdown */}
            <div className="relative">
              <select
                value={
                  editor.isActive('heading', { level: 1 }) ? '1' :
                  editor.isActive('heading', { level: 2 }) ? '2' :
                  editor.isActive('heading', { level: 3 }) ? '3' : '0'
                }
                onChange={e => {
                  const val = e.target.value
                  if (val === '0') editor.chain().focus().setParagraph().run()
                  else editor.chain().focus().setHeading({ level: parseInt(val) as 1|2|3 }).run()
                }}
                className="h-7 px-2 pr-5 text-xs font-bold bg-transparent border border-ink/20 text-ink cursor-pointer appearance-none"
                style={{ fontFamily: 'inherit' }}
              >
                <option value="0">¶ Normal</option>
                <option value="1">H1 Title</option>
                <option value="2">H2 Heading</option>
                <option value="3">H3 Subheading</option>
              </select>
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[9px]">▾</span>
            </div>

            <div className="w-px h-5 bg-ink/20 mx-1" />

            {/* Bold / Italic / Underline */}
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
              <b>B</b>
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
              <i>I</i>
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (⌘U)">
              <u>U</u>
            </ToolBtn>

            <div className="w-px h-5 bg-ink/20 mx-1" />

            {/* Alignment */}
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
              ←
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align centre">
              ≡
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
              →
            </ToolBtn>

            <div className="w-px h-5 bg-ink/20 mx-1" />

            {/* Blockquote */}
            <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
              ❝
            </ToolBtn>

            {/* Divider */}
            <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Insert divider">
              —
            </ToolBtn>

            <div className="w-px h-5 bg-ink/20 mx-1" />

            {/* Text color picker */}
            <div className="relative">
              <ToolBtn
                onClick={() => { setShowColorPick(v => !v); setShowHlPick(false) }}
                title="Text colour"
                active={showColorPick}
              >
                <span className="flex flex-col items-center gap-[1px]">
                  <span className="text-[10px] font-bold leading-none">A</span>
                  <span className="w-4 h-[3px] rounded-sm" style={{ background: editor.getAttributes('textStyle').color || '#1C1917' }} />
                </span>
              </ToolBtn>
              {showColorPick && (
                <div className="absolute top-full left-0 mt-1 z-50 p-2 grid grid-cols-4 gap-1"
                  style={{ background: '#FAFAF8', border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917' }}>
                  {TEXT_COLORS.map(c => (
                    <button key={c.value} title={c.label}
                      onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c.value).run(); setShowColorPick(false) }}
                      className="w-6 h-6 rounded-sm border-2 transition-transform hover:scale-110"
                      style={{ background: c.value, borderColor: editor.getAttributes('textStyle').color === c.value ? '#FF5C1A' : 'transparent' }}
                    />
                  ))}
                  <button title="Remove colour"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColorPick(false) }}
                    className="w-6 h-6 rounded-sm border-2 border-ink/20 flex items-center justify-center text-[8px] text-ink-faint hover:border-ink/50">
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Highlight picker */}
            <div className="relative">
              <ToolBtn
                onClick={() => { setShowHlPick(v => !v); setShowColorPick(false) }}
                title="Highlight"
                active={showHlPick || editor.isActive('highlight')}
              >
                <span className="text-[10px]" style={{ background: '#FEF08A', padding: '0 2px' }}>ab</span>
              </ToolBtn>
              {showHlPick && (
                <div className="absolute top-full left-0 mt-1 z-50 p-2 flex gap-1"
                  style={{ background: '#FAFAF8', border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917' }}>
                  {HIGHLIGHT_COLORS.map(c => (
                    <button key={c.value} title={c.label}
                      onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: c.value }).run(); setShowHlPick(false) }}
                      className="w-6 h-6 rounded-sm border-2 transition-transform hover:scale-110"
                      style={{ background: c.value, borderColor: 'transparent' }}
                    />
                  ))}
                  <button title="Remove highlight"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHlPick(false) }}
                    className="w-6 h-6 rounded-sm border-2 border-ink/20 flex items-center justify-center text-[8px] text-ink-faint hover:border-ink/50">
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Spacer + meta */}
            <div className="flex-1" />
            {wordCount > 0 && (
              <span className="text-[9px] text-ink-faint">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            )}
            {!saved && <span className="text-[9px] text-ink-faint ml-2">saving…</span>}
            {saved && focused && <span className="text-[9px] text-emerald-600 ml-2">✓ saved</span>}
          </div>
        )}
      </div>

      {/* ── Editor area ── */}
      <div
        className={cn(
          'rich-chapter-editor transition-all',
          showToolbar && isOwner ? 'border-2 border-t-0 border-ink px-4 py-3' : 'py-1',
        )}
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── AI panel buttons ── */}
      {isOwner && (
        <div className={cn(
          'flex items-center gap-1.5 mt-2 flex-wrap transition-all duration-150',
          showToolbar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none h-0 overflow-hidden mt-0'
        )}>
          {(['grammar','tone','suggestions'] as Panel[]).map(p => (
            <button key={p!}
              onMouseDown={e => e.preventDefault()}
              onClick={() => togglePanel(p)}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all"
              style={activePanel === p
                ? { background: '#1C1917', border: '2px solid #000', color: 'white', boxShadow: 'none', transform: 'translateY(1px)' }
                : { background: '#F5F0E8', border: '2px solid #1C1917', color: '#1C1917', boxShadow: '2px 2px 0 #1C1917' }
              }
            >
              {p === 'grammar' ? '✓ Grammar' : p === 'tone' ? '✨ Tone' : '💡 Ideas'}
            </button>
          ))}
        </div>
      )}

      {/* ── Grammar panel ── */}
      {activePanel === 'grammar' && (
        <div className="mt-3" style={{ border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917', background: '#FAFAF8' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink"
            style={{ background: '#F0EBE0', borderBottom: '1.5px solid #1C1917' }}>✓ Grammar check</div>
          <div className="px-3 py-2">
            {!editor?.getText().trim() ? (
              <p className="text-xs text-ink-faint py-2 text-center">Start writing to check grammar</p>
            ) : grammarItems.length === 0 ? (
              <p className="text-xs text-emerald-600 font-semibold py-2 text-center">✓ No issues found — looking good!</p>
            ) : (
              <ul className="space-y-2 py-1">
                {grammarItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                      style={{ background: item.type === 'error' ? '#e53e3e' : item.type === 'warn' ? '#d69e2e' : '#2E90FA' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink">&ldquo;{item.matched}&rdquo;</p>
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
        <div className="mt-3" style={{ border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917', background: '#FAFAF8' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink"
            style={{ background: '#F0EBE0', borderBottom: '1.5px solid #1C1917' }}>✨ Polish tone</div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {TONES.map(t => (
                <button key={t.key}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelectTone(t.key)}
                  className="p-2 text-left transition-all"
                  style={selectedTone === t.key
                    ? { background: '#1C1917', border: '2px solid #000', color: 'white' }
                    : { background: '#F5F0E8', border: '1.5px solid #D4CCC4', boxShadow: '2px 2px 0 #D4CCC4' }
                  }
                >
                  <span className="text-base block mb-0.5">{t.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">{t.label}</span>
                  <span className={cn('text-[9px] block', selectedTone === t.key ? 'opacity-70' : 'text-ink-soft')}>{t.desc}</span>
                </button>
              ))}
            </div>
            {tonePreview && (
              <div className="mb-3 p-2.5 text-xs text-ink leading-relaxed"
                style={{ background: '#F0EBE0', border: '1px solid #D4CCC4' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-faint mb-1.5">Preview</p>
                {tonePreview}
              </div>
            )}
            {selectedTone && editor?.getText().trim() && (
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
        <div className="mt-3" style={{ border: '2px solid #1C1917', boxShadow: '3px 3px 0 #1C1917', background: '#FAFAF8' }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink"
            style={{ background: '#F0EBE0', borderBottom: '1.5px solid #1C1917' }}>💡 Story ideas</div>
          <div className="px-3 py-2">
            {!editor?.getText().trim() ? (
              <p className="text-xs text-ink-faint py-2 text-center">Write a few words to get suggestions</p>
            ) : suggestions.length === 0 ? (
              <p className="text-xs text-ink-soft py-2 text-center">Great — your text covers the key story elements!</p>
            ) : (
              <ul className="divide-y divide-ink/5">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 py-2.5">
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink leading-snug">{s.text}</p>
                      <button onMouseDown={e => e.preventDefault()}
                        onClick={() => insertSuggestion(s.insert)}
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
    </div>
  )
}
