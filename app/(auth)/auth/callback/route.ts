import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createProfile,
  getAllowedDomainByEmail,
  getInvitationByToken,
  getProfileById,
  markInvitationAccepted,
} from "@/lib/db/queries";

/**
 * GET /auth/callback
 *
 * Handles the OAuth callback from Supabase Auth (Azure AD / GitLab).
 * Exchanges the authorisation code for a session, then:
 * 1. If the user already has a profile → redirect to home.
 * 2. If the user has a pending invitation → create profile per invitation.
 * 3. If the user's email domain is whitelisted → auto-provision with configured role.
 * 4. Otherwise → redirect to /no-access.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Cookie setting may fail in certain contexts — safe to ignore
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Code exchange error:", error.message);
    return NextResponse.redirect(`${origin}/login`);
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Check if user already has a profile
  const existingProfile = await getProfileById(user.id);

  if (existingProfile) {
    // User already exists — proceed to app
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Determine the SSO provider and display name from Supabase user metadata
  const ssoProvider = (user.app_metadata?.provider as string) ?? null;
  const ssoDisplayName =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    null;

  // Check for a pending invitation first (invitations take precedence)
  const invitationToken = searchParams.get("invitation_token");

  if (invitationToken) {
    const inv = await getInvitationByToken(invitationToken);
    if (inv) {
      await createProfile({
        id: user.id,
        email: user.email,
        role: inv.role,
        invitedBy: inv.invitedBy,
        ssoProvider,
        displayName: ssoDisplayName || inv.displayName || null,
      });
      await markInvitationAccepted(invitationToken);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Check domain whitelist for auto-provisioning
  const emailDomain = user.email.split("@")[1]?.toLowerCase();

  if (emailDomain && ssoProvider) {
    const domainEntry = await getAllowedDomainByEmail(
      emailDomain,
      ssoProvider,
    );

    if (domainEntry) {
      await createProfile({
        id: user.id,
        email: user.email,
        role: domainEntry.defaultRole,
        ssoProvider,
        displayName: ssoDisplayName,
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No profile, no invitation, no whitelisted domain → no access
  return NextResponse.redirect(`${origin}/no-access`);
}

