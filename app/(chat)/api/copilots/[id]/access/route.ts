import { type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import {
  getCopilotAccessUsers,
  grantCopilotAccess,
  revokeCopilotAccess,
  getCopilotById,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/** Shared admin guard. */
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
        { error: "Forbidden. Only admins can manage co-pilot access." },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * GET /api/copilots/[id]/access
 *
 * Returns users with explicit access to this co-pilot.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;

  try {
    const users = await getCopilotAccessUsers(id);
    return Response.json({ users });
  } catch (error) {
    console.error("Failed to fetch co-pilot access:", error);
    return Response.json(
      { error: "Failed to fetch co-pilot access." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/copilots/[id]/access
 *
 * Grants a user access to a co-pilot.
 * Accepts { userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.userId || typeof body.userId !== "string") {
    return Response.json(
      { error: "A valid userId is required." },
      { status: 400 }
    );
  }

  // Verify co-pilot exists
  const cp = await getCopilotById(id);
  if (!cp) {
    return Response.json({ error: "Co-pilot not found." }, { status: 404 });
  }

  try {
    await grantCopilotAccess(id, body.userId, guard.session.user.id);
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to grant co-pilot access:", error);
    return Response.json(
      { error: "Failed to grant access." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/copilots/[id]/access
 *
 * Revokes a user's access to a co-pilot.
 * Accepts { userId: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.userId || typeof body.userId !== "string") {
    return Response.json(
      { error: "A valid userId is required." },
      { status: 400 }
    );
  }

  try {
    await revokeCopilotAccess(id, body.userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke co-pilot access:", error);
    return Response.json(
      { error: "Failed to revoke access." },
      { status: 500 }
    );
  }
}

