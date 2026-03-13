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
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch the profile from the User table; if no profile exists the user is not fully registered
  const profile = await getProfileById(user.id);
  if (!profile) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      role: profile.role,
      displayName: profile.displayName ?? null,
    },
  };
}

