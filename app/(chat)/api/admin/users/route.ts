import { auth } from "@/lib/supabase/auth";
import { updateUserRole } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users
 *
 * Updates a user's role. Only accessible by admins.
 */
export async function PATCH(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can update user roles." },
      { status: 403 }
    );
  }

  let body: { userId?: string; role?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId, role } = body;

  if (!userId || typeof userId !== "string") {
    return Response.json(
      { error: "A valid userId is required." },
      { status: 400 }
    );
  }

  if (!role || !["admin", "editor"].includes(role)) {
    return Response.json(
      { error: 'Role must be either "admin" or "editor".' },
      { status: 400 }
    );
  }

  // Prevent self-demotion
  if (userId === session.user.id) {
    return Response.json(
      { error: "You cannot change your own role." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateUserRole(userId, role);
    return Response.json(updated);
  } catch (error) {
    console.error("Failed to update user role:", error);
    return Response.json(
      { error: "Failed to update user role." },
      { status: 500 }
    );
  }
}

