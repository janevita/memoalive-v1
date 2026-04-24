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

export interface ScrapbookTemplate {
  id:          ScrapbookTemplateId
  name:        string
  mood:        string       // tagline shown in picker
  // Visual tokens applied by ScrapbookViewer
  pageBg:      string       // CSS background for the scrapbook page
  photoRing:   string       // Tailwind ring/border class on each photo card
  photoShadow: string       // Tailwind shadow class
  photoBg:     string       // empty photo bg colour
  rotated:     boolean      // subtle random tilt per photo
  overlayFrom: string       // gradient from-color (Tailwind)
  accentText:  string       // caption / link text colour (Tailwind)
  fontClass:   string       // font family class
  // Picker swatch colours
  swatchA:     string
  swatchB:     string
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
    rotated:     true,
    overlayFrom: 'from-amber-900/70',
    accentText:  'text-amber-100',
    fontClass:   'font-serif italic',
    swatchA:     '#C8A87A',
    swatchB:     '#F5EDD8',
  },
  {
    id: 'pastel-dreams',
    name: 'Pastel Dreams',
    mood: 'Soft · Romantic · Family',
    pageBg:      'linear-gradient(145deg, #FFF0F5 0%, #F0F5FF 50%, #F5FFF0 100%)',
    photoRing:   'ring-2 ring-pink-200',
    photoShadow: 'shadow-[0_4px_16px_rgba(180,120,160,0.22)]',
    photoBg:     '#FFF0F5',
    rotated:     true,
    overlayFrom: 'from-pink-900/60',
    accentText:  'text-pink-100',
    fontClass:   'font-serif italic',
    swatchA:     '#F9D0E8',
    swatchB:     '#D0D0F9',
  },
  {
    id: 'travel-adventure',
    name: 'Travel Adventure',
    mood: 'Bold · Dark · Exploratory',
    pageBg:      '#1C2B3A',
    photoRing:   'ring-1 ring-sky-400/30',
    photoShadow: 'shadow-[0_2px_12px_rgba(0,0,0,0.5)]',
    photoBg:     '#2A3F55',
    rotated:     false,
    overlayFrom: 'from-slate-900/80',
    accentText:  'text-sky-200',
    fontClass:   'font-sans font-bold uppercase tracking-widest',
    swatchA:     '#1C2B3A',
    swatchB:     '#4AB8D0',
  },
  {
    id: 'botanical',
    name: 'Botanical Garden',
    mood: 'Natural · Elegant · Serene',
    pageBg:      '#F2F7F0',
    photoRing:   'ring-2 ring-green-200',
    photoShadow: 'shadow-[0_4px_20px_rgba(80,120,60,0.18)]',
    photoBg:     '#E8F0E4',
    rotated:     false,
    overlayFrom: 'from-green-900/60',
    accentText:  'text-green-100',
    fontClass:   'font-serif italic',
    swatchA:     '#F2F7F0',
    swatchB:     '#8AAD78',
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    mood: 'Clean · Editorial · Structured',
    pageBg:      '#FAFAF9',
    photoRing:   'ring-0',
    photoShadow: 'shadow-none',
    photoBg:     '#E8E8E4',
    rotated:     false,
    overlayFrom: 'from-zinc-900/75',
    accentText:  'text-zinc-100',
    fontClass:   'font-sans font-black uppercase tracking-tight',
    swatchA:     '#FAFAF9',
    swatchB:     '#1A1A1A',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    mood: 'Warm · Dreamy · Summer',
    pageBg:      'linear-gradient(160deg, #FFF8E8 0%, #FFF0D0 60%, #FFE8B8 100%)',
    photoRing:   'ring-2 ring-amber-300/50',
    photoShadow: 'shadow-[0_4px_16px_rgba(160,100,0,0.18)]',
    photoBg:     'rgba(255,220,140,0.3)',
    rotated:     true,
    overlayFrom: 'from-amber-800/65',
    accentText:  'text-amber-100',
    fontClass:   'font-serif italic',
    swatchA:     '#FFF0D0',
    swatchB:     '#C8A040',
  },
]

export const DEFAULT_TEMPLATE_ID: ScrapbookTemplateId = 'vintage-kraft'

export const SUPABASE_BUCKETS = {
  media:   'memory-media',
  avatars: 'avatars',
  covers:  'group-covers',
} as const
