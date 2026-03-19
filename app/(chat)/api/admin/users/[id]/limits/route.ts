import { auth } from "@/lib/supabase/auth";
import { getUserCostLimits, setUserCostLimits } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/users/[id]/limits — get a user's cost limits. */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const limits = await getUserCostLimits(id);
    if (!limits) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }
    return Response.json(limits);
  } catch (err) {
    console.error("Failed to get user limits:", err);
    return Response.json({ error: "Failed to get user limits." }, { status: 500 });
  }
}

/** PUT /api/admin/users/[id]/limits — set per-user cost limit overrides. */
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;

  let body: { dailyCostLimitCents?: number | null; monthlyCostLimitCents?: number | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const updated = await setUserCostLimits(id, {
      dailyCostLimitCents: body.dailyCostLimitCents ?? null,
      monthlyCostLimitCents: body.monthlyCostLimitCents ?? null,
    });
    return Response.json(updated);
  } catch (err) {
    console.error("Failed to set user limits:", err);
    return Response.json({ error: "Failed to set user limits." }, { status: 500 });
  }
}

