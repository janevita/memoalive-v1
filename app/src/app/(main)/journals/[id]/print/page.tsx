import { notFound } from 'next/navigation'
import { getJournal } from '@/lib/data/journals'
import { PrintButton } from './PrintButton'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const journal = await getJournal(params.id)
  return { title: `Print – ${journal?.title ?? 'Journal'}` }
}

export default async function JournalPrintPage({ params }: { params: { id: string } }) {
  const journal = await getJournal(params.id)
  if (!journal) notFound()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap');

        /* ── Rich-text chapter content styles ── */
        .chapter-content h1 {
          font-family: Lora, Georgia, serif;
          font-size: 1.8rem; font-weight: 700; margin: 1.5rem 0 0.5rem;
          line-height: 1.2; color: #1C1917;
        }
        .chapter-content h2 {
          font-family: Lora, Georgia, serif;
          font-size: 1.3rem; font-weight: 700; margin: 1.2rem 0 0.4rem;
          border-bottom: 1px solid #ccc; padding-bottom: 0.2rem; color: #1C1917;
        }
        .chapter-content h3 {
          font-size: 1rem; font-weight: 700; margin: 1rem 0 0.3rem;
          text-transform: uppercase; letter-spacing: 0.06em; color: #78716C;
        }
        .chapter-content p {
          margin: 0.7rem 0; line-height: 1.85; font-size: 1rem; color: #2c2c2c;
        }
        .chapter-content blockquote {
          border-left: 4px solid #FF5C1A; padding-left: 1rem;
          margin: 1.25rem 0; font-style: italic; color: #555; font-size: 1.05rem;
        }
        .chapter-content hr {
          border: none; border-top: 1px solid #ddd; margin: 1.5rem 0;
        }
        .chapter-content strong { font-weight: 700; }
        .chapter-content em     { font-style: italic; }
        .chapter-content u      { text-decoration: underline; }
        .chapter-content ul     { list-style: disc; padding-left: 1.5rem; margin: 0.6rem 0; }
        .chapter-content ol     { list-style: decimal; padding-left: 1.5rem; margin: 0.6rem 0; }
        .chapter-content mark   { border-radius: 2px; padding: 0 2px; }

        @media print {
          .no-print { display: none !important; }
          nav, header { display: none !important; }
          body { font-size: 11pt; }
          .print-page-break { page-break-before: always; }
        }
      `}</style>

      {/* Sticky print toolbar */}
      <PrintButton title={journal.title} />

      {/* Book content */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '5rem 2.5rem 4rem', fontFamily: 'Georgia, serif' }}>

        {/* Cover page */}
        <div style={{
          textAlign: 'center', padding: '4rem 2rem', marginBottom: '4rem',
          background: journal.coverColor, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '16px', background: 'rgba(0,0,0,0.2)' }} />
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
        {journal.chapters.map((chapter, ci) => {
          // Canonical block: single rich HTML block from new editor,
          // or empty string for brand-new chapters
          const richHtml = chapter.blocks[0]?.content ?? ''
          const isRichHtml = richHtml.trimStart().startsWith('<')

          return (
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

              {/* Chapter body */}
              {richHtml ? (
                isRichHtml ? (
                  <div
                    className="chapter-content"
                    dangerouslySetInnerHTML={{ __html: richHtml }}
                  />
                ) : (
                  <p style={{ margin: '0.8rem 0', lineHeight: 1.85, fontSize: '1rem', color: '#2c2c2c', whiteSpace: 'pre-wrap' }}>
                    {richHtml}
                  </p>
                )
              ) : (
                <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  This chapter has no content yet.
                </p>
              )}

              {ci < journal.chapters.length - 1 && (
                <div style={{ textAlign: 'center', marginTop: '3rem', color: '#ccc' }}>∗ ∗ ∗</div>
              )}
            </div>
          )
        })}

        {/* Colophon */}
        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid #eee', textAlign: 'center', color: '#aaa', fontSize: '0.75rem' }}>
          <p>Created with Memoalive · {journal.year}</p>
          <p style={{ marginTop: '0.25rem' }}>A story of {journal.subjectName}</p>
        </div>
      </div>
    </>
  )
}
