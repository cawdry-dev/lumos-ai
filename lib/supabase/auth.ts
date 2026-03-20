import "server-only";

import {
  getProfileById,
  getOrganizationBySlug,
  getOrganizationMembership,
} from "@/lib/db/queries";
import { createClient } from "./server";

/**
 * Organisation context attached to the session when the user is
 * operating within a specific organisation.
 */
export type SessionOrg = {
  id: string;
  name: string;
  slug: string;
  role: string;
  billingModel: string;
};

/**
 * Represents the authenticated user session returned by Supabase Auth.
 * Includes profile data (role, display name) from the User table and,
 * optionally, the organisation the user is currently operating within.
 */
export type Session = {
  user: {
    id: string;
    email: string;
    role: string;
    displayName: string | null;
    ssoProvider: string | null;
    accentColour: string | null;
    ttsVoice: string | null;
    customInstructions: string | null;
    occupation: string | null;
    aboutYou: string | null;
    memoryEnabled: boolean;
    isGlobalAdmin: boolean;
  };
  org?: SessionOrg;
};

export type UserType = "admin" | "editor";

/**
 * Retrieves the currently authenticated user from Supabase Auth.
 * Fetches the user's profile from the database to include role information.
 *
 * When `orgSlug` is provided the function looks up the organisation and
 * verifies that the user is a member, attaching the org context to the
 * returned session.  If the organisation does not exist or the user is
 * not a member, `null` is returned.
 *
 * When `orgSlug` is omitted the session is returned without org context
 * (useful for the organisation picker page).
 */
export async function auth(
  orgSlug?: string,
): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[auth] Supabase getUser error:", authError.message);
  }

  if (!user) {
    console.log("[auth] No user from supabase.auth.getUser()");
    return null;
  }

  console.log("[auth] User found:", user.id);

  // Fetch the profile from the User table; if no profile exists the user is not fully registered
  try {
    const profile = await getProfileById(user.id);
    if (!profile) {
      console.log("[auth] No profile found for user:", user.id);
      return null;
    }
    console.log("[auth] Profile found, role:", profile.role);

    const session: Session = {
      user: {
        id: user.id,
        email: user.email ?? "",
        role: profile.role,
        displayName: profile.displayName ?? null,
        ssoProvider: profile.ssoProvider ?? null,
        accentColour: profile.accentColour ?? null,
        ttsVoice: profile.ttsVoice ?? null,
        customInstructions: profile.customInstructions ?? null,
        occupation: profile.occupation ?? null,
        aboutYou: profile.aboutYou ?? null,
        memoryEnabled: profile.memoryEnabled,
        isGlobalAdmin: profile.isGlobalAdmin,
      },
    };

    // If an org slug was provided, resolve and attach org context
    if (orgSlug) {
      const org = await getOrganizationBySlug(orgSlug);
      if (!org) {
        console.log("[auth] Organisation not found for slug:", orgSlug);
        return null;
      }

      const membership = await getOrganizationMembership(org.id, user.id);
      if (!membership && !profile.isGlobalAdmin) {
        console.log("[auth] User is not a member of org:", orgSlug);
        return null;
      }

      session.org = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: membership?.role ?? "admin", // global admins default to admin role
        billingModel: org.billingModel,
      };
    }

    return session;
  } catch (error) {
    console.error("[auth] getProfileById threw:", error);
    return null;
  }
}

