'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { FaceRefsPanel } from '@/components/people/FaceRefsPanel'
import { updateGroupPerson, addFaceRef, removeFaceRef } from '@/lib/actions/people'
import type { GroupPerson } from '@/lib/types'

interface PersonDetailClientProps {
  person: GroupPerson
  eventId: string
}

export function PersonDetailClient({ person: initial, eventId }: PersonDetailClientProps) {
  const router = useRouter()
  const [person, setPerson]           = useState(initial)
  const [editing, setEditing]         = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [saveError, setSaveError]     = useState<string | null>(null)

  const [name,         setName]         = useState(initial.name)
  const [nickname,     setNickname]     = useState(initial.nickname ?? '')
  const [relationship, setRelationship] = useState(initial.relationship ?? '')
  const [birthYear,    setBirthYear]    = useState(initial.birthYear?.toString() ?? '')
  const [hometown,     setHometown]     = useState(initial.hometown ?? '')
  const [bio,          setBio]          = useState(initial.bio ?? '')

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name',         name)
      fd.set('nickname',     nickname)
      fd.set('relationship', relationship)
      fd.set('birthYear',    birthYear)
      fd.set('hometown',     hometown)
      fd.set('bio',          bio)
      const res = await updateGroupPerson(person.id, fd)
      if (res?.error) {
        setSaveError(res.error)
      } else {
        setPerson(p => ({
          ...p, name,
          nickname:     nickname     || undefined,
          relationship: relationship || undefined,
          birthYear:    birthYear ? parseInt(birthYear, 10) : undefined,
          hometown:     hometown  || undefined,
          bio:          bio       || undefined,
        }))
        setEditing(false)
        router.refresh()
      }
    })
  }

  async function handleAddFaceRef(url: string) {
    const res = await addFaceRef(person.id, url)
    if (res?.error) throw new Error(res.error)
    setPerson(p => ({ ...p, faceRefs: [...p.faceRefs, { url, uploadedAt: new Date().toISOString() }] }))
    router.refresh()
  }

  async function handleRemoveFaceRef(index: number) {
    const res = await removeFaceRef(person.id, index)
    if (res?.error) throw new Error(res.error)
    setPerson(p => ({ ...p, faceRefs: p.faceRefs.filter((_, i) => i !== index) }))
    router.refresh()
  }

  const displayName = person.nickname ? `${person.name} · "${person.nickname}"` : person.name

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link
        href={`/events/${eventId}/people`}
        className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink transition-colors mb-6"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        People
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4 mb-5">
          <Avatar name={person.name} src={person.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-xl font-bold text-ink leading-tight">{displayName}</h1>
            {person.relationship && <p className="text-sm text-ink-soft mt-0.5">{person.relationship}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink-faint">
              {person.birthYear && <span>b. {person.birthYear}</span>}
              {person.hometown  && <span>📍 {person.hometown}</span>}
            </div>
          </div>
          <button type="button" onClick={() => setEditing(e => !e)} className="btn btn-ghost btn-sm btn-pill flex-shrink-0">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {person.bio && !editing && (
          <p className="text-sm text-ink-soft leading-relaxed">{person.bio}</p>
        )}

        {editing && (
          <div className="space-y-4 border-t border-[#E7E0D8] pt-4">
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1">Full name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Nickname</label>
                <input type="text" className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Relationship</label>
                <input type="text" className="input" value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Birth year</label>
                <input type="number" className="input" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="e.g. 1942" min="1900" max={new Date().getFullYear()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Hometown</label>
                <input type="text" className="input" value={hometown} onChange={e => setHometown(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1">About them</label>
              <textarea className="input min-h-[72px] resize-none" value={bio} onChange={e => setBio(e.target.value)} placeholder="A few words…" />
            </div>
            <button type="button" onClick={handleSave} disabled={isPending || !name.trim()} className="btn btn-primary btn-sm w-full">
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      <div className="card p-5">
        <FaceRefsPanel
          faceRefs={person.faceRefs}
          storagePrefix={`face-refs/person/${person.id}`}
          onAdd={handleAddFaceRef}
          onRemove={handleRemoveFaceRef}
        />
      </div>

      {person.faceRefs.length > 0 && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-cobalt/8 border border-cobalt/15 flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-cobalt flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><circle cx="12" cy="12" r="9" /></svg>
          </span>
          <div>
            <p className="text-xs font-semibold text-cobalt">AI recognition enabled</p>
            <p className="text-[11px] text-ink-soft mt-0.5">
              {person.faceRefs.length} face photo{person.faceRefs.length !== 1 ? 's' : ''} stored.
              Memoalive will use these to identify {person.nickname ?? person.name.split(' ')[0]} in future uploads.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
