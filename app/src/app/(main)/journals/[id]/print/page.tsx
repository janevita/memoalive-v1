import { notFound } from 'next/navigation'
import { getJournal } from '@/lib/data/journals'
import { PrintButton } from './PrintButton'
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap');
        @media print {
          .no-print { display: none !important; }
          nav, header { display: none !important; }
          body { font-size: 11pt; }
          .print-page-break { page-break-before: always; }
        }
      `}</style>

      {/* Sticky print toolbar — client component handles the onClick */}
      <PrintButton title={journal.title} />

      {/* Book content */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '5rem 2.5rem 4rem', fontFamily: 'Georgia, serif' }}>

        {/* Cover page */}
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          marginBottom: '4rem',
          background: journal.coverColor,
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
          <div key={chapter.id} className={ci > 0 ? 'print-page-break' : ''}>
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
    </>
  )
}
