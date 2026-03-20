"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Coins, TrendingUp } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgBillingSummaryProps {
  billingModel: string;
  memberCount: number;
  periodTotals: {
    totalTokens: number;
    totalCostCents: number;
  };
  orgLimits: {
    dailyCostLimitCents: number | null;
    monthlyCostLimitCents: number | null;
  } | null;
  dailySeries: Array<{
    date: string;
    totalCostCents: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats cents as a currency string (e.g. £1.23). */
function formatCost(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-GB");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgBillingSummary({
  billingModel,
  memberCount,
  periodTotals,
  orgLimits,
  dailySeries,
}: OrgBillingSummaryProps) {
  const isPerSeat = billingModel === "per_seat";

  // Estimate monthly cost from daily average
  const dailyAvgCost = useMemo(() => {
    if (dailySeries.length === 0) return 0;
    const total = dailySeries.reduce((s, d) => s + d.totalCostCents, 0);
    return total / dailySeries.length;
  }, [dailySeries]);

  const estimatedMonthlyCostCents = dailyAvgCost * 30;

  // Monthly limit progress
  const monthlyLimit = orgLimits?.monthlyCostLimitCents ?? null;
  const monthlyPct = monthlyLimit
    ? Math.min((periodTotals.totalCostCents / monthlyLimit) * 100, 100)
    : null;

  // Chart data
  const chartData = useMemo(
    () =>
      dailySeries
        .map((d) => ({ date: d.date, cost: d.totalCostCents / 100 }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [dailySeries],
  );

  return (
    <Card className="glass border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Organisation Billing</CardTitle>
            <CardDescription>Current billing period overview</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {isPerSeat ? "Per-seat" : "Per-token"} billing
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Billing model metric */}
          <div className="flex items-start gap-3">
            {isPerSeat ? (
              <Users className="mt-0.5 size-5 text-primary" />
            ) : (
              <Coins className="mt-0.5 size-5 text-primary" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                {isPerSeat ? "Active members" : "Total tokens"}
              </p>
              <p className="font-semibold text-lg">
                {isPerSeat ? formatNumber(memberCount) : formatNumber(periodTotals.totalTokens)}
              </p>
            </div>
          </div>

          {/* Current period cost */}
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Period cost</p>
              <p className="font-semibold text-lg">{formatCost(periodTotals.totalCostCents)}</p>
              {monthlyLimit && (
                <p className="text-xs text-muted-foreground">
                  of {formatCost(monthlyLimit)} limit
                </p>
              )}
            </div>
          </div>

          {/* Estimated monthly */}
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Est. monthly cost</p>
              <p className="font-semibold text-lg">{formatCost(estimatedMonthlyCostCents)}</p>
            </div>
          </div>
        </div>



        {/* Monthly limit progress bar */}
        {monthlyPct !== null && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Monthly limit usage</span>
              <span>{monthlyPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${monthlyPct >= 90 ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${monthlyPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Usage trend mini-chart */}
        {chartData.length > 1 && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Daily cost trend</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, "Cost"]} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(221 83% 53%)"
                  fill="hsl(221 83% 53%)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}