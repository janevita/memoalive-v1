'use client'

export function PrintButton({ title }: { title: string }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
        background: '#1C1917', padding: '0.75rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
      className="no-print"
    >
      <span style={{ color: 'white', fontFamily: 'var(--font-sans, Inter, sans-serif)', fontSize: '0.9rem', fontWeight: 600 }}>
        📖 {title}
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
  )
}
