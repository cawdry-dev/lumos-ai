import { auth } from "@/lib/supabase/auth";
import { getUserCostForPeriod, getUserCostLimits } from "@/lib/db/queries";

/** Default cost limits by role (in cents). */
const ROLE_DEFAULTS: Record<string, { daily: number; monthly: number }> = {
  editor: { daily: 500, monthly: 5000 },
  admin: { daily: 0, monthly: 0 }, // 0 = unlimited
};

/**
 * GET /api/usage/budget
 *
 * Returns the current user's budget status including usage and limits.
 * Used by the budget indicator in the chat input.
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const now = new Date();

    // Start of today (midnight)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // End of day (tomorrow midnight)
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // End of month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [dailyUsage, monthlyUsage, userLimits] = await Promise.all([
      getUserCostForPeriod({ userId: session.user.id, from: startOfDay, to: endOfDay }),
      getUserCostForPeriod({ userId: session.user.id, from: startOfMonth, to: endOfMonth }),
      getUserCostLimits(session.user.id),
    ]);

    const roleDefaults = ROLE_DEFAULTS[session.user.role] ?? ROLE_DEFAULTS.editor;

    // Per-user overrides take precedence; null means use role default; 0 means unlimited
    const dailyLimitCents = userLimits?.dailyCostLimitCents ?? (roleDefaults.daily || null);
    const monthlyLimitCents = userLimits?.monthlyCostLimitCents ?? (roleDefaults.monthly || null);

    // Check if blocked
    let blocked = false;
    let blockReason: string | null = null;

    if (monthlyLimitCents && monthlyUsage.totalCostCents >= monthlyLimitCents) {
      blocked = true;
      blockReason = "monthly";
    } else if (dailyLimitCents && dailyUsage.totalCostCents >= dailyLimitCents) {
      blocked = true;
      blockReason = "daily";
    }

    return Response.json({
      dailyUsedCents: dailyUsage.totalCostCents,
      dailyLimitCents,
      monthlyUsedCents: monthlyUsage.totalCostCents,
      monthlyLimitCents,
      blocked,
      blockReason,
    });
  } catch (error) {
    console.error("Failed to fetch budget:", error);
    return Response.json({ error: "Failed to fetch budget." }, { status: 500 });
  }
}

