import { auth } from "@/lib/supabase/auth";
import {
  createModelPricing,
  deleteModelPricing,
  getAllModelPricing,
  updateModelPricing,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Helper to validate org admin access. */
async function requireOrgAdmin(slug: string) {
  const session = await auth(slug);
  if (!session?.user || !session?.org) {
    return { error: new ChatbotError("unauthorized:chat").toResponse() };
  }
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return { error: Response.json({ error: "Forbidden. Admin access required." }, { status: 403 }) };
  }
  return { session, orgId: session.org.id };
}

/** GET /api/admin/pricing — list all model pricing rules. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  try {
    const pricing = await getAllModelPricing(guard.orgId);
    return Response.json({ pricing });
  } catch (err) {
    console.error("Failed to fetch pricing:", err);
    return Response.json({ error: "Failed to fetch pricing." }, { status: 500 });
  }
}

/** POST /api/admin/pricing — create a new pricing rule. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  let body: { modelPattern?: string; promptPricePer1kTokens?: string; completionPricePer1kTokens?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { modelPattern, promptPricePer1kTokens, completionPricePer1kTokens } = body;
  if (!modelPattern || promptPricePer1kTokens == null || completionPricePer1kTokens == null) {
    return Response.json(
      { error: "modelPattern, promptPricePer1kTokens, and completionPricePer1kTokens are required." },
      { status: 400 },
    );
  }

  try {
    const created = await createModelPricing({
      modelPattern,
      promptPricePer1kTokens: String(promptPricePer1kTokens),
      completionPricePer1kTokens: String(completionPricePer1kTokens),
      orgId: guard.orgId,
    });
    return Response.json(created, { status: 201 });
  } catch (err) {
    console.error("Failed to create pricing:", err);
    return Response.json({ error: "Failed to create pricing rule." }, { status: 500 });
  }
}

/** PATCH /api/admin/pricing — update an existing pricing rule. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  let body: {
    id?: string;
    modelPattern?: string;
    promptPricePer1kTokens?: string;
    completionPricePer1kTokens?: string;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.id) {
    return Response.json({ error: "id is required." }, { status: 400 });
  }

  try {
    const { id, ...data } = body;
    const updated = await updateModelPricing(id, guard.orgId, data);
    return Response.json(updated);
  } catch (err) {
    console.error("Failed to update pricing:", err);
    return Response.json({ error: "Failed to update pricing rule." }, { status: 500 });
  }
}

/** DELETE /api/admin/pricing — delete a pricing rule. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.id) {
    return Response.json({ error: "id is required." }, { status: 400 });
  }

  try {
    await deleteModelPricing(body.id, guard.orgId);
    return Response.json({ success: true });
  } catch (err) {
    console.error("Failed to delete pricing:", err);
    return Response.json({ error: "Failed to delete pricing rule." }, { status: 500 });
  }
}

