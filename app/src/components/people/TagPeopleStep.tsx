'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import type { TaggablePerson } from '@/lib/data/people'

interface TagPeopleStepProps {
  people:   TaggablePerson[]
  selected: Set<string>
  onToggle: (person: TaggablePerson) => void
}

export function TagPeopleStep({ people, selected, onToggle }: TagPeopleStepProps) {
  if (people.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="7" r="4" />
            <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-ink mb-1">No people in this group yet</p>
        <p className="text-xs text-ink-soft">Add family members in the group's People section first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-faint mb-4">
        Tap to tag people who appear in this memory. Tagged people help with search and AI recognition.
      </p>
      {people.map(person => {
        const isSelected = selected.has(person.id)
        const label = person.nickname
          ? `${person.name} · ${person.nickname}`
          : person.name

        return (
          <button
            key={person.id}
            type="button"
            onClick={() => onToggle(person)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-[1.5px] text-left transition-all',
              isSelected
                ? 'border-flame bg-flame-glow/30'
                : 'border-ink/10 hover:border-ink/20'
            )}
          >
            <div className="relative flex-shrink-0">
              <Avatar name={person.name} src={person.avatarUrl} size="sm" />
              {person.faceRefs.length > 0 && (
                <span
                  title="AI recognition enabled"
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-cobalt border-2 border-white flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" width="7" height="7" fill="white">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{person.name}</p>
              <p className="text-xs text-ink-soft">
                {person.relationship ?? (person.type === 'profile' ? 'Member' : 'Family / friend')}
              </p>
            </div>

            <div className={cn(
              'w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all',
              isSelected ? 'bg-flame border-flame' : 'border-ink/20'
            )}>
              {isSelected && (
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
