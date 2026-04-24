import { getCurrentUser } from '@/lib/data/users'
import { ProfileClient } from './ProfileClient'

export const metadata = { title: 'Profile · Memoalive' }

export default async function ProfilePage() {
  const user = await getCurrentUser()
  return <ProfileClient initialUser={user} />
}
