import { createClient } from '@/lib/supabase/server'
import type { Journal, JournalWithChapters, JournalBlock, JournalChapter } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToJournal(r: Record<string, unknown>): Journal {
  return {
    id:          r.id as string,
    eventId:     r.event_id as string,
    createdBy:   r.created_by as string,
    subjectName: r.subject_name as string,
    subjectId:   r.subject_id as string | undefined,
    title:       r.title as string,
    coverColor:  r.cover_color as string,
    coverStyle:  r.cover_style as string,
    year:        r.year as number,
    isPublic:    r.is_public as boolean,
    createdAt:   r.created_at as string,
    updatedAt:   r.updated_at as string,
  }
}

function rowToBlock(r: Record<string, unknown>): JournalBlock {
  return {
    id:         r.id as string,
    chapterId:  r.chapter_id as string,
    blockOrder: r.block_order as number,
    blockType:  r.block_type as JournalBlock['blockType'],
    content:    r.content as string,
    imageUrl:   r.image_url as string | undefined,
    style:      (r.style ?? {}) as JournalBlock['style'],
    createdAt:  r.created_at as string,
    updatedAt:  r.updated_at as string,
  }
}

function rowToChapter(r: Record<string, unknown>, blocks: JournalBlock[]): JournalChapter {
  return {
    id:            r.id as string,
    journalId:     r.journal_id as string,
    chapterNumber: r.chapter_number as number,
    title:         r.title as string,
    createdAt:     r.created_at as string,
    blocks,
  }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function getJournalsForEvent(eventId: string): Promise<Journal[]> {
  const db = await createClient()
  const { data } = await db
    .from('journals')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToJournal)
}

export async function getJournal(journalId: string): Promise<JournalWithChapters | null> {
  const db = await createClient()

  const { data: journal } = await db
    .from('journals')
    .select('*')
    .eq('id', journalId)
    .single()
  if (!journal) return null

  const { data: chapters } = await db
    .from('journal_chapters')
    .select('*')
    .eq('journal_id', journalId)
    .order('chapter_number', { ascending: true })

  const chapterIds = (chapters ?? []).map((c: Record<string, unknown>) => c.id as string)

  const { data: blocks } = chapterIds.length > 0
    ? await db
        .from('journal_blocks')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('block_order', { ascending: true })
    : { data: [] }

  const blocksByChapter: Record<string, JournalBlock[]> = {}
  for (const b of (blocks ?? [])) {
    const block = rowToBlock(b as Record<string, unknown>)
    if (!blocksByChapter[block.chapterId]) blocksByChapter[block.chapterId] = []
    blocksByChapter[block.chapterId]!.push(block)
  }

  const fullChapters = (chapters ?? []).map((c: Record<string, unknown>) =>
    rowToChapter(c, blocksByChapter[c.id as string] ?? [])
  )

  return { ...rowToJournal(journal as Record<string, unknown>), chapters: fullChapters }
}

export async function countJournalsThisYear(eventId: string): Promise<number> {
  const db = await createClient()
  const year = new Date().getFullYear()
  const { count } = await db
    .from('journals')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('year', year)
  return count ?? 0
}
