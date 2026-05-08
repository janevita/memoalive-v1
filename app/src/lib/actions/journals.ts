'use server'

import { createClient } from '@/lib/supabase/server'
import type { JournalBlockType, JournalBlockStyle } from '@/lib/types'

const MAX_JOURNALS_PER_YEAR = 5

// ── Journal CRUD ──────────────────────────────────────────────────────────────

export async function createJournal(
  subjectName: string,
  title: string,
  coverColor: string,
) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Enforce year limit per user
  const year = new Date().getFullYear()
  const { count } = await db
    .from('journals')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .eq('year', year)
  if ((count ?? 0) >= MAX_JOURNALS_PER_YEAR) {
    return { error: `You can only create ${MAX_JOURNALS_PER_YEAR} journals per year.` }
  }

  const { data, error } = await db
    .from('journals')
    .insert({ created_by: user.id, subject_name: subjectName, title, cover_color: coverColor, cover_style: 'classic', year })
    .select('id')
    .single()
  if (error) return { error: error.message }

  // Auto-create first chapter
  await db.from('journal_chapters').insert({
    journal_id: data.id, chapter_number: 1, title: 'Chapter 1',
  })

  return { id: data.id }
}

export async function updateJournalMeta(
  journalId: string,
  patch: { title?: string; subjectName?: string; coverColor?: string }
) {
  const db = await createClient()
  const { error } = await db
    .from('journals')
    .update({
      ...(patch.title        && { title:        patch.title }),
      ...(patch.subjectName  && { subject_name: patch.subjectName }),
      ...(patch.coverColor   && { cover_color:  patch.coverColor }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', journalId)
  return { error: error?.message }
}

export async function deleteJournal(journalId: string) {
  const db = await createClient()
  const { error } = await db.from('journals').delete().eq('id', journalId)
  return { error: error?.message }
}

// ── Chapter CRUD ──────────────────────────────────────────────────────────────

export async function createChapter(journalId: string, title: string, chapterNumber: number) {
  const db = await createClient()
  const { data, error } = await db
    .from('journal_chapters')
    .insert({ journal_id: journalId, chapter_number: chapterNumber, title })
    .select('id')
    .single()
  return { id: data?.id, error: error?.message }
}

export async function updateChapterTitle(chapterId: string, title: string) {
  const db = await createClient()
  await db.from('journal_chapters').update({ title }).eq('id', chapterId)
}

export async function deleteChapter(chapterId: string) {
  const db = await createClient()
  await db.from('journal_chapters').delete().eq('id', chapterId)
}

// ── Block CRUD ────────────────────────────────────────────────────────────────

export async function createBlock(
  chapterId: string,
  blockType: JournalBlockType,
  blockOrder: number,
  content = '',
) {
  const db = await createClient()
  const { data, error } = await db
    .from('journal_blocks')
    .insert({ chapter_id: chapterId, block_type: blockType, block_order: blockOrder, content })
    .select('id')
    .single()
  return { id: data?.id, error: error?.message }
}

export async function updateBlock(
  blockId: string,
  patch: { content?: string; imageUrl?: string; style?: JournalBlockStyle; blockOrder?: number }
) {
  const db = await createClient()
  await db
    .from('journal_blocks')
    .update({
      ...(patch.content    !== undefined && { content:    patch.content }),
      ...(patch.imageUrl   !== undefined && { image_url:  patch.imageUrl }),
      ...(patch.style      !== undefined && { style:      patch.style }),
      ...(patch.blockOrder !== undefined && { block_order: patch.blockOrder }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', blockId)
}

export async function deleteBlock(blockId: string) {
  const db = await createClient()
  await db.from('journal_blocks').delete().eq('id', blockId)
}

// ── Rich content (single-block per chapter) ───────────────────────────────────

/**
 * Save the full rich HTML for a chapter into a single canonical paragraph block.
 * Consolidates any existing multi-block chapters on first save.
 */
export async function upsertChapterContent(
  chapterId: string,
  html: string,
): Promise<{ error?: string }> {
  const db = await createClient()

  const { data: blocks, error: fetchErr } = await db
    .from('journal_blocks')
    .select('id, block_type')
    .eq('chapter_id', chapterId)
    .order('block_order', { ascending: true })

  if (fetchErr) return { error: fetchErr.message }

  if (blocks && blocks.length > 0) {
    const first = blocks[0]!
    const extras = blocks.slice(1)

    // Update first block with full rich HTML
    const { error: updateErr } = await db
      .from('journal_blocks')
      .update({ content: html, block_type: 'paragraph', updated_at: new Date().toISOString() })
      .eq('id', first.id)
    if (updateErr) return { error: updateErr.message }

    // Consolidate: delete extra blocks (old multi-block chapters)
    if (extras.length > 0) {
      await db.from('journal_blocks').delete().in('id', extras.map(b => b.id))
    }
  } else {
    // No blocks yet — create the canonical rich block
    const { error: insertErr } = await db
      .from('journal_blocks')
      .insert({ chapter_id: chapterId, block_type: 'paragraph', block_order: 0, content: html })
    if (insertErr) return { error: insertErr.message }
  }

  return {}
}

// ── AI Writing ────────────────────────────────────────────────────────────────

export async function aiGrammarCorrect(text: string): Promise<{ result?: string; error?: string }> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Fix only spelling and grammar errors in this text. Return ONLY the corrected text, no explanations, no quotes:\n\n${text}`,
      }],
    })
    const result = msg.content[0]?.type === 'text' ? msg.content[0].text : text
    return { result }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function aiWritingSuggestions(
  context: string,
  subjectName: string,
): Promise<{ suggestions?: string[]; error?: string }> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `This is a life journal about ${subjectName}. Here is what has been written so far:\n\n"${context}"\n\nSuggest 3 short prompts (one sentence each) to help continue the story. Return them as a numbered list 1. 2. 3. — no other text.`,
      }],
    })
    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const suggestions = raw
      .split('\n')
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3)
    return { suggestions }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function aiTonePolish(text: string, subjectName: string): Promise<{ result?: string; error?: string }> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `This is a passage from a life journal about ${subjectName}. Rewrite it in a warm, narrative, book-like tone — like a beautifully written memoir. Keep all the facts and details. Return ONLY the rewritten text:\n\n${text}`,
      }],
    })
    const result = msg.content[0]?.type === 'text' ? msg.content[0].text : text
    return { result }
  } catch (e) {
    return { error: String(e) }
  }
}
