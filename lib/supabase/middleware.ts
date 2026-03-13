import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Updates the Supabase auth session by refreshing expired tokens.
 * Should be called from Next.js middleware to keep sessions alive.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({
            request,
          })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // IMPORTANT: Do not add logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very
  // difficult to debug issues with users being randomly logged out.

  // Refresh the auth token if needed
  await supabase.auth.getUser()

  // IMPORTANT: You *must* return the supabaseResponse object as-is.
  // If you create a new response object (e.g. NextResponse.next()),
  // ensure you copy over all cookies:
  //   1. Pass the request through: NextResponse.next({ request })
  //   2. Copy the cookies: response.cookies.setAll(supabaseResponse.cookies.getAll())
  //   3. Update the supabaseResponse variable to point to the new response

  return supabaseResponse
}

