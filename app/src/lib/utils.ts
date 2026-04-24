import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type Genre } from '@/lib/types'

// ── Class name helper ─────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Genre config ──────────────────────────────────────────────────────────────
export const GENRE_CONFIG: Record<
  Genre,
  { label: string; bg: string; border: string; text: string; icon: string }
> = {
  adventure: {
    label: 'Adventure',
    bg:     'bg-flame-glow',
    border: 'border-flame',
    text:   'text-flame-dark',
    icon:   '🧭',
  },
  drama: {
    label: 'Drama',
    bg:     'bg-magenta-tint',
    border: 'border-magenta',
    text:   'text-magenta-dark',
    icon:   '🎭',
  },
  comedy: {
    label: 'Comedy',
    bg:     'bg-vivid-amber-tint',
    border: 'border-vivid-amber',
    text:   'text-[#7B5800]',
    icon:   '😂',
  },
  romance: {
    label: 'Romance',
    bg:     'bg-vivid-blush',
    border: 'border-vivid-red',
    text:   'text-[#8B1A1A]',
    icon:   '❤️',
  },
  'coming-of-age': {
    label: 'Coming of Age',
    bg:     'bg-vivid-green-tint',
    border: 'border-vivid-green',
    text:   'text-[#1B5E20]',
    icon:   '🌱',
  },
  documentary: {
    label: 'Documentary',
    bg:     'bg-cobalt-tint',
    border: 'border-cobalt',
    text:   'text-cobalt-dark',
    icon:   '📽️',
  },
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function formatMemoryDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatMemoryDate(dateStr)
}

// ── String helpers ────────────────────────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength).trimEnd() + '…'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Supabase storage URL helper ───────────────────────────────────────────────
export function getStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/${path}`
}

// ── Invite code generator ─────────────────────────────────────────────────────
export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
