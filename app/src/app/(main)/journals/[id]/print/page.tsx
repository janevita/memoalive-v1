import { notFound } from 'next/navigation'
import { getJournal } from '@/lib/data/journals'
import type { JournalBlock } from '@/lib/types'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const journal = await getJournal(params.id)
  return { title: `Print – ${journal?.title ?? 'Journal'}` }
}

function renderBlock(block: JournalBlock) {
  switch (block.blockType) {
    case 'heading':
      return (
        <h2 key={block.id} style={{
          fontFamily: 'Georgia, serif',
          fontSize: '1.4rem',
          fontWeight: 700,
          margin: '2rem 0 0.5rem',
          borderBottom: '1px solid #ccc',
          paddingBottom: '0.25rem',
          color: '#1C1917',
        }}>
          {block.content}
        </h2>
      )
    case 'quote':
      return (
        <blockquote key={block.id} style={{
          borderLeft: '4px solid #FF5C1A',
          paddingLeft: '1rem',
          margin: '1.5rem 0',
          fontStyle: 'italic',
          color: '#555',
          fontSize: '1.05rem',
        }}>
          {block.content}
        </blockquote>
      )
    case 'divider':
      return (
        <div key={block.id} style={{ textAlign: 'center', margin: '2rem 0', color: '#ccc', fontSize: '1.2rem' }}>
          ✦
        </div>
      )
    case 'image':
      return block.imageUrl ? (
        <figure key={block.id} style={{ margin: '2rem 0', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.imageUrl}
            alt={block.content || ''}
            style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', border: '1px solid #ddd' }}
          />
          {block.content && (
            <figcaption style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.5rem', fontStyle: 'italic' }}>
              {block.content}
            </figcaption>
          )}
        </figure>
      ) : null
    default:
      return block.content ? (
        <p key={block.id} style={{
          margin: '0.8rem 0',
          lineHeight: 1.85,
          fontSize: '1rem',
          color: '#2c2c2c',
          whiteSpace: 'pre-wrap',
        }}>
          {block.content}
        </p>
      ) : null
  }
}

export default async function JournalPrintPage({ params }: { params: { id: string } }) {
  const journal = await getJournal(params.id)
  if (!journal) notFound()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{journal.title}</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', Georgia, sans-serif; background: #fff; color: #1C1917; }
          @media print {
            .no-print { display: none !important; }
            body { font-size: 11pt; }
            .page-break { page-break-before: always; }
          }
        `}</style>
      </head>
      <body>
        {/* Print button — hidden in print */}
        <div className="no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          background: '#1C1917', padding: '0.75rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: 'white', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 600 }}>
            📖 {journal.title}
          </span>
          <button
            onClick={() => window.print()}
            style={{
              background: '#FF5C1A', color: 'white', border: '2px solid #B53C00',
              boxShadow: '2px 2px 0 #B53C00', padding: '0.4rem 1.2rem',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            🖨 Print / Save PDF
          </button>
        </div>

        {/* Book content */}
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '5rem 2.5rem 4rem' }}>

          {/* Cover page */}
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            marginBottom: '4rem',
            background: journal.coverColor,
            borderRadius: 0,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: '16px',
              background: 'rgba(0,0,0,0.2)',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Life Stories · {journal.year}
            </p>
            <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '2.5rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem', lineHeight: 1.2 }}>
              {journal.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem' }}>
              The story of {journal.subjectName}
            </p>
          </div>

          {/* Chapters */}
          {journal.chapters.map((chapter, ci) => (
            <div key={chapter.id} className={ci > 0 ? 'page-break' : ''}>
              {/* Chapter heading */}
              <div style={{ marginBottom: '2rem', borderBottom: '3px solid #1C1917', paddingBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#FF5C1A', marginBottom: '0.25rem' }}>
                  Chapter {chapter.chapterNumber}
                </p>
                <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.8rem', fontWeight: 700, color: '#1C1917' }}>
                  {chapter.title}
                </h1>
              </div>

              {/* Blocks */}
              {chapter.blocks.map(b => renderBlock(b))}

              {ci < journal.chapters.length - 1 && (
                <div style={{ textAlign: 'center', marginTop: '3rem', color: '#ccc' }}>
                  ∗ ∗ ∗
                </div>
              )}
            </div>
          ))}

          {/* Colophon */}
          <div style={{
            marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid #eee',
            textAlign: 'center', color: '#aaa', fontSize: '0.75rem',
          }}>
            <p>Created with Memoalive · {journal.year}</p>
            <p style={{ marginTop: '0.25rem' }}>A story of {journal.subjectName}</p>
          </div>
        </div>
      </body>
    </html>
  )
}
