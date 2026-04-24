// Shared loading skeleton for all (main) routes
export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-3 w-20 bg-ink/8 rounded mb-3" />
        <div className="h-8 w-48 bg-ink/8 rounded mb-2" />
        <div className="h-4 w-64 bg-ink/5 rounded" />
      </div>
      {/* Card skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-5 mb-4">
          <div className="flex gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-ink/8 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 bg-ink/8 rounded" />
              <div className="h-3 w-16 bg-ink/5 rounded" />
            </div>
          </div>
          <div className="h-40 bg-ink/5 rounded-lg mb-3" />
          <div className="h-5 w-3/4 bg-ink/8 rounded mb-2" />
          <div className="h-4 w-full bg-ink/5 rounded mb-1" />
          <div className="h-4 w-2/3 bg-ink/5 rounded" />
        </div>
      ))}
    </div>
  )
}
