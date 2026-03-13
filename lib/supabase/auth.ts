import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/**
 * Represents the authenticated user session returned by Supabase Auth.
 * Provides a minimal session shape for use throughout the application.
 */
export type Session = {
  user: {
    id: string;
    email: string;
  };
};

export type UserType = "regular";

/**
 * Retrieves the currently authenticated user from Supabase Auth.
 * Returns a Session object if authenticated, or null otherwise.
 */
export async function auth(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return toSession(user);
}

/**
 * Converts a Supabase User into the application's Session shape.
 */
function toSession(user: User): Session {
  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
  };
}

