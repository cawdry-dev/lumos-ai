import { auth } from "@/lib/supabase/auth";
import {

export const dynamic = "force-dynamic";
  getActiveModelPricing,
  getUsageByCopilot,
  getUsageByModel,
  getUsageByType,
  getUsageByUser,
  getUsageDailySeries,
  getUsagePeriodTotals,
} from "@/lib/db/queries";

/**
 * GET /api/admin/usage/summary?from=...&to=...
 *
 * Returns rich aggregated usage data for the admin dashboard.
 * Supports date range filtering via `from` and `to` query parameters (ISO 8601).
 * Defaults to the last 30 days if not provided.
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can view usage data." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

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

  try {
    const [
      periodTotals,
      byUser,
      byModel,
      byCopilot,
      byUsageType,
      dailySeries,
      activePricingRules,
    ] = await Promise.all([
      getUsagePeriodTotals({ from, to }),
      getUsageByUser({ from, to }),
      getUsageByModel({ from, to }),
      getUsageByCopilot({ from, to }),
      getUsageByType({ from, to }),
      getUsageDailySeries({ from, to }),
      getActiveModelPricing(),
    ]);

    return Response.json({
      periodTotals,
      byUser,
      byModel,
      byCopilot,
      byUsageType,
      dailySeries,
      activePricingRules,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch usage summary:", error);
    return Response.json(
      { error: "Failed to fetch usage summary." },
      { status: 500 },
    );
  }
}

