import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js middleware to handle Supabase session refresh.
 * This runs on every request to keep auth sessions alive.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

/**
 * Configure which routes the middleware should run on.
 * Excludes static assets and Next.js internal routes.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
