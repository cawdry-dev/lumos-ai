import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Refresh the Supabase auth session (token rotation, cookie sync)
  const supabaseResponse = await updateSession(request);

  // Allow auth callback routes to pass through without further checks
  if (pathname.startsWith("/auth")) {
    return supabaseResponse;
  }

  // Check whether the user is authenticated by inspecting the refreshed cookies
  const {
    data: { user },
  } = await (async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );
    return supabase.auth.getUser();
  })();

  // Paths that should be accessible without a profile row
  const publicPaths = ["/login", "/register", "/no-access"];

  if (!user) {
    // Unauthenticated users are redirected to the login page
    if (!publicPaths.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Check whether the authenticated user has a profile row in the User table.
  // If not, they signed up via Supabase Auth but were never fully registered
  // (e.g. invitation was not used). Redirect them to /no-access.
  if (!publicPaths.includes(pathname)) {
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseForProfile = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: profile } = await supabaseForProfile
      .from("User")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/no-access", request.url));
    }
  }

  // Authenticated users with a profile should not see login/register pages
  if (["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",
    "/no-access",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
