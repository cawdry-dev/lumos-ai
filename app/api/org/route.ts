import { auth } from "@/lib/supabase/auth";
import {
  createOrganization,
  addOrganizationMember,
  getOrganizationsByUserId,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/org
 *
 * Returns all organisations the current user belongs to.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const orgs = await getOrganizationsByUserId(session.user.id);
    return Response.json(orgs);
  } catch (error) {
    console.error("Failed to list organisations:", error);
    return Response.json(
      { error: "Failed to list organisations." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/org
 *
 * Creates a new organisation and adds the current user as owner.
 * Accepts { name: string, slug: string }.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, slug } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return Response.json(
      { error: "Organisation name is required." },
      { status: 400 },
    );
  }

  if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
    return Response.json(
      { error: "Organisation slug is required." },
      { status: 400 },
    );
  }

  // Validate slug format: lowercase alphanumeric and hyphens only
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    return Response.json(
      { error: "Slug must contain only lowercase letters, numbers, and hyphens." },
      { status: 400 },
    );
  }

  try {
    const org = await createOrganization({ name: name.trim(), slug: slug.trim() });
    await addOrganizationMember({
      orgId: org.id,
      userId: session.user.id,
      role: "owner",
    });

    return Response.json(org, { status: 201 });
  } catch (error) {
    console.error("Failed to create organisation:", error);
    return Response.json(
      { error: "Failed to create organisation. The slug may already be in use." },
      { status: 500 },
    );
  }
}

