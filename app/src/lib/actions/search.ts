'use server'

import { searchMemories } from '@/lib/data/memories'
import type { Genre, MemoryWithDetails } from '@/lib/types'

export async function searchMemoriesAction(
  query: string,
  filters?: { genre?: Genre }
): Promise<MemoryWithDetails[]> {
  try {
    return await searchMemories(query, filters)
  } catch {
    return []
  }
}
