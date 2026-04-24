'use client'

/**
 * ScrapbookPrintView
 *
 * Renders all scrapbook pages at native 1200×848 canvas resolution and
 * automatically opens the browser print dialog. Each page maps to one
 * printed sheet (landscape, no margins).
 *
 * Intended to be used from the /scrapbooks/[id]/print route.
 */

import { useEffect, CSSProperties } from 'react'
import { ScrapbookWithPages, CanvasElement } from '@/lib/types'
import { SCRAPBOOK_TEMPLATES, DEFAULT_TEMPLATE_ID } from '@/lib/constants'

const CW = 1200
const CH = 848

// ── Frame styles (mirrors PHOTO_FRAMES in ScrapbookCanvas) ────────────────────

const FRAME_WRAPPERS: Record<string, CSSProperties> = {
  none:     { position: 'absolute', inset: 0 },
  polaroid: { position: 'absolute', inset: 0, background: '#FEFEFE', padding: '9px 9px 34px', boxShadow: '0 2px 6px rgba(0,0,0,0.14), 2px 6px 20px rgba(0,0,0,0.18)' },
  vintage:  { position: 'absolute', inset: 0, background: '#EAD9B5', padding: '11px', boxShadow: 'inset 0 0 0 1px rgba(100,70,20,0.18), 1px 4px 18px rgba(0,0,0,0.22)' },
  shadow:   { position: 'absolute', inset: 0, boxShadow: '6px 12px 36px rgba(0,0,0,0.45), 2px 4px 8px rgba(0,0,0,0.22)' },
  tape:     { position: 'absolute', inset: 0, boxShadow: '1px 3px 10px rgba(0,0,0,0.18)' },
  stamp:    { position: 'absolute', inset: 0, background: '#FEFEFE', padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', outline: '3px dashed rgba(60,40,10,0.28)', outlineOffset: '-6px' },
  dark:     { position: 'absolute', inset: 0, background: '#1C1208', padding: '10px', boxShadow: 'inset 0 0 0 2px #6B5030, inset 0 0 0 4px #2C1E0A, 2px 5px 20px rgba(0,0,0,0.4)' },
}

function frameWrapper(frameStyle?: string): CSSProperties {
  return FRAME_WRAPPERS[frameStyle ?? 'none'] ?? FRAME_WRAPPERS.none!
}

// ── Ornaments ─────────────────────────────────────────────────────────────────

function VintageCorners({ color = '#9B7A3A' }: { color?: string }) {
  const mount: CSSProperties = { position: 'absolute', width: 22, height: 22, pointerEvents: 'none' }
  const arm: CSSProperties   = { position: 'absolute', background: color }
  const hBar: CSSProperties  = { ...arm, height: 2, width: '100%', top: 0, left: 0 }
  const vBar: CSSProperties  = { ...arm, width: 2, height: '100%', top: 0, left: 0 }
  const vBarR: CSSProperties = { ...arm, width: 2, height: '100%', top: 0, right: 0 }
  const hBarB: CSSProperties = { ...arm, height: 2, width: '100%', bottom: 0, left: 0 }
  return (
    <>
      <div style={{ ...mount, top: 5, left: 5 }}><div style={hBar} /><div style={vBar} /></div>
      <div style={{ ...mount, top: 5, right: 5, transform: 'scaleX(-1)' }}><div style={hBar} /><div style={vBar} /></div>
      <div style={{ ...mount, bottom: 5, left: 5, transform: 'scaleY(-1)' }}><div style={hBarB} /><div style={vBar} /></div>
      <div style={{ ...mount, bottom: 5, right: 5, transform: 'scale(-1)' }}><div style={hBarB} /><div style={vBarR} /></div>
    </>
  )
}

function TapeStrips() {
  const tape: CSSProperties = {
    position: 'absolute', left: '50%',
    width: 56, height: 16,
    background: 'rgba(255, 242, 160, 0.72)',
    boxShadow: 'inset 0 0 0 1px rgba(180,160,0,0.18)',
    borderRadius: 2,
    pointerEvents: 'none',
  }
  return (
    <>
      <div style={{ ...tape, top: -8,  transform: 'translateX(-50%) rotate(-4deg)' }} />
      <div style={{ ...tape, bottom: -8, transform: 'translateX(-50%) rotate(3deg)' }} />
    </>
  )
}

// ── Element renderer ──────────────────────────────────────────────────────────

function PrintElement({ el }: { el: CanvasElement }) {
  const base: CSSProperties = {
    position:  'absolute',
    left:      el.x,
    top:       el.y,
    width:     el.width,
    height:    el.height,
    transform: `rotate(${el.rotation}deg)`,
    zIndex:    el.zIndex,
  }

  if (el.type === 'photo') {
    const fw = frameWrapper(el.style.frameStyle)
    return (
      <div style={base}>
        <div style={fw}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={el.content}
            alt=""
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {el.style.frameStyle === 'vintage' && <VintageCorners />}
          {el.style.frameStyle === 'tape'    && <TapeStrips />}
        </div>
      </div>
    )
  }

  if (el.type === 'text') {
    const s = el.style
    return (
      <div style={{
        ...base,
        fontSize:        s.fontSize,
        color:           s.color,
        fontFamily:      s.fontFamily,
        fontWeight:      s.fontWeight,
        fontStyle:       s.fontStyle,
        textAlign:       s.textAlign,
        backgroundColor: s.backgroundColor,
        opacity:         s.opacity,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  s.textAlign === 'center' ? 'center' : s.textAlign === 'right' ? 'flex-end' : 'flex-start',
        whiteSpace:      'pre-wrap',
        wordBreak:       'break-word',
        padding:         '4px 8px',
        boxSizing:       'border-box',
      }}>
        {el.content}
      </div>
    )
  }

  if (el.type === 'sticker') {
    const isImage = el.content.startsWith('http') || el.content.startsWith('data:') || el.content.startsWith('blob:')
    return isImage ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={el.content} alt="" style={{ ...base, objectFit: 'contain' }} />
    ) : (
      <div style={{
        ...base,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       el.height * 0.7,
        lineHeight:     1,
      }}>
        {el.content}
      </div>
    )
  }

  return null
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScrapbookPrintView({ scrapbook }: { scrapbook: ScrapbookWithPages }) {
  const templateId = (scrapbook.template ?? DEFAULT_TEMPLATE_ID)
  const tpl = SCRAPBOOK_TEMPLATES.find(t => t.id === templateId) ?? SCRAPBOOK_TEMPLATES[0]!

  const pageBgStyle: CSSProperties = tpl.pageBg.startsWith('#') || tpl.pageBg.startsWith('rgb')
    ? { background: tpl.pageBg }
    : { backgroundImage: tpl.pageBg }

  const sortedPages = [...scrapbook.pages].sort((a, b) => a.pageNumber - b.pageNumber)

  // Auto-trigger print once images have had a moment to load
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {/* Print-specific CSS injected into <head> via a style tag */}
      <style>{`
        @page {
          size: ${CW}px ${CH}px;
          margin: 0;
        }
        @media print {
          html, body { margin: 0; padding: 0; }
          .print-toolbar { display: none !important; }
          .print-page { page-break-after: always; break-after: page; }
          .print-page:last-child { page-break-after: auto; break-after: auto; }
        }
        @media screen {
          body { background: #e5e7eb; }
          .print-page { margin: 24px auto; box-shadow: 0 4px 24px rgba(0,0,0,0.18); }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="print-toolbar" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'white', borderBottom: '1px solid #e5e7eb',
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        gap: 16, fontFamily: 'system-ui, sans-serif',
      }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>🖨 {scrapbook.title}</span>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{sortedPages.length} page{sortedPages.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => window.print()}
          style={{
            marginLeft: 'auto', background: '#F9761C', color: 'white',
            border: 'none', borderRadius: 999, padding: '7px 20px',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          Print
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: 'transparent', color: '#6b7280',
            border: '1px solid #d1d5db', borderRadius: 999, padding: '7px 16px',
            fontWeight: 500, fontSize: 13, cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      {/* Pages */}
      {sortedPages.map(page => {
        const elements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex)
        return (
          <div
            key={page.id}
            className="print-page"
            style={{
              position: 'relative',
              width: CW,
              height: CH,
              overflow: 'hidden',
              ...pageBgStyle,
            }}
          >
            {elements.map(el => (
              <PrintElement key={el.id} el={el} />
            ))}
          </div>
        )
      })}
    </>
  )
}
