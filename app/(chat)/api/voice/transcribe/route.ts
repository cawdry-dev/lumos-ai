import { auth } from "@/lib/supabase/auth";
import { transcribeAudio } from "@/lib/ai/voice";

/**
 * POST /api/voice/transcribe
 *
 * Receives an audio blob (multipart form data) and returns
 * transcribed text via OpenAI Whisper API.
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
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return Response.json(
        { error: "No audio file provided." },
        { status: 400 },
      );
    }

    // Validate file size (max 25MB — OpenAI Whisper limit)
    const maxSizeBytes = 25 * 1024 * 1024;
    if (audioFile.size > maxSizeBytes) {
      return Response.json(
        { error: "Audio file exceeds 25MB limit." },
        { status: 400 },
      );
    }

    const chatId = formData.get("chatId") as string | null;

    const result = await transcribeAudio({
      audioFile,
      userId: session.user.id,
      chatId,
    });

    return Response.json({
      text: result.text,
      durationSeconds: result.durationSeconds,
    });
  } catch (error) {
    console.error("[voice/transcribe] Error:", error);
    return Response.json(
      { error: "Failed to transcribe audio. Please try again." },
      { status: 500 },
    );
  }
}

