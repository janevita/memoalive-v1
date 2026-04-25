import { type Genre, type ReactionType, type Visibility } from '@/lib/types'

export const APP_NAME = 'Memoalive'
export const APP_TAGLINE = 'Keeps memories of people you care about.'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const GENRES: Genre[] = [
  'adventure',
  'drama',
  'comedy',
  'romance',
  'coming-of-age',
  'documentary',
]

export const REACTION_TYPES: ReactionType[] = [
  'heart',
  'moved',
  'proud',
  'funny',
  'favourite',
]

export const REACTION_LABELS: Record<ReactionType, string> = {
  heart:     'Loved',
  moved:     'Touched',
  proud:     'Proud',
  funny:     'Funny',
  favourite: 'Favourite',
}

export const MAX_GROUP_MEMBERS = 50
export const MAX_MEDIA_PER_MEMORY = 10
export const MAX_FILE_SIZE_MB = 50
export const INVITE_EXPIRY_DAYS = 7

export const ROUTES = {
  home:      '/',
  login:     '/login',
  signup:    '/signup',
  dashboard: '/dashboard',
  search:    '/search',
  profile:   '/profile',
  import:      '/import',
  scrapbooks:  '/scrapbooks',
  scrapbook:   (id: string) => `/scrapbooks/${id}`,
  newScrapbook: '/scrapbooks/new',
  addToScrapbook: (id: string) => `/scrapbooks/${id}/add`,
  event:     (id: string) => `/events/${id}`,
  memory:    (eventId: string, memoryId: string) =>
               `/events/${eventId}/memories/${memoryId}`,
  newMemory:  '/memories/new',
  newEvent:   '/events/new',
  join:       (code: string) => `/join/${code}`,
  album:      (eventId: string, albumId: string) => `/events/${eventId}/albums/${albumId}`,
  newAlbum:   (eventId: string) => `/events/${eventId}/albums/new`,
} as const

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  group:  'Participants only',
  public: 'Public',
}

export const VISIBILITY_DESCRIPTIONS: Record<Visibility, string> = {
  group:  'Only event participants can see this memory',
  public: 'Anyone with the link can view this memory',
}

// ── Scrapbook templates ────────────────────────────────────────────────────────

export type ScrapbookTemplateId =
  | 'vintage-kraft'
  | 'pastel-dreams'
  | 'travel-adventure'
  | 'botanical'
  | 'modern-minimal'
  | 'golden-hour'
  | 'neon-pop'
  | 'polaroid-wall'
  | 'paper-cut'
  | 'watercolor'

// Seed element placed on a fresh page (content='' means empty photo slot)
export interface SeedElement {
  type:     'photo' | 'text' | 'sticker'
  content:  string      // '' = empty photo slot, emoji/text for sticker/text
  x:        number
  y:        number
  width:    number
  height:   number
  rotation: number
  zIndex:   number
}

export interface ScrapbookTemplate {
  id:          ScrapbookTemplateId
  name:        string
  mood:        string       // tagline shown in picker
  // Visual tokens applied by ScrapbookViewer
  pageBg:      string       // CSS background for the scrapbook page
  pageBgPattern?: string    // optional overlay pattern (CSS background-image)
  photoRing:   string       // Tailwind ring/border class on each photo card
  photoShadow: string       // Tailwind shadow class
  photoBg:     string       // empty photo bg colour
  slotBg:      string       // empty photo *slot* bg (seed element placeholder)
  slotBorder:  string       // border style for empty slot
  rotated:     boolean      // subtle random tilt per photo
  overlayFrom: string       // gradient from-color (Tailwind)
  accentText:  string       // caption / link text colour (Tailwind)
  fontClass:   string       // font family class
  // Picker swatch colours
  swatchA:     string
  swatchB:     string
  // Pre-placed layout (applied when a new page is created)
  seedElements?: SeedElement[]
}

export const SCRAPBOOK_TEMPLATES: ScrapbookTemplate[] = [
  {
    id: 'vintage-kraft',
    name: 'Vintage Kraft',
    mood: 'Warm · Rustic · Nostalgic',
    pageBg:      '#C8A87A',
    photoRing:   'ring-2 ring-[#D4B896]',
    photoShadow: 'shadow-[3px_3px_8px_rgba(0,0,0,0.28)]',
    photoBg:     '#F5EDD8',
    slotBg:      'rgba(245,237,216,0.5)',
    slotBorder:  '2px dashed #A07848',
    rotated:     true,
    overlayFrom: 'from-amber-900/70',
    accentText:  'text-amber-100',
    fontClass:   'font-serif italic',
    swatchA:     '#C8A87A',
    swatchB:     '#F5EDD8',
    seedElements: [
      { type: 'photo',   content: '', x: 30,  y: 40,  width: 440, height: 340, rotation: -2.5, zIndex: 0 },
      { type: 'photo',   content: '', x: 490, y: 30,  width: 340, height: 240, rotation: 2,    zIndex: 1 },
      { type: 'photo',   content: '', x: 500, y: 290, width: 250, height: 210, rotation: -1.5, zIndex: 2 },
      { type: 'sticker', content: '📌', x: 35,  y: 35,  width: 50,  height: 50,  rotation: -10, zIndex: 3 },
      { type: 'sticker', content: '📷', x: 780, y: 260, width: 60,  height: 60,  rotation: 8,   zIndex: 4 },
      { type: 'text',    content: 'Our Story', x: 30, y: 420, width: 440, height: 80, rotation: 0, zIndex: 5 },
    ],
  },
  {
    id: 'pastel-dreams',
    name: 'Pastel Dreams',
    mood: 'Soft · Romantic · Family',
    pageBg:      'linear-gradient(145deg, #FFF0F5 0%, #F0F5FF 50%, #F5FFF0 100%)',
    photoRing:   'ring-2 ring-pink-200',
    photoShadow: 'shadow-[0_4px_16px_rgba(180,120,160,0.22)]',
    photoBg:     '#FFF0F5',
    slotBg:      'rgba(249,208,232,0.25)',
    slotBorder:  '2px dashed #E8A0C0',
    rotated:     true,
    overlayFrom: 'from-pink-900/60',
    accentText:  'text-pink-100',
    fontClass:   'font-serif italic',
    swatchA:     '#F9D0E8',
    swatchB:     '#D0D0F9',
    seedElements: [
      { type: 'photo',   content: '', x: 230, y: 50,  width: 480, height: 380, rotation: -1,   zIndex: 0 },
      { type: 'photo',   content: '', x: 10,  y: 120, width: 200, height: 260, rotation: -4,   zIndex: 1 },
      { type: 'photo',   content: '', x: 730, y: 100, width: 200, height: 260, rotation: 3.5,  zIndex: 2 },
      { type: 'sticker', content: '🌸', x: 80,  y: 380, width: 60, height: 60, rotation: -5,  zIndex: 3 },
      { type: 'sticker', content: '🌷', x: 950, y: 350, width: 60, height: 60, rotation: 10,  zIndex: 4 },
      { type: 'sticker', content: '💕', x: 540, y: 430, width: 55, height: 55, rotation: 0,   zIndex: 5 },
      { type: 'text',    content: 'Family Moments', x: 300, y: 520, width: 340, height: 70, rotation: 0, zIndex: 6 },
    ],
  },
  {
    id: 'travel-adventure',
    name: 'Travel Adventure',
    mood: 'Bold · Dark · Exploratory',
    pageBg:      '#1C2B3A',
    photoRing:   'ring-1 ring-sky-400/30',
    photoShadow: 'shadow-[0_2px_12px_rgba(0,0,0,0.5)]',
    photoBg:     '#2A3F55',
    slotBg:      'rgba(42,63,85,0.6)',
    slotBorder:  '2px dashed rgba(100,180,220,0.4)',
    rotated:     false,
    overlayFrom: 'from-slate-900/80',
    accentText:  'text-sky-200',
    fontClass:   'font-sans font-bold uppercase tracking-widest',
    swatchA:     '#1C2B3A',
    swatchB:     '#4AB8D0',
    seedElements: [
      { type: 'photo',   content: '', x: 20,  y: 20,  width: 580, height: 400, rotation: 0, zIndex: 0 },
      { type: 'photo',   content: '', x: 620, y: 20,  width: 560, height: 190, rotation: 0, zIndex: 1 },
      { type: 'photo',   content: '', x: 620, y: 230, width: 560, height: 190, rotation: 0, zIndex: 2 },
      { type: 'sticker', content: '📍', x: 560, y: 380, width: 50, height: 50, rotation: 0, zIndex: 3 },
      { type: 'sticker', content: '🗺️', x: 1100, y: 430, width: 60, height: 60, rotation: 0, zIndex: 4 },
      { type: 'text',    content: 'WANDERLUST', x: 20, y: 450, width: 580, height: 80, rotation: 0, zIndex: 5 },
    ],
  },
  {
    id: 'botanical',
    name: 'Botanical Garden',
    mood: 'Natural · Elegant · Serene',
    pageBg:      '#F2F7F0',
    photoRing:   'ring-2 ring-green-200',
    photoShadow: 'shadow-[0_4px_20px_rgba(80,120,60,0.18)]',
    photoBg:     '#E8F0E4',
    slotBg:      'rgba(232,240,228,0.6)',
    slotBorder:  '2px dashed #8AAD78',
    rotated:     false,
    overlayFrom: 'from-green-900/60',
    accentText:  'text-green-100',
    fontClass:   'font-serif italic',
    swatchA:     '#F2F7F0',
    swatchB:     '#8AAD78',
    seedElements: [
      { type: 'photo',   content: '', x: 320, y: 30, width: 560, height: 560, rotation: 0, zIndex: 0 },
      { type: 'photo',   content: '', x: 20,  y: 160, width: 270, height: 210, rotation: 0, zIndex: 1 },
      { type: 'photo',   content: '', x: 910, y: 160, width: 270, height: 210, rotation: 0, zIndex: 2 },
      { type: 'sticker', content: '🌿', x: 10,  y: 10,  width: 70, height: 70, rotation: -10, zIndex: 3 },
      { type: 'sticker', content: '🌿', x: 1100, y: 10, width: 70, height: 70, rotation: 15,  zIndex: 4 },
      { type: 'sticker', content: '🍃', x: 50,  y: 680, width: 50, height: 50, rotation: 0,   zIndex: 5 },
      { type: 'text',    content: 'In the Garden', x: 380, y: 660, width: 440, height: 70, rotation: 0, zIndex: 6 },
    ],
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    mood: 'Clean · Editorial · Structured',
    pageBg:      '#FAFAF9',
    photoRing:   'ring-0',
    photoShadow: 'shadow-none',
    photoBg:     '#E8E8E4',
    slotBg:      '#EEEEED',
    slotBorder:  '2px dashed #AAAAAA',
    rotated:     false,
    overlayFrom: 'from-zinc-900/75',
    accentText:  'text-zinc-100',
    fontClass:   'font-sans font-black uppercase tracking-tight',
    swatchA:     '#FAFAF9',
    swatchB:     '#1A1A1A',
    seedElements: [
      { type: 'photo',   content: '', x: 20,  y: 20,  width: 320, height: 500, rotation: 0, zIndex: 0 },
      { type: 'photo',   content: '', x: 360, y: 20,  width: 480, height: 240, rotation: 0, zIndex: 1 },
      { type: 'photo',   content: '', x: 860, y: 20,  width: 320, height: 240, rotation: 0, zIndex: 2 },
      { type: 'photo',   content: '', x: 360, y: 280, width: 820, height: 240, rotation: 0, zIndex: 3 },
      { type: 'text',    content: 'MEMORIES', x: 20, y: 560, width: 320, height: 70, rotation: 0, zIndex: 4 },
    ],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    mood: 'Warm · Dreamy · Summer',
    pageBg:      'linear-gradient(160deg, #FFF8E8 0%, #FFF0D0 60%, #FFE8B8 100%)',
    photoRing:   'ring-2 ring-amber-300/50',
    photoShadow: 'shadow-[0_4px_16px_rgba(160,100,0,0.18)]',
    photoBg:     'rgba(255,220,140,0.3)',
    slotBg:      'rgba(255,220,140,0.2)',
    slotBorder:  '2px dashed #C8A040',
    rotated:     true,
    overlayFrom: 'from-amber-800/65',
    accentText:  'text-amber-100',
    fontClass:   'font-serif italic',
    swatchA:     '#FFF0D0',
    swatchB:     '#C8A040',
    seedElements: [
      { type: 'photo',   content: '', x: 40,  y: 30,  width: 320, height: 500, rotation: -1.5, zIndex: 0 },
      { type: 'photo',   content: '', x: 390, y: 30,  width: 360, height: 240, rotation: 1,    zIndex: 1 },
      { type: 'photo',   content: '', x: 390, y: 290, width: 360, height: 240, rotation: -1,   zIndex: 2 },
      { type: 'photo',   content: '', x: 780, y: 30,  width: 390, height: 500, rotation: 2,    zIndex: 3 },
      { type: 'sticker', content: '☀️', x: 1090, y: 550, width: 60, height: 60, rotation: 0,   zIndex: 4 },
      { type: 'text',    content: 'Golden Hour', x: 390, y: 560, width: 360, height: 70, rotation: 0, zIndex: 5 },
    ],
  },

  // ── New modern templates ────────────────────────────────────────────────────

  {
    id: 'neon-pop',
    name: 'Neon Pop',
    mood: 'Bold · Electric · Vibrant',
    pageBg:      '#0D0D14',
    pageBgPattern: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,45,120,0.06) 39px,rgba(255,45,120,0.06) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(46,144,250,0.06) 39px,rgba(46,144,250,0.06) 40px)',
    photoRing:   'ring-2 ring-pink-400/40',
    photoShadow: 'shadow-[0_0_20px_rgba(255,45,120,0.3)]',
    photoBg:     '#1A1A28',
    slotBg:      'rgba(255,45,120,0.07)',
    slotBorder:  '2px dashed rgba(255,45,120,0.5)',
    rotated:     false,
    overlayFrom: 'from-slate-950/85',
    accentText:  'text-pink-300',
    fontClass:   'font-sans font-black uppercase tracking-widest',
    swatchA:     '#0D0D14',
    swatchB:     '#FF2D78',
    seedElements: [
      { type: 'photo',   content: '', x: 20,  y: 20,  width: 580, height: 590, rotation: 0, zIndex: 0 },
      { type: 'photo',   content: '', x: 620, y: 20,  width: 560, height: 285, rotation: 0, zIndex: 1 },
      { type: 'photo',   content: '', x: 620, y: 325, width: 560, height: 285, rotation: 0, zIndex: 2 },
      { type: 'sticker', content: '⚡', x: 30,  y: 624, width: 55, height: 55, rotation: -5, zIndex: 3 },
      { type: 'sticker', content: '✨', x: 1110, y: 624, width: 55, height: 55, rotation: 10, zIndex: 4 },
      { type: 'text',    content: 'OUR STORY', x: 100, y: 620, width: 1000, height: 80, rotation: 0, zIndex: 5 },
    ],
  },
  {
    id: 'polaroid-wall',
    name: 'Polaroid Wall',
    mood: 'Scattered · Playful · Nostalgic',
    pageBg:      '#FFFDF8',
    pageBgPattern: 'radial-gradient(circle, #D4C8B8 1px, transparent 1px)',
    photoRing:   'ring-0',
    photoShadow: 'shadow-[0_4px_16px_rgba(0,0,0,0.14)]',
    photoBg:     '#F8F4EE',
    slotBg:      '#F8F4EE',
    slotBorder:  '2px dashed #C8B8A0',
    rotated:     true,
    overlayFrom: 'from-stone-800/60',
    accentText:  'text-stone-100',
    fontClass:   'font-serif italic',
    swatchA:     '#FFFDF8',
    swatchB:     '#C8B8A0',
    seedElements: [
      { type: 'photo',   content: '', x: 30,  y: 40,  width: 270, height: 300, rotation: -5,  zIndex: 0 },
      { type: 'photo',   content: '', x: 260, y: 60,  width: 270, height: 300, rotation: 3,   zIndex: 1 },
      { type: 'photo',   content: '', x: 490, y: 30,  width: 270, height: 300, rotation: -2,  zIndex: 2 },
      { type: 'photo',   content: '', x: 720, y: 50,  width: 270, height: 300, rotation: 4.5, zIndex: 3 },
      { type: 'photo',   content: '', x: 950, y: 35,  width: 220, height: 300, rotation: -3,  zIndex: 4 },
      { type: 'sticker', content: '📎', x: 70,  y: 340, width: 45, height: 45, rotation: 15,  zIndex: 5 },
      { type: 'sticker', content: '⭐', x: 550, y: 330, width: 45, height: 45, rotation: -8,  zIndex: 6 },
      { type: 'sticker', content: '💛', x: 950, y: 330, width: 45, height: 45, rotation: 5,   zIndex: 7 },
      { type: 'text',    content: 'Summer 2025', x: 100, y: 690, width: 500, height: 80, rotation: -1, zIndex: 8 },
    ],
  },
  {
    id: 'paper-cut',
    name: 'Paper Cut',
    mood: 'Graphic · Colourful · Modern',
    pageBg:      '#FF5C1A',
    pageBgPattern: undefined,
    photoRing:   'ring-0',
    photoShadow: 'shadow-[4px_4px_0_rgba(0,0,0,0.5)]',
    photoBg:     '#FFFBF5',
    slotBg:      'rgba(255,251,245,0.25)',
    slotBorder:  '3px dashed rgba(255,251,245,0.5)',
    rotated:     false,
    overlayFrom: 'from-orange-950/80',
    accentText:  'text-orange-50',
    fontClass:   'font-sans font-black uppercase',
    swatchA:     '#FF5C1A',
    swatchB:     '#FFFBF5',
    seedElements: [
      { type: 'photo',   content: '', x: 20,  y: 20,  width: 500, height: 500, rotation: 0, zIndex: 0 },
      { type: 'photo',   content: '', x: 540, y: 20,  width: 310, height: 240, rotation: 0, zIndex: 1 },
      { type: 'photo',   content: '', x: 870, y: 20,  width: 310, height: 240, rotation: 0, zIndex: 2 },
      { type: 'photo',   content: '', x: 540, y: 280, width: 640, height: 240, rotation: 0, zIndex: 3 },
      { type: 'sticker', content: '✦', x: 20,  y: 540, width: 60, height: 60, rotation: 15,  zIndex: 4 },
      { type: 'sticker', content: '◆', x: 1100, y: 540, width: 60, height: 60, rotation: -10, zIndex: 5 },
      { type: 'text',    content: 'THE STORY', x: 100, y: 540, width: 980, height: 80, rotation: 0, zIndex: 6 },
    ],
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    mood: 'Dreamy · Soft · Artistic',
    pageBg:      '#FEFCFA',
    pageBgPattern: 'radial-gradient(ellipse 700px 500px at 20% 30%, rgba(255,170,0,0.08) 0%, transparent 70%), radial-gradient(ellipse 500px 600px at 80% 60%, rgba(139,92,246,0.07) 0%, transparent 70%), radial-gradient(ellipse 600px 400px at 50% 80%, rgba(18,183,106,0.06) 0%, transparent 70%)',
    photoRing:   'ring-2 ring-[rgba(180,140,100,0.2)]',
    photoShadow: 'shadow-[0_4px_24px_rgba(100,80,60,0.12)]',
    photoBg:     '#F8F2EC',
    slotBg:      'rgba(248,242,236,0.8)',
    slotBorder:  '2px dashed rgba(180,140,100,0.4)',
    rotated:     false,
    overlayFrom: 'from-stone-900/60',
    accentText:  'text-stone-100',
    fontClass:   'font-serif italic',
    swatchA:     '#F8F2EC',
    swatchB:     '#8B5CF6',
    seedElements: [
      { type: 'photo',   content: '', x: 40,  y: 40,  width: 420, height: 420, rotation: 0, zIndex: 0 },
      { type: 'photo',   content: '', x: 500, y: 40,  width: 340, height: 200, rotation: 0, zIndex: 1 },
      { type: 'photo',   content: '', x: 860, y: 40,  width: 320, height: 200, rotation: 0, zIndex: 2 },
      { type: 'photo',   content: '', x: 500, y: 260, width: 680, height: 200, rotation: 0, zIndex: 3 },
      { type: 'sticker', content: '🌺', x: 30,  y: 480, width: 55, height: 55, rotation: -8,  zIndex: 4 },
      { type: 'sticker', content: '🍃', x: 1100, y: 480, width: 55, height: 55, rotation: 12,  zIndex: 5 },
      { type: 'sticker', content: '💜', x: 460, y: 490, width: 45, height: 45, rotation: 0,   zIndex: 6 },
      { type: 'text',    content: 'A beautiful memory', x: 80, y: 570, width: 1040, height: 80, rotation: 0, zIndex: 7 },
    ],
  },
]

export const DEFAULT_TEMPLATE_ID: ScrapbookTemplateId = 'vintage-kraft'

export const SUPABASE_BUCKETS = {
  media:   'memory-media',
  avatars: 'avatars',
  covers:  'group-covers',
} as const
