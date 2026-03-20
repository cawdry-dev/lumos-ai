import { type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { getMfaExemptStatus, setMfaExempt } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id]/mfa
 *
 * Returns the MFA exemption status for a user.
 * Only accessible by admins.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json(
      { error: "Forbidden. Only admins can manage MFA exemptions." },
      { status: 403 }
    );
  }

  try {
    const mfaExempt = await getMfaExemptStatus(id);
    return Response.json({ mfaExempt });
  } catch (error) {
    console.error("Failed to get MFA exempt status:", error);
    return Response.json(
      { error: "Failed to get MFA exempt status." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]/mfa
 *
 * Toggles the MFA exemption for a user.
 * Accepts { mfaExempt: boolean }.
 * Only accessible by admins.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json(
      { error: "Forbidden. Only admins can manage MFA exemptions." },
      { status: 403 }
    );
  }

  let body: { mfaExempt?: boolean };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (typeof body.mfaExempt !== "boolean") {
    return Response.json(
      { error: "The mfaExempt field must be a boolean." },
      { status: 400 }
    );
  }

  try {
    const updated = await setMfaExempt(id, body.mfaExempt);
    if (!updated) {
      return Response.json(
        { error: "User not found." },
        { status: 404 }
      );
    }
    return Response.json({ success: true, mfaExempt: updated.mfaExempt });
  } catch (error) {
    console.error("Failed to update MFA exempt status:", error);
    return Response.json(
      { error: "Failed to update MFA exempt status." },
      { status: 500 }
    );
  }
}

