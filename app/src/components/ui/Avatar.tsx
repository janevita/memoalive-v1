import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

// Deterministic warm colour from name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-flame text-white',
    'bg-magenta text-white',
    'bg-cobalt text-white',
    'bg-vivid-green text-white',
    'bg-flame-mid text-white',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size]
  const colorClass = getAvatarColor(name)

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        sizeClass,
        colorClass,
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}

// Stacked avatars (e.g. group member preview)
interface AvatarGroupProps {
  names: string[]
  srcs?: (string | null)[]
  max?: number
  size?: AvatarProps['size']
}

export function AvatarGroup({ names, srcs = [], max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = names.slice(0, max)
  const overflow = names.length - max

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((name, i) => (
        <Avatar
          key={i}
          name={name}
          src={srcs[i]}
          size={size}
          className="ring-2 ring-canvas"
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'rounded-full bg-ink/10 flex items-center justify-center text-ink-soft font-semibold ring-2 ring-canvas flex-shrink-0',
            sizeMap[size],
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
