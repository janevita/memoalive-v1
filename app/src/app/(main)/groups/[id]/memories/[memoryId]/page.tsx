import { redirect } from 'next/navigation'

export default function MemoryRedirect({ params }: { params: { id: string; memoryId: string } }) {
  redirect(`/events/${params.id}/memories/${params.memoryId}`)
}
