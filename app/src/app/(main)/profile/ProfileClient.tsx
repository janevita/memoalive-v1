'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { FaceRefsPanel } from '@/components/people/FaceRefsPanel'
import { signOut } from '@/lib/actions/auth'
import { updateProfileDetails, addProfileFaceRef, removeProfileFaceRef } from '@/lib/actions/people'
import type { UserProfile, FaceRef } from '@/lib/types'

interface ProfileClientProps {
  initialUser: UserProfile | null
}

export function ProfileClient({ initialUser }: ProfileClientProps) {
  const router = useRouter()
  const [user, setUser]     = useState(initialUser)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Editable fields
  const [name,         setName]         = useState(initialUser?.name         ?? '')
  const [nickname,     setNickname]     = useState(initialUser?.nickname     ?? '')
  const [relationship, setRelationship] = useState(initialUser?.relationship ?? '')
  const [birthYear,    setBirthYear]    = useState(initialUser?.birthYear?.toString() ?? '')
  const [hometown,     setHometown]     = useState(initialUser?.hometown     ?? '')
  const [bio,          setBio]          = useState(initialUser?.bio          ?? '')

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
      const res = await updateProfileDetails(fd)
      if (res?.error) {
        setSaveError(res.error)
      } else {
        setUser(u => u ? {
          ...u,
          name,
          nickname:     nickname     || undefined,
          relationship: relationship || undefined,
          birthYear:    birthYear ? parseInt(birthYear, 10) : undefined,
          hometown:     hometown  || undefined,
          bio:          bio       || undefined,
        } : u)
        setEditing(false)
        router.refresh()
      }
    })
  }

  async function handleAddFaceRef(url: string) {
    const res = await addProfileFaceRef(url)
    if (res?.error) throw new Error(res.error)
    const newRef: FaceRef = { url, uploadedAt: new Date().toISOString() }
    setUser(u => u ? { ...u, faceRefs: [...(u.faceRefs ?? []), newRef] } : u)
    router.refresh()
  }

  async function handleRemoveFaceRef(index: number) {
    const res = await removeProfileFaceRef(index)
    if (res?.error) throw new Error(res.error)
    setUser(u => u ? { ...u, faceRefs: (u.faceRefs ?? []).filter((_, i) => i !== index) } : u)
    router.refresh()
  }

  const faceRefs = user?.faceRefs ?? []

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <Avatar name={user?.name ?? 'You'} src={user?.avatarUrl} size="xl" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="font-serif text-2xl font-bold text-ink">{user?.name ?? '—'}</h1>
          {faceRefs.length > 0 && (
            <span
              title={`${faceRefs.length} face reference${faceRefs.length !== 1 ? 's' : ''} — AI recognition enabled`}
              className="w-4 h-4 rounded-full bg-cobalt flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" width="8" height="8" fill="white">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
          )}
        </div>
        {user?.nickname && (
          <p className="text-sm text-ink-soft mt-0.5">"{user.nickname}"</p>
        )}
        <p className="text-xs text-ink-faint mt-1">{user?.email}</p>
        <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs text-ink-soft">
          {user?.relationship && <span>{user.relationship}</span>}
          {user?.hometown     && <span>📍 {user.hometown}</span>}
          {user?.birthYear    && <span>b. {user.birthYear}</span>}
        </div>
        {user?.bio && (
          <p className="text-sm text-ink-soft mt-3 max-w-xs mx-auto leading-relaxed">{user.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Groups',   value: user?.groupCount  ?? 0 },
          { label: 'Memories', value: user?.memoryCount ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="font-serif text-3xl font-bold text-ink">{value}</p>
            <p className="text-xs text-ink-soft mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Edit profile card */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-ink-mid">Profile details</p>
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            className="btn btn-ghost btn-sm btn-pill text-xs"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {!editing ? (
          <div className="space-y-2">
            {[
              { label: 'Name',         value: user?.name },
              { label: 'Nickname',     value: user?.nickname },
              { label: 'Relationship', value: user?.relationship },
              { label: 'Birth year',   value: user?.birthYear },
              { label: 'Hometown',     value: user?.hometown },
              { label: 'Bio',          value: user?.bio },
            ].filter(f => f.value).map(({ label, value }) => (
              <div key={label} className="flex gap-3">
                <span className="text-ink-faint w-24 flex-shrink-0 text-xs pt-0.5">{label}</span>
                <span className="text-ink text-sm leading-relaxed">{String(value)}</span>
              </div>
            ))}
            {!user?.nickname && !user?.relationship && !user?.bio && (
              <p className="text-xs text-ink-faint italic">Tap Edit to add details about yourself.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {saveError && (
              <p className="text-xs text-red-500">{saveError}</p>
            )}
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1">
                Full name <span className="text-flame">*</span>
              </label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Nickname</label>
                <input
                  type="text"
                  className="input"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="e.g. Nana"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Role in family</label>
                <input
                  type="text"
                  className="input"
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  placeholder="e.g. Mother"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Birth year</label>
                <input
                  type="number"
                  className="input"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  placeholder="e.g. 1985"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-mid mb-1">Hometown</label>
                <input
                  type="text"
                  className="input"
                  value={hometown}
                  onChange={e => setHometown(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1">Bio</label>
              <textarea
                className="input min-h-[72px] resize-none"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A sentence about yourself…"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !name.trim()}
              className="btn btn-primary btn-sm w-full"
            >
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      {/* Face references */}
      <div className="card p-5 mb-6">
        <FaceRefsPanel
          faceRefs={faceRefs}
          storagePrefix={`face-refs/${user?.id ?? 'me'}`}
          onAdd={handleAddFaceRef}
          onRemove={handleRemoveFaceRef}
        />
        {faceRefs.length > 0 && (
          <div className="mt-4 px-3 py-2.5 rounded-xl bg-cobalt/8 border border-cobalt/12 flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-cobalt flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" width="8" height="8" fill="white">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <p className="text-[11px] text-cobalt leading-snug">
              AI recognition enabled — Memoalive will use your face photos to identify you in group uploads.
            </p>
          </div>
        )}
      </div>

      {/* Settings links */}
      <nav className="space-y-1 mb-6">
        {[
          { label: 'Notifications',   icon: '○', href: '#' },
          { label: 'Help & feedback', icon: '?', href: '#' },
        ].map(({ label, icon, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-ink/5 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-ink/8 flex items-center justify-center text-sm text-ink-soft flex-shrink-0">
              {icon}
            </span>
            <span className="text-sm font-medium text-ink">{label}</span>
            <svg className="ml-auto text-ink-faint" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>
        ))}
      </nav>

      {/* Sign out */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors text-left"
        >
          <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm text-red-500 flex-shrink-0">
            ↪
          </span>
          <span className="text-sm font-medium text-red-500">Sign out</span>
        </button>
      </form>

      <p className="text-center text-xs text-ink-faint mt-8">
        Member since {user?.createdAt
          ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : '—'}
      </p>
    </div>
  )
}
