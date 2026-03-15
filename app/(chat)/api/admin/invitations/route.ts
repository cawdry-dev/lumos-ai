import { auth } from "@/lib/supabase/auth";
import {
  createInvitation,
  getPendingInvitations,
  revokeInvitation,
} from "@/lib/db/queries";
import { sendInvitationEmail } from "@/lib/email/resend";

/**
 * POST /api/admin/invitations
 *
 * Creates a new invitation and sends an email to the invitee.
 * Only accessible by users with the "admin" role.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can create invitations." },
      { status: 403 }
    );
  }

  let body: { email?: string; role?: string; displayName?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { email, role = "editor", displayName } = body;

  if (!email || typeof email !== "string") {
    return Response.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  if (!["admin", "editor"].includes(role)) {
    return Response.json(
      { error: 'Role must be either "admin" or "editor".' },
      { status: 400 }
    );
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    const trimmedDisplayName = displayName?.trim() || undefined;

    const invitation = await createInvitation({
      email,
      role,
      invitedBy: session.user.id,
      token,
      expiresAt,
      displayName: trimmedDisplayName,
    });

    await sendInvitationEmail({
      to: email,
      inviterEmail: session.user.email,
      role,
      token,
      expiresAt,
      displayName: trimmedDisplayName,
    });

    return Response.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return Response.json(
      { error: "Failed to create invitation. Please try again." },
      { status: 500 }
    );
  }
}



/**
 * GET /api/admin/invitations
 *
 * Returns all pending invitations. Only accessible by admins.
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can view invitations." },
      { status: 403 }
    );
  }

  try {
    const invitations = await getPendingInvitations();
    return Response.json(invitations);
  } catch (error) {
    console.error("Failed to fetch invitations:", error);
    return Response.json(
      { error: "Failed to fetch invitations." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/invitations
 *
 * Revokes (deletes) an invitation by ID. Only accessible by admins.
 */
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can revoke invitations." },
      { status: 403 }
    );
  }

  let body: { id?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id } = body;

  if (!id || typeof id !== "string") {
    return Response.json(
      { error: "A valid invitation ID is required." },
      { status: 400 }
    );
  }

  try {
    await revokeInvitation(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke invitation:", error);
    return Response.json(
      { error: "Failed to revoke invitation." },
      { status: 500 }
    );
  }
}
