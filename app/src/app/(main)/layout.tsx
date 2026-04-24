import { Nav } from '@/components/layout/Nav'

// This layout wraps all authenticated app routes.
// Auth guard will be added in task #3 (data layer).

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
    </div>
  )
}
