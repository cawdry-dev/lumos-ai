import { auth } from "@/lib/supabase/auth";
import { updateOrganization } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * PATCH /org/[slug]/api/org/settings
 *
 * Updates the current organisation's name and/or billing model.
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
      { error: "Forbidden. Only admins can update organisation settings." },
      { status: 403 },
    );
  }

  let body: { name?: string; billingModel?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, billingModel } = body;

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return Response.json(
      { error: "Organisation name must be a non-empty string." },
      { status: 400 },
    );
  }

  if (billingModel !== undefined && !["per_token", "per_seat"].includes(billingModel)) {
    return Response.json(
      { error: "Billing model must be 'per_token' or 'per_seat'." },
      { status: 400 },
    );
  }

  try {
    const updated = await updateOrganization(session.org.id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(billingModel !== undefined ? { billingModel } : {}),
    });

    return Response.json(updated);
  } catch (error) {
    console.error("Failed to update organisation:", error);
    return Response.json(
      { error: "Failed to update organisation." },
      { status: 500 },
    );
  }
}

