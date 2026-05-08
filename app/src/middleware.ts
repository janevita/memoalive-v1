import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/memories/new', '/events/new', '/search', '/profile', '/import', '/scrapbooks', '/journals']
const AUTH_ROUTES = ['/login', '/signup']

const SCRAPBOOK_SHARE_RE = /^\/scrapbooks\/s\//
const MEMORY_DETAIL_RE   = /^\/events\/[^/]+\/memories\/[^/]+/
const GROUP_PAGE_RE      = /^\/events\/[^/]+(\/.*)?$/
const JOIN_RE            = /^\/join\//

export async function middleware(request: NextRequest) {
  // If env vars are missing, skip auth checks gracefully
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
    && !SCRAPBOOK_SHARE_RE.test(pathname)
    && !MEMORY_DETAIL_RE.test(pathname)
    && !GROUP_PAGE_RE.test(pathname)
    && !JOIN_RE.test(pathname)
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
