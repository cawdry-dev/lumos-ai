"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UsageSummary = {
  periodTotals: {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCostCents: number;
  };
  byUser: Array<{
    userId: string;
    email: string;
    displayName: string | null;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCostCents: number;
    requestCount: number;
  }>;
  byModel: Array<{
    modelId: string;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCostCents: number;
    requestCount: number;
  }>;
  byCopilot: Array<{
    copilotId: string | null;
    copilotName: string | null;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCostCents: number;
  }>;
  byUsageType: Array<{
    usageType: string;
    totalTokens: number;
    totalCostCents: number;
    requestCount: number;
  }>;
  dailySeries: Array<{
    date: string;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCostCents: number;
  }>;
  activePricingRules: Array<{
    id: string;
    modelPattern: string;
    promptPricePer1kTokens: string;
    completionPricePer1kTokens: string;
    isActive: boolean;
    updatedAt: string;
  }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHART_COLOURS = [
  "hsl(221 83% 53%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 67% 55%)",
  "hsl(199 89% 48%)",
  "hsl(330 81% 60%)",
  "hsl(160 84% 39%)",
];

/** Formats cents as a currency string (e.g. £1.23). */
function formatCost(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

/** Formats a large number with commas using en-GB locale. */
function formatNumber(n: number): string {
  return n.toLocaleString("en-GB");
}

/** Returns an ISO date string (YYYY-MM-DD) for today. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compute a date range and return [from, to] as ISO date strings. */
function computeRange(
  preset: string,
): [string, string] {
  const now = new Date();
  const to = todayISO();

  switch (preset) {
    case "today":
      return [to, to];
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return [d.toISOString().slice(0, 10), to];
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return [d.toISOString().slice(0, 10), to];
    }
    case "this-month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return [first.toISOString().slice(0, 10), to];
    }
    case "last-month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
    }
    default:
      return [to, to];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsageDashboard() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingOpen, setPricingOpen] = useState(false);

  // Default date range: last 30 days
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(todayISO);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1); // Include the end date
      const res = await fetch(
        `/api/admin/usage/summary?from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      if (!res.ok) {
        toast({ type: "error", description: "Failed to load usage data." });
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      toast({ type: "error", description: "Failed to load usage data." });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick-select handler
  const applyPreset = useCallback((preset: string) => {
    const [f, t] = computeRange(preset);
    setFromDate(f);
    setToDate(t);
  }, []);

  // --- Derived data ---

  const totalCost = data?.periodTotals.totalCostCents ?? 0;
  const totalTokens = data?.periodTotals.totalTokens ?? 0;
  const totalPromptTokens = data?.periodTotals.totalPromptTokens ?? 0;
  const totalCompletionTokens = data?.periodTotals.totalCompletionTokens ?? 0;
  const totalRequests = useMemo(
    () => (data?.byUser ?? []).reduce((s, u) => s + u.requestCount, 0),
    [data],
  );

  const uniqueUsers = (data?.byUser ?? []).length;
  const daysInPeriod = useMemo(() => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  }, [fromDate, toDate]);
  const avgCostPerUserPerDay =
    uniqueUsers > 0 ? totalCost / uniqueUsers / daysInPeriod : 0;

  // Cost today from daily series
  const todayStr = todayISO();
  const costTodayCents = useMemo(
    () =>
      (data?.dailySeries ?? [])
        .filter((d) => d.date === todayStr)
        .reduce((s, d) => s + d.totalCostCents, 0),
    [data, todayStr],
  );

  // Cost yesterday for delta
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const costYesterdayCents = useMemo(
    () =>
      (data?.dailySeries ?? [])
        .filter((d) => d.date === yesterdayStr)
        .reduce((s, d) => s + d.totalCostCents, 0),
    [data, yesterdayStr],
  );
  const todayDeltaPct =
    costYesterdayCents > 0
      ? ((costTodayCents - costYesterdayCents) / costYesterdayCents) * 100
      : null;

  // Model chart data (horizontal bar)
  const modelChartData = useMemo(
    () =>
      (data?.byModel ?? [])
        .map((m) => ({
          model: m.modelId.split("/").pop() ?? m.modelId,
          cost: m.totalCostCents / 100,
        }))
        .sort((a, b) => b.cost - a.cost),
    [data],
  );

  // User pie chart data (top 10)
  const userPieData = useMemo(() => {
    const sorted = [...(data?.byUser ?? [])].sort(
      (a, b) => b.totalCostCents - a.totalCostCents,
    );
    const top = sorted.slice(0, 10);
    const rest = sorted.slice(10);
    const items = top.map((u) => ({
      name: u.displayName ?? u.email,
      value: u.totalCostCents / 100,
    }));
    if (rest.length > 0) {
      items.push({
        name: "Others",
        value: rest.reduce((s, u) => s + u.totalCostCents, 0) / 100,
      });
    }
    return items;
  }, [data]);

  // Daily series for charts
  const dailyChartData = useMemo(
    () =>
      (data?.dailySeries ?? [])
        .map((d) => ({
          date: d.date,
          cost: d.totalCostCents / 100,
          promptTokens: d.totalPromptTokens,
          completionTokens: d.totalCompletionTokens,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );

  // Pricing rule lookup by model
  const pricingByModel = useMemo(() => {
    const map = new Map<string, { prompt: string; completion: string }>();
    for (const rule of data?.activePricingRules ?? []) {
      map.set(rule.modelPattern, {
        prompt: rule.promptPricePer1kTokens,
        completion: rule.completionPricePer1kTokens,
      });
    }
    return map;
  }, [data]);

  // Find pricing for a model (exact match or wildcard)
  const findPricing = useCallback(
    (modelId: string) => {
      const exact = pricingByModel.get(modelId);
      if (exact) return exact;
      const slash = modelId.indexOf("/");
      if (slash > 0) {
        const wildcard = `${modelId.slice(0, slash)}/*`;
        return pricingByModel.get(wildcard) ?? null;
      }
      return null;
    },
    [pricingByModel],
  );

  // CSV export
  const exportCsv = useCallback(() => {
    if (!data) return;
    const header =
      "Section,User,Model,Co-pilot,Type,Requests,Prompt Tokens,Completion Tokens,Total Tokens,Cost (£)\n";
    const csvRows: string[] = [];
    for (const u of data.byUser) {
      csvRows.push(
        ["User", u.email, "", "", "", u.requestCount, u.totalPromptTokens, u.totalCompletionTokens, u.totalTokens, (u.totalCostCents / 100).toFixed(2)].join(","),
      );
    }
    for (const m of data.byModel) {
      csvRows.push(
        ["Model", "", m.modelId, "", "", m.requestCount, m.totalPromptTokens, m.totalCompletionTokens, m.totalTokens, (m.totalCostCents / 100).toFixed(2)].join(","),
      );
    }
    for (const c of data.byCopilot) {
      csvRows.push(
        ["Co-pilot", "", "", c.copilotName ?? "General", "", "", c.totalPromptTokens, c.totalCompletionTokens, c.totalTokens, (c.totalCostCents / 100).toFixed(2)].join(","),
      );
    }
    for (const t of data.byUsageType) {
      csvRows.push(
        ["Type", "", "", "", t.usageType, t.requestCount, "", "", t.totalTokens, (t.totalCostCents / 100).toFixed(2)].join(","),
      );
    }
    const blob = new Blob([header + csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, fromDate, toDate]);

  // --- Render ---

  if (loading) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        Loading usage data…
      </p>
    );
  }

  const presetButtons = [
    { label: "Today", key: "today" },
    { label: "Last 7 days", key: "7d" },
    { label: "Last 30 days", key: "30d" },
    { label: "This month", key: "this-month" },
    { label: "Last month", key: "last-month" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {presetButtons.map((p) => (
            <Button
              key={p.key}
              variant="ghost"
              size="sm"
              onClick={() => applyPreset(p.key)}
              className="text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 size-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards — row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total cost (period)</CardDescription>
            <CardTitle className="text-2xl">{formatCost(totalCost)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost today</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {formatCost(costTodayCents)}
              {todayDeltaPct !== null && (
                <span
                  className={`inline-flex items-center text-xs font-medium ${todayDeltaPct >= 0 ? "text-red-500" : "text-green-500"}`}
                >
                  {todayDeltaPct >= 0 ? (
                    <TrendingUp className="mr-0.5 size-3" />
                  ) : (
                    <TrendingDown className="mr-0.5 size-3" />
                  )}
                  {todayDeltaPct >= 0 ? "+" : ""}
                  {todayDeltaPct.toFixed(0)}%
                </span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg cost per user per day</CardDescription>
            <CardTitle className="text-2xl">
              {formatCost(avgCostPerUserPerDay)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Summary cards — row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total requests</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(totalRequests)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total tokens</CardDescription>
            <CardTitle className="text-2xl" title={`Prompt: ${formatNumber(totalPromptTokens)} / Completion: ${formatNumber(totalCompletionTokens)}`}>
              {formatNumber(totalTokens)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Prompt: {formatNumber(totalPromptTokens)} · Completion:{" "}
              {formatNumber(totalCompletionTokens)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active users</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(uniqueUsers)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Usage by user table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by user</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium text-right">Requests</th>
                  <th className="pb-2 pr-4 font-medium text-right">Prompt Tokens</th>
                  <th className="pb-2 pr-4 font-medium text-right">Completion Tokens</th>
                  <th className="pb-2 pr-4 font-medium text-right">Total Tokens</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cost</th>
                  <th className="pb-2 font-medium text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byUser ?? [])
                  .slice()
                  .sort((a, b) => b.totalCostCents - a.totalCostCents)
                  .map((u) => {
                    const pct =
                      totalCost > 0
                        ? (u.totalCostCents / totalCost) * 100
                        : 0;
                    return (
                      <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/admin/usage/${u.userId}`}
                            className="text-primary hover:underline"
                          >
                            {u.displayName ?? u.email}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(u.requestCount)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(u.totalPromptTokens)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(u.totalCompletionTokens)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(u.totalTokens)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatCost(u.totalCostCents)}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {(data?.byUser ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-muted-foreground">
                      No usage data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage by model table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Model</th>
                  <th className="pb-2 pr-4 font-medium text-right">Requests</th>
                  <th className="pb-2 pr-4 font-medium text-right">Prompt Tokens</th>
                  <th className="pb-2 pr-4 font-medium text-right">Completion Tokens</th>
                  <th className="pb-2 pr-4 font-medium text-right">Total Tokens</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cost</th>
                  <th className="pb-2 font-medium text-right">Pricing</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byModel ?? [])
                  .slice()
                  .sort((a, b) => b.totalCostCents - a.totalCostCents)
                  .map((m) => {
                    const pricing = findPricing(m.modelId);
                    return (
                      <tr key={m.modelId} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">
                          {m.modelId}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(m.requestCount)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(m.totalPromptTokens)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(m.totalCompletionTokens)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(m.totalTokens)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatCost(m.totalCostCents)}
                        </td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {pricing ? (
                            <span>
                              {pricing.prompt}¢ / {pricing.completion}¢ per 1K
                            </span>
                          ) : (
                            <span className="italic">No rule</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {(data?.byModel ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-muted-foreground">
                      No usage data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage by co-pilot table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by co-pilot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Co-pilot</th>
                  <th className="pb-2 pr-4 font-medium text-right">Tokens</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cost</th>
                  <th className="pb-2 font-medium text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byCopilot ?? [])
                  .slice()
                  .sort((a, b) => b.totalCostCents - a.totalCostCents)
                  .map((c) => {
                    const pct =
                      totalCost > 0
                        ? (c.totalCostCents / totalCost) * 100
                        : 0;
                    return (
                      <tr
                        key={c.copilotId ?? "general"}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-4">
                          {c.copilotName ?? "General"}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatNumber(c.totalTokens)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatCost(c.totalCostCents)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-xs text-muted-foreground">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                {(data?.byCopilot ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No usage data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage by type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by type</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.byUsageType ?? []).length > 0 ? (
            <div className="space-y-2">
              {(data?.byUsageType ?? [])
                .slice()
                .sort((a, b) => b.totalCostCents - a.totalCostCents)
                .map((t) => {
                  const pct =
                    totalCost > 0
                      ? (t.totalCostCents / totalCost) * 100
                      : 0;
                  return (
                    <div key={t.usageType} className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-24 justify-center text-xs">
                        {t.usageType}
                      </Badge>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
                        {formatNumber(t.totalTokens)} tokens
                      </span>
                      <span className="w-16 text-right text-xs tabular-nums">
                        {formatCost(t.totalCostCents)}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No usage data for this period.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily cost trend (area) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily cost trend</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [`£${Number(v).toFixed(2)}`, "Cost"]}
                  />
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
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cost by model (horizontal bar) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost by model</CardTitle>
          </CardHeader>
          <CardContent>
            {modelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="model"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v) => [`£${Number(v).toFixed(2)}`, "Cost"]}
                  />
                  <Bar
                    dataKey="cost"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cost by user (pie chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost by user (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {userPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Tooltip
                    formatter={(v) => [`£${Number(v).toFixed(2)}`, "Cost"]}
                  />
                  <Pie
                    data={userPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    label={({ name, percent }) => {
                      const label = String(name ?? "Unknown");
                      return `${label.length > 12 ? `${label.slice(0, 12)}…` : label} ${((percent ?? 0) * 100).toFixed(0)}%`;
                    }}
                    labelLine={false}
                  >
                    {userPieData.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLOURS[i % CHART_COLOURS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Token usage over time (stacked area) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Token usage over time</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v, name) => [
                      formatNumber(Number(v)),
                      name === "promptTokens" ? "Prompt" : "Completion",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="promptTokens"
                    stackId="tokens"
                    stroke="hsl(221 83% 53%)"
                    fill="hsl(221 83% 53%)"
                    fillOpacity={0.4}
                    name="promptTokens"
                  />
                  <Area
                    type="monotone"
                    dataKey="completionTokens"
                    stackId="tokens"
                    stroke="hsl(142 71% 45%)"
                    fill="hsl(142 71% 45%)"
                    fillOpacity={0.4}
                    name="completionTokens"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active pricing rules (collapsible) */}
      <Collapsible open={pricingOpen} onOpenChange={setPricingOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
                {pricingOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                <CardTitle className="text-lg">Active pricing rules</CardTitle>
              </CollapsibleTrigger>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/pricing">
                  <ExternalLink className="mr-1 size-3" />
                  Manage pricing
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Model pattern</th>
                      <th className="pb-2 pr-4 font-medium text-right">
                        Prompt (¢/1K)
                      </th>
                      <th className="pb-2 pr-4 font-medium text-right">
                        Completion (¢/1K)
                      </th>
                      <th className="pb-2 font-medium text-right">
                        Last updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.activePricingRules ?? []).map((rule) => (
                      <tr
                        key={rule.id}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">
                          {rule.modelPattern}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {rule.promptPricePer1kTokens}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {rule.completionPricePer1kTokens}
                        </td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {new Date(rule.updatedAt).toLocaleDateString("en-GB")}
                        </td>
                      </tr>
                    ))}
                    {(data?.activePricingRules ?? []).length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-4 text-center text-muted-foreground"
                        >
                          No active pricing rules.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

