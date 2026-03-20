import { auth } from "@/lib/supabase/auth";
import { getProfileById, updateProfile } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 *
 * Returns the current user's profile (displayName, accentColour, ssoProvider).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
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
      customInstructions: profile.customInstructions,
      occupation: profile.occupation,
      aboutYou: profile.aboutYou,
      memoryEnabled: profile.memoryEnabled,
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
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: {
    displayName?: string;
    accentColour?: string;
    ttsVoice?: string;
    customInstructions?: string | null;
    occupation?: string | null;
    aboutYou?: string | null;
    memoryEnabled?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    displayName,
    accentColour,
    ttsVoice,
    customInstructions,
    occupation,
    aboutYou,
    memoryEnabled,
  } = body;

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

  // Validate customInstructions if provided
  if (
    customInstructions !== undefined &&
    customInstructions !== null &&
    (typeof customInstructions !== "string" || customInstructions.length > 2000)
  ) {
    return Response.json(
      { error: "customInstructions must be a string of at most 2000 characters." },
      { status: 400 },
    );
  }

  // Validate occupation if provided
  if (
    occupation !== undefined &&
    occupation !== null &&
    (typeof occupation !== "string" || occupation.length > 100)
  ) {
    return Response.json(
      { error: "occupation must be a string of at most 100 characters." },
      { status: 400 },
    );
  }

  // Validate aboutYou if provided
  if (
    aboutYou !== undefined &&
    aboutYou !== null &&
    (typeof aboutYou !== "string" || aboutYou.length > 2000)
  ) {
    return Response.json(
      { error: "aboutYou must be a string of at most 2000 characters." },
      { status: 400 },
    );
  }

  // Validate memoryEnabled if provided
  if (memoryEnabled !== undefined && typeof memoryEnabled !== "boolean") {
    return Response.json(
      { error: "memoryEnabled must be a boolean." },
      { status: 400 },
    );
  }

  try {
    const updated = await updateProfile(session.user.id, {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(accentColour !== undefined ? { accentColour } : {}),
      ...(ttsVoice !== undefined ? { ttsVoice } : {}),
      ...(customInstructions !== undefined ? { customInstructions } : {}),
      ...(occupation !== undefined ? { occupation } : {}),
      ...(aboutYou !== undefined ? { aboutYou } : {}),
      ...(memoryEnabled !== undefined ? { memoryEnabled } : {}),
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

