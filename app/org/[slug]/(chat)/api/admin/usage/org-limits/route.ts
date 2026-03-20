import { auth } from "@/lib/supabase/auth";
import { getOrgCostLimits, setOrgCostLimits } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/** GET /api/admin/usage/org-limits — get the organisation's cost limits. */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const session = await auth(slug);
  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const limits = await getOrgCostLimits(session.org.id);
  return Response.json({
    dailyCostLimitCents: limits?.dailyCostLimitCents ?? null,
    monthlyCostLimitCents: limits?.monthlyCostLimitCents ?? null,
    billingModel: limits?.billingModel ?? session.org.billingModel,
  });
}

/** PUT /api/admin/usage/org-limits — set the organisation's cost limits. */
export async function PUT(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const session = await auth(slug);
  if (!session?.user || !session?.org) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const body = await request.json();
  const dailyCostLimitCents = body.dailyCostLimitCents ?? null;
  const monthlyCostLimitCents = body.monthlyCostLimitCents ?? null;

  // Validate: limits must be null or positive integers
  if (dailyCostLimitCents !== null && (typeof dailyCostLimitCents !== "number" || dailyCostLimitCents < 0)) {
    return Response.json({ error: "dailyCostLimitCents must be a positive number or null." }, { status: 400 });
  }
  if (monthlyCostLimitCents !== null && (typeof monthlyCostLimitCents !== "number" || monthlyCostLimitCents < 0)) {
    return Response.json({ error: "monthlyCostLimitCents must be a positive number or null." }, { status: 400 });
  }

  const updated = await setOrgCostLimits(session.org.id, {
    dailyCostLimitCents,
    monthlyCostLimitCents,
  });

  return Response.json({
    dailyCostLimitCents: updated.dailyCostLimitCents,
    monthlyCostLimitCents: updated.monthlyCostLimitCents,
  });
}

