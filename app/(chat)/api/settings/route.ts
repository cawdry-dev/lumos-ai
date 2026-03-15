import { auth } from "@/lib/supabase/auth";
import { getProfileById, updateProfile } from "@/lib/db/queries";

/**
 * GET /api/settings
 *
 * Returns the current user's profile (displayName, accentColour, ssoProvider).
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const profile = await getProfileById(session.user.id);
    if (!profile) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    return Response.json({
      displayName: profile.displayName,
      accentColour: profile.accentColour,
      ssoProvider: profile.ssoProvider,
      ttsVoice: profile.ttsVoice,
    });
  } catch (error) {
    console.error("Failed to get profile:", error);
    return Response.json(
      { error: "Failed to get profile." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/settings
 *
 * Updates the current user's profile (displayName, accentColour).
 */
export async function PATCH(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let body: { displayName?: string; accentColour?: string; ttsVoice?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { displayName, accentColour, ttsVoice } = body;

  // Validate accentColour if provided
  if (
    accentColour !== undefined &&
    accentColour !== null &&
    !/^#[0-9a-fA-F]{6}$/.test(accentColour)
  ) {
    return Response.json(
      { error: "accentColour must be a valid hex colour (e.g. #6366f1)." },
      { status: 400 },
    );
  }

  // Validate displayName if provided
  if (displayName !== undefined && typeof displayName !== "string") {
    return Response.json(
      { error: "displayName must be a string." },
      { status: 400 },
    );
  }

  // Validate ttsVoice if provided
  const VALID_VOICES = ["alloy", "ash", "coral", "sage", "echo", "shimmer"];
  if (ttsVoice !== undefined && ttsVoice !== null && !VALID_VOICES.includes(ttsVoice)) {
    return Response.json(
      { error: "Invalid voice." },
      { status: 400 },
    );
  }

  try {
    const updated = await updateProfile(session.user.id, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(accentColour !== undefined ? { accentColour } : {}),
      ...(ttsVoice !== undefined ? { ttsVoice } : {}),
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Failed to update profile:", error);
    return Response.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}

