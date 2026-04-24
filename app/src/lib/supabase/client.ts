import { createBrowserClient } from '@supabase/ssr'

// Note: Database types are in ./database.types.ts — used for documentation.
// The client uses `any` to avoid complex generic inference issues with hand-written types.
// In production, swap to: createBrowserClient<Database>(...) after running `supabase gen types`.
export function createClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
