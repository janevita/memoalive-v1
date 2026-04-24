import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { getMemory, getComments } from '@/lib/data/memories'
import { getMemoryTags } from '@/lib/data/people'
import { getCurrentUser } from '@/lib/data/users'
import { Avatar } from '@/components/ui/Avatar'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { ReactionBar } from '@/components/memory/ReactionBar'
import { CommentSection } from '@/components/memory/CommentSection'
import { MediaGallery } from '@/components/memory/MediaGallery'
import { MemoryActions } from '@/components/memory/MemoryActions'

export async function generateMetadata({
  params,
}: {
  params: { id: string; memoryId: string }
}) {
  const memory = await getMemory(params.memoryId)
  return { title: memory ? `${memory.title} · Memoalive` : 'Memory' }
}

export default async function MemoryDetailPage({
  params,
}: {
  params: { id: string; memoryId: string }
}) {
  const [memory, comments, currentUser, tags] = await Promise.all([
    getMemory(params.memoryId),
    getComments(params.memoryId),
    getCurrentUser(),
    getMemoryTags(params.memoryId),
  ])

  if (!memory) notFound()

  const isAuthor = currentUser?.id === memory.authorId

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link
        href={ROUTES.event(params.id)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors mb-6"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to event
      </Link>

      {/* Author controls */}
      {isAuthor && (
        <MemoryActions
          memoryId={memory.id}
          groupId={params.id}
          title={memory.title}
          content={memory.content}
          genre={memory.genre}
          takenAt={memory.takenAt}
        />
      )}

      <article>
        {/* Media (with edit/delete controls for author) */}
        {memory.media && memory.media.length > 0 ? (
          <MediaGallery
            items={memory.media}
            memoryId={memory.id}
            groupId={params.id}
            canEdit={isAuthor}
          />
        ) : (
          <div className="rounded-2xl overflow-hidden mb-6 h-32 flex items-center justify-center genre-badge genre-adventure" style={{ borderRadius: '1rem' }}>
            <GenreBadge genre={memory.genre} size="md" />
          </div>
        )}

        {/* Title + meta */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar
            name={memory.author.name}
            src={memory.author.avatarUrl}
            size="sm"
            className="flex-shrink-0 mt-1"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-bold text-ink leading-snug mb-1">
              {memory.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              <span>{memory.author.name}</span>
              <span className="text-ink-faint">·</span>
              {memory.takenAt && (
                <>
                  <span>
                    {new Date(memory.takenAt).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                  <span className="text-ink-faint">·</span>
                </>
              )}
              <GenreBadge genre={memory.genre} />
              {memory.location && (
                <>
                  <span className="text-ink-faint">·</span>
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.9-3.1-7-7-7z"/>
                      <circle cx="12" cy="9" r="2.5"/>
                    </svg>
                    {memory.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content / caption */}
        {memory.content && (
          <p className="text-ink-soft leading-relaxed mb-8 whitespace-pre-wrap">
            {memory.content}
          </p>
        )}

        {/* Tagged people */}
        {tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-faint">With</span>
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-1.5">
                  <Avatar name={tag.name} src={tag.avatarUrl} size="xs" />
                  <span className="text-xs font-medium text-ink">{tag.name}</span>
                  {tag.isAiSuggested && (
                    <span title="AI suggested" className="w-3 h-3 rounded-full bg-cobalt inline-block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reactions */}
        <div className="mb-8">
          <ReactionBar memoryId={memory.id} reactions={memory.reactions} />
        </div>

        {/* Comments */}
        <CommentSection
          memoryId={memory.id}
          initialComments={comments as never}
          currentUserName={currentUser?.name ?? 'You'}
          currentUserAvatar={currentUser?.avatarUrl}
        />
      </article>
    </div>
  )
}
