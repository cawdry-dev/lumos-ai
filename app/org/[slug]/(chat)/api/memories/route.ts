import { auth } from "@/lib/supabase/auth";
import {
  createMemory,
  deleteMemory,
  getMemoriesByUserId,
  searchMemories,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/memories
 *
 * Lists memories for the current user within the current organisation.
 * Supports optional `?q=` search parameter for case-insensitive content search.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const orgId = session.org.id;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const memories = query
      ? await searchMemories(session.user.id, query, orgId)
      : await getMemoriesByUserId(session.user.id, orgId);

    return Response.json(memories);
  } catch (error) {
    console.error("Failed to list memories:", error);
    return Response.json(
      { error: "Failed to list memories." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/memories
 *
 * Creates a new memory for the current user.
 * Body: { content: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const orgId = session.org.id;

  let body: { content?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { content } = body;

  if (typeof content !== "string" || content.trim().length === 0) {
    return Response.json(
      { error: "content must be a non-empty string." },
      { status: 400 },
    );
  }

  if (content.length > 1000) {
    return Response.json(
      { error: "content must be at most 1000 characters." },
      { status: 400 },
    );
  }

  try {
    const created = await createMemory(session.user.id, content.trim(), orgId);
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create memory:", error);
    return Response.json(
      { error: "Failed to create memory." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/memories
 *
 * Deletes a specific memory belonging to the current user.
 * Body: { id: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let body: { id?: unknown };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id } = body;

  if (typeof id !== "string" || id.trim().length === 0) {
    return Response.json(
      { error: "id must be a non-empty string." },
      { status: 400 },
    );
  }

  try {
    await deleteMemory(id, session.user.id, session.org.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete memory:", error);
    return Response.json(
      { error: "Failed to delete memory." },
      { status: 500 },
    );
  }
}

