import Link from 'next/link'
import { EventWithParticipants } from '@/lib/types'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { AvatarGroup } from '@/components/ui/Avatar'

interface EventCardProps {
  group: EventWithParticipants
  className?: string
}

export function GroupCard({ group, className }: EventCardProps) {
  const memberNames = group.members?.map(m => m.user?.name ?? 'Member') ?? []
  const memberAvatars = group.members?.map(m => m.user?.avatarUrl ?? null) ?? []

  return (
    <Link href={ROUTES.event(group.id)} className={cn('group block', className)}>
      <div className="card p-5 hover:shadow-md transition-shadow">
        {/* Cover / icon */}
        <div className="w-12 h-12 rounded-xl overflow-hidden mb-4 flex-shrink-0">
          {group.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.coverUrl}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-serif text-lg font-bold"
              style={{ background: 'linear-gradient(135deg, #F9761C, #EC4799)' }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h3 className="font-serif text-base font-semibold text-ink group-hover:text-flame transition-colors leading-snug mb-1 truncate">
          {group.name}
        </h3>

        {group.description && (
          <p className="text-xs text-ink-soft line-clamp-2 mb-3">
            {group.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <AvatarGroup names={memberNames} srcs={memberAvatars} max={4} size="xs" />
          <span className="text-xs text-ink-faint">
            {group.members?.length ?? 0} participant{(group.members?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}
