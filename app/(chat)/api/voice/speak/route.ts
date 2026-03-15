import { auth } from "@/lib/supabase/auth";
import { generateSpeech } from "@/lib/ai/voice";
import { getProfileById } from "@/lib/db/queries";

/**
 * POST /api/voice/speak
 *
 * Receives message text and returns streamed MP3 audio
 * generated via OpenAI TTS API.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { text, chatId } = body as { text?: string; chatId?: string };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return Response.json(
        { error: "No text provided." },
        { status: 400 },
      );
    }

    // Limit text length to prevent excessive costs (roughly 5000 chars)
    const maxChars = 5000;
    const truncatedText = text.slice(0, maxChars);

    const userRow = await getProfileById(session.user.id);
    const voice = userRow?.ttsVoice ?? "alloy";

    const audioStream = await generateSpeech({
      text: truncatedText,
      userId: session.user.id,
      chatId: chatId ?? null,
      voice,
    });

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[voice/speak] Error:", error);
    return Response.json(
      { error: "Failed to generate speech. Please try again." },
      { status: 500 },
    );
  }
}

