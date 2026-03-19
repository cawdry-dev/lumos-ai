import { auth } from "@/lib/supabase/auth";
import { getUsageStats } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/usage?from=...&to=...
 *
 * Returns aggregated usage statistics for the admin dashboard.
 * Supports date range filtering via `from` and `to` query parameters (ISO 8601).
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
    const stats = await getUsageStats({ from, to });
    return Response.json({ stats, from: from.toISOString(), to: to.toISOString() });
  } catch (error) {
    console.error("Failed to fetch usage stats:", error);
    return Response.json(
      { error: "Failed to fetch usage statistics." },
      { status: 500 },
    );
  }
}

