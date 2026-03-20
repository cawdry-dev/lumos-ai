import { auth } from "@/lib/supabase/auth";
import {
  getOrganizationMembers,
  getUserByEmail,
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * GET /org/[slug]/api/org/members
 *
 * Returns all members of the current organisation.
 * Only accessible by org admins/owners.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json(
      { error: "Forbidden. Only admins can view members." },
      { status: 403 },
    );
  }

  try {
    const members = await getOrganizationMembers(session.org.id);
    return Response.json(members);
  } catch (error) {
    console.error("Failed to get members:", error);
    return Response.json({ error: "Failed to get members." }, { status: 500 });
  }
}

/**
 * POST /org/[slug]/api/org/members
 *
 * Adds a user to the organisation by email.
 * Only accessible by org admins/owners.
 * Accepts { email: string, role: "admin" | "member" }.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json(
      { error: "Forbidden. Only admins can add members." },
      { status: 403 },
    );
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { email, role } = body;

  if (!email || typeof email !== "string") {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  if (!role || !["admin", "member"].includes(role)) {
    return Response.json(
      { error: "Role must be 'admin' or 'member'." },
      { status: 400 },
    );
  }

  try {
    const targetUser = await getUserByEmail(email.trim().toLowerCase());
    if (!targetUser) {
      return Response.json(
        { error: "No user found with that email address." },
        { status: 404 },
      );
    }

    await addOrganizationMember({
      orgId: session.org.id,
      userId: targetUser.id,
      role: role as "admin" | "member",
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to add member:", error);
    return Response.json(
      { error: "Failed to add member. They may already be a member." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /org/[slug]/api/org/members
 *
 * Updates a member's role. Accepts { userId: string, role: "admin" | "member" }.
 * Only accessible by org admins/owners.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json(
      { error: "Forbidden. Only admins can change roles." },
      { status: 403 },
    );
  }

  let body: { userId?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId, role } = body;

  if (!userId || !role || !["owner", "admin", "member"].includes(role)) {
    return Response.json(
      { error: "userId and a valid role are required." },
      { status: 400 },
    );
  }

  try {
    const updated = await updateOrganizationMemberRole(
      session.org.id,
      userId,
      role as "owner" | "admin" | "member",
    );
    return Response.json(updated);
  } catch (error) {
    console.error("Failed to update member role:", error);
    return Response.json(
      { error: "Failed to update member role." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /org/[slug]/api/org/members
 *
 * Removes a member from the organisation. Accepts { userId: string }.
 * Only accessible by org admins/owners.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json(
      { error: "Forbidden. Only admins can remove members." },
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

  if (!userId) {
    return Response.json({ error: "userId is required." }, { status: 400 });
  }

  // Prevent removing yourself
  if (userId === session.user.id) {
    return Response.json(
      { error: "You cannot remove yourself from the organisation." },
      { status: 400 },
    );
  }

  try {
    await removeOrganizationMember(session.org.id, userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return Response.json(
      { error: "Failed to remove member." },
      { status: 500 },
    );
  }
}

