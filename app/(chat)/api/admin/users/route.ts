import { auth } from "@/lib/supabase/auth";
import { updateUserRole, deleteUser } from "@/lib/db/queries";
import { createServiceClient } from "@/lib/supabase/server";

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



/**
 * DELETE /api/admin/users
 *
 * Deletes a user and all their data. Only accessible by admins.
 * Cannot delete yourself.
 */
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can delete users." },
      { status: 403 },
    );
  }

  let body: { userId?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    return Response.json(
      { error: "A valid userId is required." },
      { status: 400 },
    );
  }

  if (userId === session.user.id) {
    return Response.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  try {
    // Delete all user data from the database
    await deleteUser(userId);

    // Delete the user from Supabase Auth
    const supabase = createServiceClient();
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Failed to delete user from Supabase Auth:", authError);
      // DB deletion already succeeded; log but don't fail the request
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return Response.json(
      { error: "Failed to delete user." },
      { status: 500 },
    );
  }
}