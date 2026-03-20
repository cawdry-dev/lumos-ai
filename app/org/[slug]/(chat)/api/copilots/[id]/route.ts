import { type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import {
  getCopilotById,
  updateCopilot,
  deleteCopilot,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Shared org admin guard — returns a Response if the user is not an org admin/owner. */
async function requireOrgAdmin(slug: string) {
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return {
      error: new ChatbotError("unauthorized:chat").toResponse(),
    };
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return {
      error: Response.json(
        { error: "Forbidden. Only admins can manage co-pilots." },
        { status: 403 }
      ),
    };
  }

  return { session, orgId: session.org.id };
}

/**
 * GET /api/copilots/[id]
 *
 * Returns a single co-pilot by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  try {
    const row = await getCopilotById(id, guard.orgId);
    if (!row) {
      return Response.json({ error: "Co-pilot not found." }, { status: 404 });
    }
    return Response.json({ copilot: row });
  } catch (error) {
    console.error("Failed to fetch co-pilot:", error);
    return Response.json(
      { error: "Failed to fetch co-pilot." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/copilots/[id]
 *
 * Updates a co-pilot.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Only allow known fields
  const allowed = [
    "name",
    "description",
    "emoji",
    "type",
    "systemPrompt",
    "dbConnectionString",
    "dbType",
    "sshHost",
    "sshPort",
    "sshUsername",
    "sshPrivateKey",
    "modelId",
    "mcpServers",
    "enabledTools",
    "isActive",
  ] as const;

  const values: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      values[key] = body[key];
    }
  }

  if (values.type && !["knowledge", "data"].includes(values.type as string)) {
    return Response.json(
      { error: 'Type must be either "knowledge" or "data".' },
      { status: 400 }
    );
  }

  try {
    const updated = await updateCopilot(id, guard.orgId, values as Parameters<typeof updateCopilot>[2]);
    if (!updated) {
      return Response.json({ error: "Co-pilot not found." }, { status: 404 });
    }
    return Response.json({ copilot: updated });
  } catch (error) {
    console.error("Failed to update co-pilot:", error);
    return Response.json(
      { error: "Failed to update co-pilot." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/copilots/[id]
 *
 * Deletes a co-pilot.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  try {
    const deleted = await deleteCopilot(id, guard.orgId);
    if (!deleted) {
      return Response.json({ error: "Co-pilot not found." }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete co-pilot:", error);
    return Response.json(
      { error: "Failed to delete co-pilot." },
      { status: 500 }
    );
  }
}

