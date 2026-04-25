'use client'

/**
 * TemplatePicker — grid of scrapbook template previews.
 * Renders each template as a mini visual swatch so the user can see
 * the colour palette and layout feel before choosing.
 */

import { SCRAPBOOK_TEMPLATES, type ScrapbookTemplateId } from '@/lib/constants'

interface Props {
  value:    ScrapbookTemplateId
  onChange: (id: ScrapbookTemplateId) => void
  /** When used inside a <form>, emit a hidden input with this name */
  name?: string
}

export function TemplatePicker({ value, onChange, name = 'template' }: Props) {
  return (
    <div className="space-y-2">
      {name && <input type="hidden" name={name} value={value} />}
      <div className="grid grid-cols-3 gap-3">
        {SCRAPBOOK_TEMPLATES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id as ScrapbookTemplateId)}
            className={[
              'rounded-2xl overflow-hidden border-2 transition-all text-left focus:outline-none',
              value === t.id
                ? 'border-sunrise shadow-[0_0_0_3px_rgba(255,92,26,0.2)] scale-[1.02]'
                : 'border-ink/8 hover:border-ink/20 hover:scale-[1.01]',
            ].join(' ')}
          >
            {/* Mini preview */}
            <TemplatePreview id={t.id as ScrapbookTemplateId} />

            {/* Label */}
            <div className="px-2.5 py-2 bg-canvas">
              <p className="text-[11px] font-semibold text-ink leading-tight">{t.name}</p>
              <p className="text-[9px] text-ink-faint leading-tight mt-0.5">{t.mood}</p>
            </div>

            {/* Checkmark */}
            {value === t.id && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-sunrise flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Mini template previews ─────────────────────────────────────────────────────

function TemplatePreview({ id }: { id: ScrapbookTemplateId }) {
  const base = 'w-full aspect-[4/3] relative overflow-hidden flex items-center justify-center'

  switch (id) {
    case 'vintage-kraft':
      return (
        <div className={base} style={{ background: '#C8A87A' }}>
          {/* Texture overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #8B6340 0, #8B6340 1px, transparent 0, transparent 50%)',
            backgroundSize: '8px 8px',
          }} />
          {/* Photo frames */}
          <div className="absolute" style={{ left:'8%', top:'10%', width:'40%', height:'55%', background:'#F5EDD8', border:'2px solid #D4B896', boxShadow:'2px 2px 6px rgba(0,0,0,0.3)', transform:'rotate(-3deg)' }} />
          <div className="absolute" style={{ left:'48%', top:'8%', width:'28%', height:'35%', background:'#F5EDD8', border:'2px solid #D4B896', boxShadow:'2px 2px 5px rgba(0,0,0,0.25)', transform:'rotate(2.5deg)' }} />
          <div className="absolute" style={{ left:'50%', top:'46%', width:'26%', height:'32%', background:'#F5EDD8', border:'2px solid #D4B896', transform:'rotate(-1.5deg)' }} />
          {/* Tape */}
          <div className="absolute" style={{ left:'10%', top:'7%', width:'16%', height:'7px', background:'rgba(240,200,140,0.6)', transform:'rotate(-2deg)' }} />
          <div className="absolute" style={{ left:'55%', top:'5%', width:'12%', height:'7px', background:'rgba(240,200,140,0.6)', transform:'rotate(1deg)' }} />
          {/* Title line */}
          <div className="absolute" style={{ left:'48%', bottom:'18%', right:'4%' }}>
            <div style={{ height:'1.5px', background:'#7A5C38', opacity:0.4, marginBottom:'4px' }} />
            <div style={{ fontSize:'7px', color:'#3D2B18', fontFamily:'Georgia,serif', fontStyle:'italic', opacity:0.9 }}>Our Story</div>
          </div>
        </div>
      )

    case 'pastel-dreams':
      return (
        <div className={base} style={{ background: 'linear-gradient(145deg,#FFF0F5,#F0F5FF,#F5FFF0)' }}>
          {/* Ribbon */}
          <div className="absolute top-0 inset-x-0" style={{ height:'6px', background:'linear-gradient(90deg,#F9B8D0,#D0B8F9)', opacity:0.5 }} />
          {/* Washi strips */}
          <div className="absolute" style={{ top:'12%', left:'8%', width:'22%', height:'5px', background:'linear-gradient(90deg,#F9D0E8,#E8D0F9)', opacity:0.7, transform:'rotate(-2deg)' }} />
          <div className="absolute" style={{ top:'10%', right:'8%', width:'16%', height:'5px', background:'linear-gradient(90deg,#D0EAF9,#D0F9E8)', opacity:0.7, transform:'rotate(1.5deg)' }} />
          {/* Polaroids */}
          <div className="absolute" style={{ left:'25%', top:'12%', width:'48%', height:'55%', background:'white', boxShadow:'0 3px 10px rgba(180,120,160,0.22)', transform:'rotate(-1deg)', paddingBottom:'14px' }} />
          <div className="absolute" style={{ left:'4%', top:'18%', width:'24%', height:'32%', background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.12)', transform:'rotate(-3.5deg)', paddingBottom:'10px' }} />
          <div className="absolute" style={{ right:'4%', top:'16%', width:'22%', height:'30%', background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.12)', transform:'rotate(3.5deg)', paddingBottom:'10px' }} />
          {/* Emoji stickers */}
          <div className="absolute" style={{ left:'6%', bottom:'14%', fontSize:'10px' }}>🌸</div>
          <div className="absolute" style={{ right:'6%', bottom:'14%', fontSize:'10px' }}>🌷</div>
          <div className="absolute" style={{ left:'50%', bottom:'4%', transform:'translateX(-50%)', fontSize:'8px', color:'#C07090', fontFamily:'Georgia,serif', fontStyle:'italic', whiteSpace:'nowrap' }}>Family Moments</div>
        </div>
      )

    case 'travel-adventure':
      return (
        <div className={base} style={{ background: '#1C2B3A' }}>
          {/* Grid lines */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(80,140,180,0.08) 14px, rgba(80,140,180,0.08) 15px), repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(80,140,180,0.08) 14px, rgba(80,140,180,0.08) 15px)'
          }} />
          {/* Photos */}
          <div className="absolute" style={{ left:'4%', top:'8%', width:'56%', height:'46%', background:'#2A3F55', border:'1px solid rgba(100,180,220,0.2)' }} />
          <div className="absolute" style={{ right:'4%', top:'8%', width:'34%', height:'22%', background:'#2A3F55', border:'1px solid rgba(100,180,220,0.2)' }} />
          <div className="absolute" style={{ right:'4%', top:'32%', width:'34%', height:'22%', background:'#2A3F55', border:'1px solid rgba(100,180,220,0.2)' }} />
          {/* Route line */}
          <div className="absolute" style={{ top:'56%', left:'10%', right:'10%', borderTop:'1px dashed rgba(100,200,255,0.35)' }} />
          {/* Pins */}
          <div className="absolute" style={{ left:'18%', top:'49%', fontSize:'9px' }}>📍</div>
          <div className="absolute" style={{ right:'18%', top:'49%', fontSize:'9px' }}>📍</div>
          {/* Label */}
          <div className="absolute" style={{ left:'4%', bottom:'6%', fontSize:'7px', color:'rgba(180,220,255,0.85)', fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'sans-serif' }}>WANDERLUST</div>
        </div>
      )

    case 'botanical':
      return (
        <div className={base} style={{ background: '#F2F7F0' }}>
          {/* Corner leaves */}
          <div className="absolute" style={{ left:'2%', top:'2%', fontSize:'14px' }}>🌿</div>
          <div className="absolute" style={{ right:'2%', top:'2%', fontSize:'14px', transform:'scaleX(-1)' }}>🌿</div>
          <div className="absolute" style={{ left:'2%', bottom:'2%', fontSize:'10px' }}>🍃</div>
          <div className="absolute" style={{ right:'2%', bottom:'2%', fontSize:'10px', transform:'scaleX(-1)' }}>🍃</div>
          {/* Arch */}
          <div className="absolute" style={{ left:'28%', top:'-8%', width:'44%', height:'55%', border:'1.5px solid #8AAD78', borderBottom:'none', borderRadius:'100px 100px 0 0', opacity:0.5 }} />
          {/* Round center photo */}
          <div className="absolute" style={{ left:'28%', top:'8%', width:'44%', height:'56%', background:'#E8F0E4', border:'2.5px solid #A8C898', borderRadius:'50%', boxShadow:'0 4px 16px rgba(80,120,60,0.18)' }} />
          {/* Side photos */}
          <div className="absolute" style={{ left:'4%', top:'22%', width:'22%', height:'30%', background:'#E8F0E4', border:'1.5px solid #C8DABC', borderRadius:'3px' }} />
          <div className="absolute" style={{ right:'4%', top:'22%', width:'22%', height:'30%', background:'#E8F0E4', border:'1.5px solid #C8DABC', borderRadius:'3px' }} />
          {/* Rule + title */}
          <div className="absolute" style={{ bottom:'10%', left:'50%', transform:'translateX(-50%)', textAlign:'center', whiteSpace:'nowrap' }}>
            <div style={{ height:'1px', background:'#8AAD78', width:'50px', margin:'0 auto 3px', opacity:0.5 }} />
            <div style={{ fontSize:'7px', color:'#3D5A30', fontFamily:'Georgia,serif', fontStyle:'italic' }}>In the Garden</div>
          </div>
        </div>
      )

    case 'modern-minimal':
      return (
        <div className={base} style={{ background: '#FAFAF9' }}>
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0" style={{ height:'3px', background:'#1A1A1A' }} />
          {/* Large bg number */}
          <div className="absolute" style={{ right:'-2%', top:'-4%', fontSize:'48px', fontWeight:900, color:'#EFEFEC', lineHeight:1, fontFamily:'sans-serif' }}>24</div>
          {/* Vertical rule */}
          <div className="absolute" style={{ left:'30%', top:'6%', width:'1px', height:'56%', background:'#1A1A1A' }} />
          {/* Photos */}
          <div className="absolute" style={{ left:'4%', top:'6%', width:'24%', height:'36%', background:'#E8E8E4' }} />
          <div className="absolute" style={{ left:'4%', top:'44%', width:'24%', height:'20%', background:'#E8E8E4' }} />
          <div className="absolute" style={{ left:'32%', top:'6%', width:'36%', height:'56%', background:'#E8E8E4' }} />
          <div className="absolute" style={{ right:'3%', top:'6%', width:'17%', height:'36%', background:'#E8E8E4' }} />
          {/* Bottom rule + title */}
          <div className="absolute" style={{ bottom:'10%', left:'4%', right:'4%' }}>
            <div style={{ height:'1px', background:'#1A1A1A', marginBottom:'4px' }} />
            <div style={{ fontSize:'8px', fontWeight:900, color:'#1A1A1A', textTransform:'uppercase', letterSpacing:'-0.02em', fontFamily:'sans-serif' }}>MEMORIES</div>
          </div>
        </div>
      )

    case 'golden-hour':
      return (
        <div className={base} style={{ background: 'linear-gradient(160deg,#FFF8E8,#FFF0D0,#FFE8B8)' }}>
          {/* Diagonal hatching */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(200,150,40,0.08) 5px, rgba(200,150,40,0.08) 10px)',
          }} />
          {/* Decorative circles */}
          <div className="absolute" style={{ left:'-8%', top:'-14%', width:'36%', height:'46%', border:'1.5px solid rgba(180,130,30,0.25)', borderRadius:'50%' }} />
          <div className="absolute" style={{ right:'-4%', bottom:'-8%', width:'28%', height:'36%', border:'1.5px solid rgba(180,130,30,0.25)', borderRadius:'50%' }} />
          {/* Photos */}
          <div className="absolute" style={{ left:'5%', top:'6%', width:'30%', height:'56%', background:'rgba(255,220,140,0.35)', border:'2px solid rgba(200,160,60,0.3)', boxShadow:'0 3px 10px rgba(160,100,0,0.15)', transform:'rotate(-1.5deg)' }} />
          <div className="absolute" style={{ left:'38%', top:'5%', width:'32%', height:'28%', background:'rgba(255,220,140,0.35)', border:'2px solid rgba(200,160,60,0.3)', transform:'rotate(1deg)' }} />
          <div className="absolute" style={{ left:'38%', top:'36%', width:'32%', height:'27%', background:'rgba(255,220,140,0.35)', border:'2px solid rgba(200,160,60,0.3)', transform:'rotate(-1deg)' }} />
          <div className="absolute" style={{ right:'3%', top:'5%', width:'18%', height:'26%', background:'rgba(255,220,140,0.35)', border:'2px solid rgba(200,160,60,0.3)', transform:'rotate(2.5deg)' }} />
          {/* Title */}
          <div className="absolute" style={{ right:'4%', bottom:'14%', textAlign:'right' }}>
            <div style={{ fontSize:'7px', color:'#7A4800', fontFamily:'Georgia,serif', fontStyle:'italic' }}>Golden Hour</div>
          </div>
          {/* Bottom bar */}
          <div className="absolute bottom-0 inset-x-0" style={{ height:'4px', background:'linear-gradient(90deg,#C8A040,#F0C060,#C8A040)', opacity:0.6 }} />
        </div>
      )

    case 'neon-pop':
      return (
        <div className={base} style={{
          background: '#0D0D14',
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,45,120,0.08) 9px,rgba(255,45,120,0.08) 10px),repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(46,144,250,0.08) 9px,rgba(46,144,250,0.08) 10px)',
        }}>
          {/* Large left photo */}
          <div className="absolute" style={{ left:'3%', top:'5%', width:'46%', height:'70%', background:'#1A1A28', border:'1px solid rgba(255,45,120,0.35)', boxShadow:'0 0 8px rgba(255,45,120,0.25)' }} />
          {/* Right stack */}
          <div className="absolute" style={{ left:'52%', top:'5%', width:'44%', height:'33%', background:'#1A1A28', border:'1px solid rgba(46,144,250,0.35)', boxShadow:'0 0 6px rgba(46,144,250,0.2)' }} />
          <div className="absolute" style={{ left:'52%', top:'40%', width:'44%', height:'33%', background:'#1A1A28', border:'1px solid rgba(46,144,250,0.35)', boxShadow:'0 0 6px rgba(46,144,250,0.2)' }} />
          {/* Bottom bar */}
          <div className="absolute" style={{ bottom:'6%', left:'3%', right:'3%', height:'12%', borderTop:'1px solid rgba(255,45,120,0.3)', paddingTop:'3px' }}>
            <div style={{ fontSize:'7px', color:'#FF2D78', fontWeight:900, fontFamily:'sans-serif', letterSpacing:'0.15em', textTransform:'uppercase' }}>OUR STORY</div>
          </div>
          {/* Stickers */}
          <div className="absolute" style={{ left:'4%', bottom:'7%', fontSize:'8px' }}>⚡</div>
          <div className="absolute" style={{ right:'4%', bottom:'7%', fontSize:'8px' }}>✨</div>
        </div>
      )

    case 'polaroid-wall':
      return (
        <div className={base} style={{
          background: '#FFFDF8',
          backgroundImage: 'radial-gradient(circle, #C8B8A8 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}>
          {/* Scattered polaroids */}
          {[
            { l:'4%',  t:'8%',  w:'22%', h:'30%', r:-5 },
            { l:'22%', t:'12%', w:'22%', h:'30%', r:3  },
            { l:'44%', t:'6%',  w:'22%', h:'30%', r:-2 },
            { l:'66%', t:'10%', w:'22%', h:'30%', r:4  },
          ].map((p, i) => (
            <div key={i} className="absolute" style={{
              left:p.l, top:p.t, width:p.w, height:p.h,
              background:'white', boxShadow:'0 2px 6px rgba(0,0,0,0.15)',
              transform:`rotate(${p.r}deg)`, paddingBottom:'6px',
            }}>
              <div style={{ width:'100%', height:'75%', background:'#F0EAE0' }} />
            </div>
          ))}
          {/* Stickers */}
          <div className="absolute" style={{ left:'10%', bottom:'14%', fontSize:'9px' }}>⭐</div>
          <div className="absolute" style={{ right:'10%', bottom:'14%', fontSize:'9px' }}>💛</div>
          <div className="absolute" style={{ left:'50%', bottom:'6%', transform:'translateX(-50%)', fontSize:'7px', color:'#8C7460', fontFamily:'Georgia,serif', fontStyle:'italic', whiteSpace:'nowrap' }}>Summer 2025</div>
        </div>
      )

    case 'paper-cut':
      return (
        <div className={base} style={{ background: '#FF5C1A' }}>
          {/* Large left block */}
          <div className="absolute" style={{ left:'3%', top:'5%', width:'42%', height:'70%', background:'#FFFBF5', boxShadow:'3px 3px 0 rgba(0,0,0,0.4)' }} />
          {/* Top right */}
          <div className="absolute" style={{ left:'47%', top:'5%', width:'26%', height:'34%', background:'#FFFBF5', boxShadow:'3px 3px 0 rgba(0,0,0,0.4)' }} />
          <div className="absolute" style={{ left:'75%', top:'5%', width:'22%', height:'34%', background:'#FFFBF5', boxShadow:'3px 3px 0 rgba(0,0,0,0.4)' }} />
          {/* Bottom right wide */}
          <div className="absolute" style={{ left:'47%', top:'41%', width:'50%', height:'34%', background:'#FFFBF5', boxShadow:'3px 3px 0 rgba(0,0,0,0.4)' }} />
          {/* Bottom label */}
          <div className="absolute" style={{ left:'3%', bottom:'8%', fontSize:'7px', color:'rgba(255,251,245,0.9)', fontWeight:900, fontFamily:'sans-serif', textTransform:'uppercase', letterSpacing:'0.1em' }}>THE STORY</div>
        </div>
      )

    case 'watercolor':
      return (
        <div className={base} style={{
          background: '#FEFCFA',
          backgroundImage: 'radial-gradient(ellipse 200px 150px at 20% 30%, rgba(255,170,0,0.12) 0%, transparent 70%), radial-gradient(ellipse 150px 180px at 80% 60%, rgba(139,92,246,0.10) 0%, transparent 70%), radial-gradient(ellipse 180px 120px at 50% 80%, rgba(18,183,106,0.09) 0%, transparent 70%)',
        }}>
          {/* Large left square */}
          <div className="absolute" style={{ left:'4%', top:'6%', width:'36%', height:'60%', background:'rgba(248,242,236,0.9)', border:'1.5px solid rgba(180,140,100,0.25)', boxShadow:'0 3px 10px rgba(100,80,60,0.10)' }} />
          {/* Right column */}
          <div className="absolute" style={{ left:'43%', top:'6%', width:'28%', height:'28%', background:'rgba(248,242,236,0.9)', border:'1.5px solid rgba(180,140,100,0.25)' }} />
          <div className="absolute" style={{ left:'73%', top:'6%', width:'24%', height:'28%', background:'rgba(248,242,236,0.9)', border:'1.5px solid rgba(180,140,100,0.25)' }} />
          <div className="absolute" style={{ left:'43%', top:'37%', width:'54%', height:'28%', background:'rgba(248,242,236,0.9)', border:'1.5px solid rgba(180,140,100,0.25)' }} />
          {/* Stickers */}
          <div className="absolute" style={{ left:'5%', bottom:'14%', fontSize:'9px' }}>🌺</div>
          <div className="absolute" style={{ right:'5%', bottom:'14%', fontSize:'9px' }}>🍃</div>
          <div className="absolute" style={{ left:'50%', bottom:'6%', transform:'translateX(-50%)', fontSize:'6px', color:'#7A5C48', fontFamily:'Georgia,serif', fontStyle:'italic', whiteSpace:'nowrap' }}>A beautiful memory</div>
        </div>
      )

    default:
      return <div className={base} style={{ background: '#EEE' }} />
  }
}
