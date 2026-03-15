import { auth } from "@/lib/supabase/auth";
import { getAvailableCopilots } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

/**
 * GET /api/copilots/available
 *
 * Returns the list of active co-pilots the current user has access to.
 * A co-pilot is accessible when it has no explicit access rows (open to
 * all) or the user has been granted access.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const copilots = await getAvailableCopilots(session.user.id);

    return Response.json(copilots, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error("Failed to fetch available co-pilots:", error);
    return new ChatbotError("bad_request:api").toResponse();
  }
}

