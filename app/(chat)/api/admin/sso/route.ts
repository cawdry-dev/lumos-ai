import { auth } from "@/lib/supabase/auth";
import {
  createAllowedDomain,
  deleteAllowedDomain,
  getAllowedDomains,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sso
 *
 * Returns all whitelisted domains. Only accessible by admins.
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can manage SSO settings." },
      { status: 403 },
    );
  }

  try {
    const domains = await getAllowedDomains();
    return Response.json(
      domains.map((d) => ({
        id: d.id,
        domain: d.domain,
        defaultRole: d.defaultRole,
        ssoProvider: d.ssoProvider,
        createdAt: d.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("Failed to fetch allowed domains:", error);
    return Response.json(
      { error: "Failed to fetch allowed domains." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/sso
 *
 * Adds a new whitelisted domain. Only accessible by admins.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can manage SSO settings." },
      { status: 403 },
    );
  }

  let body: { domain?: string; defaultRole?: string; ssoProvider?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { domain, defaultRole = "editor", ssoProvider = "any" } = body;

  if (!domain || typeof domain !== "string") {
    return Response.json(
      { error: "A valid domain is required." },
      { status: 400 },
    );
  }

  if (!["admin", "editor"].includes(defaultRole)) {
    return Response.json(
      { error: 'Default role must be either "admin" or "editor".' },
      { status: 400 },
    );
  }

  if (!["any", "azure", "gitlab"].includes(ssoProvider)) {
    return Response.json(
      { error: 'SSO provider must be "any", "azure", or "gitlab".' },
      { status: 400 },
    );
  }

  try {
    const created = await createAllowedDomain({
      domain,
      defaultRole,
      ssoProvider,
      createdBy: session.user.id,
    });

    return Response.json({
      id: created.id,
      domain: created.domain,
      defaultRole: created.defaultRole,
      ssoProvider: created.ssoProvider,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to create allowed domain:", error);
    return Response.json(
      { error: "Failed to add domain." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/sso
 *
 * Removes a whitelisted domain by ID. Only accessible by admins.
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
      { error: "Forbidden. Only admins can manage SSO settings." },
      { status: 403 },
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
      { error: "A valid domain ID is required." },
      { status: 400 },
    );
  }

  try {
    await deleteAllowedDomain(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete allowed domain:", error);
    return Response.json(
      { error: "Failed to remove domain." },
      { status: 500 },
    );
  }
}

