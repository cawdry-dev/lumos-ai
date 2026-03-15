"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

type UsageRow = {
  userId: string;
  email: string;
  displayName: string | null;
  modelId: string;
  copilotId: string | null;
  copilotName: string | null;
  usageType: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostCents: number;
  date: string;
};

/** Formats cents as a currency string (e.g. £1.23). */
function formatCost(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

/** Formats a large number with commas. */
function formatNumber(n: number): string {
  return n.toLocaleString("en-GB");
}

export function UsageDashboard() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Default date range: last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1); // Include the end date
      const res = await fetch(
        `/api/admin/usage?from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      if (!res.ok) {
        toast({ type: "error", description: "Failed to load usage data." });
        return;
      }
      const data = await res.json();
      setRows(data.stats ?? []);
    } catch {
      toast({ type: "error", description: "Failed to load usage data." });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Aggregations ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const tokensToday = useMemo(
    () => rows.filter((r) => r.date === todayStr).reduce((s, r) => s + r.totalTokens, 0),
    [rows, todayStr],
  );
  const costToday = useMemo(
    () => rows.filter((r) => r.date === todayStr).reduce((s, r) => s + r.totalCostCents, 0),
    [rows, todayStr],
  );
  const costThisMonth = useMemo(
    () => rows.filter((r) => r.date.startsWith(currentMonth)).reduce((s, r) => s + r.totalCostCents, 0),
    [rows, currentMonth],
  );

  // Usage by user
  const byUser = useMemo(() => {
    const map = new Map<string, { email: string; displayName: string | null; tokens: number; cost: number }>();
    for (const r of rows) {
      const existing = map.get(r.userId) ?? { email: r.email, displayName: r.displayName, tokens: 0, cost: 0 };
      existing.tokens += r.totalTokens;
      existing.cost += r.totalCostCents;
      map.set(r.userId, existing);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.cost - a.cost);
  }, [rows]);

  // Usage by model (for bar chart)
  const byModel = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.modelId, (map.get(r.modelId) ?? 0) + r.totalCostCents);
    }
    return Array.from(map.entries())
      .map(([model, cost]) => ({ model: model.split("/").pop() ?? model, cost: cost / 100 }))
      .sort((a, b) => b.cost - a.cost);
  }, [rows]);

  // Daily cost time-series
  const dailyCost = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.date, (map.get(r.date) ?? 0) + r.totalCostCents);
    }
    return Array.from(map.entries())
      .map(([date, cost]) => ({ date, cost: cost / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  // CSV export
  const exportCsv = useCallback(() => {
    const header = "Date,User,Model,Co-pilot,Type,Prompt Tokens,Completion Tokens,Total Tokens,Cost (£)\n";
    const csvRows = rows.map((r) =>
      [r.date, r.email, r.modelId, r.copilotName ?? "General", r.usageType, r.totalPromptTokens, r.totalCompletionTokens, r.totalTokens, (r.totalCostCents / 100).toFixed(2)].join(","),
    );
    const blob = new Blob([header + csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, fromDate, toDate]);

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground text-sm">Loading usage data…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 size-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tokens today</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(tokensToday)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost today</CardDescription>
            <CardTitle className="text-2xl">{formatCost(costToday)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost this month</CardDescription>
            <CardTitle className="text-2xl">{formatCost(costThisMonth)}</CardTitle>
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
                  <th className="pb-2 pr-4 font-medium text-right">Tokens</th>
                  <th className="pb-2 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byUser.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{u.displayName ?? u.email}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(u.tokens)}</td>
                    <td className="py-2 text-right tabular-nums">{formatCost(u.cost)}</td>
                  </tr>
                ))}
                {byUser.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      No usage data for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage by model bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost by model</CardTitle>
          </CardHeader>
          <CardContent>
            {byModel.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byModel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, "Cost"]} />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">No data.</p>
            )}
          </CardContent>
        </Card>

        {/* Daily cost time-series */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily cost (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyCost.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyCost}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, "Cost"]} />
                  <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">No data.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

