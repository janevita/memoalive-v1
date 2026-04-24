import { redirect } from 'next/navigation'

export default function NewGroupRedirect() {
  redirect('/events/new')
}
