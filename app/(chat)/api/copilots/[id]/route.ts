import { type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import {
  getCopilotById,
  updateCopilot,
  deleteCopilot,
} from "@/lib/db/queries";

/** Shared admin guard — returns a Response if the user is not an admin. */
async function requireAdmin() {
  const session = await auth();

  if (!session) {
    return {
      error: Response.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "admin") {
    return {
      error: Response.json(
        { error: "Forbidden. Only admins can manage co-pilots." },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * GET /api/copilots/[id]
 *
 * Returns a single co-pilot by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;

  try {
    const row = await getCopilotById(id);
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
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;

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
    const updated = await updateCopilot(id, values as Parameters<typeof updateCopilot>[1]);
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
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;

  try {
    const deleted = await deleteCopilot(id);
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

