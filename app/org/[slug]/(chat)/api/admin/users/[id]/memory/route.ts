import { auth } from "@/lib/supabase/auth";
import {
  getProfileById,
  getMemoryCount,
  updateProfile,
  deleteAllMemoriesByUserId,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string; id: string }> };

/** GET /api/admin/users/[id]/memory — get a user's memory status and count. */
export async function GET(_request: Request, context: RouteContext) {
  const { slug, id } = await context.params;
  const session = await auth(slug);
  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const profile = await getProfileById(id);
    if (!profile) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const memoryCount = await getMemoryCount(id, session.org.id);

    return Response.json({
      memoryEnabled: profile.memoryEnabled,
      memoryCount,
    });
  } catch (err) {
    console.error("Failed to get user memory status:", err);
    return Response.json({ error: "Failed to get user memory status." }, { status: 500 });
  }
}

/** PUT /api/admin/users/[id]/memory — toggle memory for a user. */
export async function PUT(request: Request, context: RouteContext) {
  const { slug, id } = await context.params;
  const session = await auth(slug);
  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  let body: { memoryEnabled: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.memoryEnabled !== "boolean") {
    return Response.json({ error: "memoryEnabled must be a boolean." }, { status: 400 });
  }

  try {
    const updated = await updateProfile(id, { memoryEnabled: body.memoryEnabled });
    if (!updated) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    const memoryCount = await getMemoryCount(id, session.org.id);

    return Response.json({
      memoryEnabled: updated.memoryEnabled,
      memoryCount,
    });
  } catch (err) {
    console.error("Failed to update user memory setting:", err);
    return Response.json({ error: "Failed to update user memory setting." }, { status: 500 });
  }
}

/** DELETE /api/admin/users/[id]/memory — clear all memories for a user. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { slug, id } = await context.params;
  const session = await auth(slug);
  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    await deleteAllMemoriesByUserId(id, session.org.id);
    return Response.json({ success: true, cleared: true });
  } catch (err) {
    console.error("Failed to clear user memories:", err);
    return Response.json({ error: "Failed to clear user memories." }, { status: 500 });
  }
}

