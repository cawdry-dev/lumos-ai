import { auth } from "@/lib/supabase/auth";
import {
  getUserById,
  getUserUsageDetail,
  getUserUsageLog,
  getUserCostForPeriod,
  getUserCostLimits,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ userId: string }> };

/**
 * GET /api/admin/usage/user/[userId]?from=...&to=...&limit=...&offset=...
 *
 * Returns usage data for a single user including aggregated stats,
 * cost limit status, and a paginated usage log.
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 },
    );
  }

  const { userId } = await context.params;
  const { searchParams } = new URL(request.url);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  // Default: last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const from = fromParam ? new Date(fromParam) : thirtyDaysAgo;
  const to = toParam ? new Date(toParam) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return Response.json(
      { error: "Invalid date format. Use ISO 8601." },
      { status: 400 },
    );
  }

  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;

  try {
    const userInfo = await getUserById(userId);
    if (!userInfo) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    // Current period costs for limit progress bars
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [stats, log, dailyCost, monthlyCost, limits] = await Promise.all([
      getUserUsageDetail({ userId, from, to }),
      getUserUsageLog({ userId, from, to, limit, offset }),
      getUserCostForPeriod({ userId, from: startOfDay, to: endOfDay }),
      getUserCostForPeriod({ userId, from: startOfMonth, to: endOfMonth }),
      getUserCostLimits(userId),
    ]);

    return Response.json({
      user: userInfo,
      stats,
      log: log.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      dailyCostCents: dailyCost.totalCostCents,
      monthlyCostCents: monthlyCost.totalCostCents,
      limits: limits
        ? {
            dailyCostLimitCents: limits.dailyCostLimitCents,
            monthlyCostLimitCents: limits.monthlyCostLimitCents,
          }
        : null,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch user usage detail:", error);
    return Response.json(
      { error: "Failed to fetch user usage detail." },
      { status: 500 },
    );
  }
}

