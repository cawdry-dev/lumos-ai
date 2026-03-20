import { auth } from "@/lib/supabase/auth";
import { getOrgCostForPeriod, getOrgCostLimits, getUserCostForPeriod, getUserCostLimits } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

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
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
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

    const orgId = session.org.id;

    const [dailyUsage, monthlyUsage, userLimits, orgLimits, orgDailyUsage, orgMonthlyUsage] = await Promise.all([
      getUserCostForPeriod({ userId: session.user.id, from: startOfDay, to: endOfDay, orgId }),
      getUserCostForPeriod({ userId: session.user.id, from: startOfMonth, to: endOfMonth, orgId }),
      getUserCostLimits(session.user.id, orgId),
      getOrgCostLimits(orgId),
      getOrgCostForPeriod({ orgId, from: startOfDay, to: endOfDay }),
      getOrgCostForPeriod({ orgId, from: startOfMonth, to: endOfMonth }),
    ]);

    const roleDefaults = ROLE_DEFAULTS[session.org.role] ?? ROLE_DEFAULTS.editor;

    // Per-user overrides take precedence; null means use role default; 0 means unlimited
    const dailyLimitCents = userLimits?.dailyCostLimitCents ?? (roleDefaults.daily || null);
    const monthlyLimitCents = userLimits?.monthlyCostLimitCents ?? (roleDefaults.monthly || null);

    // Check if blocked (org limits take precedence)
    let blocked = false;
    let blockReason: string | null = null;

    // Check org-level limits first
    if (orgLimits?.monthlyCostLimitCents && orgMonthlyUsage.totalCostCents >= orgLimits.monthlyCostLimitCents) {
      blocked = true;
      blockReason = "org_monthly";
    } else if (orgLimits?.dailyCostLimitCents && orgDailyUsage.totalCostCents >= orgLimits.dailyCostLimitCents) {
      blocked = true;
      blockReason = "org_daily";
    } else if (monthlyLimitCents && monthlyUsage.totalCostCents >= monthlyLimitCents) {
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
      billingModel: session.org.billingModel,
      org: {
        dailyUsedCents: orgDailyUsage.totalCostCents,
        dailyLimitCents: orgLimits?.dailyCostLimitCents ?? null,
        monthlyUsedCents: orgMonthlyUsage.totalCostCents,
        monthlyLimitCents: orgLimits?.monthlyCostLimitCents ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch budget:", error);
    return Response.json({ error: "Failed to fetch budget." }, { status: 500 });
  }
}

