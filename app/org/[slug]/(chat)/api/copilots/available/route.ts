import { auth } from "@/lib/supabase/auth";
import { getAvailableCopilots } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/copilots/available
 *
 * Returns the list of active co-pilots the current user has access to
 * within the current organisation.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const session = await auth(slug);

    if (!session?.user || !session?.org) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const orgId = session.org.id;
    const copilots = await getAvailableCopilots(session.user.id, orgId);

    // Strip sensitive fields (apiKey) from MCP server configs before sending to client
    const sanitised = copilots.map((c) => ({
      ...c,
      mcpServers: c.mcpServers
        ? c.mcpServers.map(({ apiKey: _apiKey, ...rest }) => rest)
        : c.mcpServers,
      hasMcpTools: Array.isArray(c.mcpServers) && c.mcpServers.length > 0,
    }));

    return Response.json(sanitised, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error("Failed to fetch available co-pilots:", error);
    return new ChatbotError("bad_request:api").toResponse();
  }
}

