import "server-only";

import { getProfileById } from "@/lib/db/queries";
import { createClient } from "./server";

/**
 * Represents the authenticated user session returned by Supabase Auth.
 * Includes profile data (role, display name) from the User table.
 */
export type Session = {
  user: {
    id: string;
    email: string;
    role: string;
    displayName: string | null;
  };
};

export type UserType = "admin" | "editor";

/**
 * Retrieves the currently authenticated user from Supabase Auth.
 * Fetches the user's profile from the database to include role information.
 * Returns null if the user is not authenticated or has no profile row.
 */
export async function auth(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[auth] Supabase getUser error:", authError.message);
  }

  if (!user) {
    console.error("[auth] No user from supabase.auth.getUser()");
    return null;
  }

  console.error("[auth] User found:", user.id, user.email);

  // Fetch the profile from the User table; if no profile exists the user is not fully registered
  try {
    const profile = await getProfileById(user.id);
    if (!profile) {
      console.error("[auth] No profile found for user:", user.id);
      return null;
    }
    console.error("[auth] Profile found, role:", profile.role);

    return {
      user: {
        id: user.id,
        email: user.email ?? "",
        role: profile.role,
        displayName: profile.displayName ?? null,
      },
    };
  } catch (error) {
    console.error("[auth] getProfileById threw:", error);
    return null;
  }
}

