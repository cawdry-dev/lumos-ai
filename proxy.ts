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
  const { response: supabaseResponse, supabase } =
    await updateSession(request);

  // Allow auth callback routes to pass through without further checks
  if (pathname.startsWith("/auth")) {
    return supabaseResponse;
  }

  // Check whether the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Paths that should be accessible without a profile row
  const publicPaths = ["/login", "/register", "/no-access"];

  // MFA pages are accessible to authenticated users at AAL1
  const mfaPaths = ["/mfa/enrol", "/mfa/verify", "/mfa/recovery"];

  if (!user) {
    // API routes should return 401 instead of redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }
    // Unauthenticated page requests are redirected to the login page
    if (!publicPaths.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Check whether the authenticated user has a profile row in the User table.
  // If not, they signed up via Supabase Auth but were never fully registered
  // (e.g. invitation was not used). Redirect them to /no-access.
  if (
    !publicPaths.includes(pathname) &&
    !mfaPaths.includes(pathname)
  ) {
    const { data: profile } = await supabase
      .from("User")
      .select("id, mfaExempt")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "No access. Profile not found." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/no-access", request.url));
    }

    // -----------------------------------------------------------------------
    // MFA enforcement
    // -----------------------------------------------------------------------
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal) {
      const needsMfa =
        aal.currentLevel === "aal1" && aal.nextLevel === "aal2";
      const hasNoFactors =
        !aal.currentAuthenticationMethods ||
        aal.currentAuthenticationMethods.length === 0 ||
        (aal.currentLevel === "aal1" && aal.nextLevel === "aal1");

      if (needsMfa) {
        // User has MFA factors enrolled but hasn't verified yet — challenge
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "MFA verification required." },
            { status: 403 }
          );
        }
        return NextResponse.redirect(
          new URL("/mfa/verify", request.url)
        );
      }

      // User has no MFA factors enrolled and is not exempt — force enrolment
      if (
        hasNoFactors &&
        aal.nextLevel === "aal1" &&
        !profile.mfaExempt
      ) {
        // Check if user actually has any enrolled factors
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = [
          ...(factors?.totp ?? []),
          ...(factors?.phone ?? []),
        ].filter((f) => f.status === "verified");

        if (verifiedFactors.length === 0) {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { error: "MFA enrolment required." },
              { status: 403 }
            );
          }
          return NextResponse.redirect(
            new URL("/mfa/enrol", request.url)
          );
        }
      }
    }
  }

  // MFA pages: redirect to home if user already has AAL2 or is exempt
  if (mfaPaths.includes(pathname)) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") {
      return NextResponse.redirect(new URL("/", request.url));
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
