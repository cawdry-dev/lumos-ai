"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "@/components/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UserInfo = { id: string; email: string; displayName: string | null; role: string; dailyCostLimitCents: number | null; monthlyCostLimitCents: number | null };
type StatRow = { modelId: string; usageType: string; totalPromptTokens: number; totalCompletionTokens: number; totalTokens: number; totalCostCents: number; date: string };
type LogEntry = { id: string; modelId: string; usageType: string; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostCents: number; createdAt: string };
type ApiResponse = { user: UserInfo; stats: StatRow[]; log: LogEntry[]; dailyCostCents: number; monthlyCostCents: number; limits: { dailyCostLimitCents: number | null; monthlyCostLimitCents: number | null } | null; from: string; to: string };

const ROLE_DEFAULTS: Record<string, { daily: number; monthly: number }> = { editor: { daily: 500, monthly: 5000 }, admin: { daily: 0, monthly: 0 } };
function formatCost(cents: number): string { return `£${(cents / 100).toFixed(2)}`; }
function formatNumber(n: number): string { return n.toLocaleString("en-GB"); }
function getEffectiveLimit(userLimit: number | null | undefined, role: string, period: "daily" | "monthly"): number {
  if (userLimit != null && userLimit > 0) return userLimit;
  return ROLE_DEFAULTS[role]?.[period] ?? 0;
}

function LimitBar({ label, usedCents, limitCents }: { label: string; usedCents: number; limitCents: number }) {
  const unlimited = limitCents === 0;
  const pct = unlimited ? 0 : Math.min((usedCents / limitCents) * 100, 100);
  const overBudget = !unlimited && usedCents > limitCents;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{formatCost(usedCents)} / {unlimited ? "Unlimited" : formatCost(limitCents)}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${overBudget ? "bg-destructive" : "bg-primary"}`} style={{ width: unlimited ? "0%" : `${pct}%` }} />
      </div>
    </div>
  );
}

export function UserUsageDetail({ userId }: { userId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
      to.setDate(to.getDate() + 1);
      const res = await fetch(`/api/admin/usage/user/${userId}?from=${from.toISOString()}&to=${to.toISOString()}`);
      if (!res.ok) { toast({ type: "error", description: "Failed to load user usage data." }); return; }
      setData(await res.json());
    } catch { toast({ type: "error", description: "Failed to load user usage data." }); }
    finally { setLoading(false); }
  }, [fromDate, toDate, userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return <p className="py-8 text-center text-muted-foreground text-sm">Loading usage data…</p>;
  return <Loaded data={data} fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} />;
}

function Loaded({ data, fromDate, toDate, setFromDate, setToDate }: { data: ApiResponse; fromDate: string; toDate: string; setFromDate: (v: string) => void; setToDate: (v: string) => void }) {
  const { user: u, stats, log, dailyCostCents, monthlyCostCents, limits } = data;
  const dailyLimit = getEffectiveLimit(limits?.dailyCostLimitCents, u.role, "daily");
  const monthlyLimit = getEffectiveLimit(limits?.monthlyCostLimitCents, u.role, "monthly");

  const totalCost = useMemo(() => stats.reduce((s, r) => s + r.totalCostCents, 0), [stats]);
  const totalTokens = useMemo(() => stats.reduce((s, r) => s + r.totalTokens, 0), [stats]);
  const totalRows = stats.length;

  const byModel = useMemo(() => {
    const m = new Map<string, { prompt: number; completion: number; tokens: number; cost: number }>();
    for (const r of stats) { const e = m.get(r.modelId) ?? { prompt: 0, completion: 0, tokens: 0, cost: 0 }; e.prompt += r.totalPromptTokens; e.completion += r.totalCompletionTokens; e.tokens += r.totalTokens; e.cost += r.totalCostCents; m.set(r.modelId, e); }
    return [...m.entries()].map(([model, v]) => ({ model, ...v })).sort((a, b) => b.cost - a.cost);
  }, [stats]);

  const dailyCostChart = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of stats) m.set(r.date, (m.get(r.date) ?? 0) + r.totalCostCents);
    return [...m.entries()].map(([date, cost]) => ({ date, cost: cost / 100 })).sort((a, b) => a.date.localeCompare(b.date));
  }, [stats]);

  const byType = useMemo(() => {
    const m = new Map<string, { tokens: number; cost: number; count: number }>();
    for (const r of stats) { const e = m.get(r.usageType) ?? { tokens: 0, cost: 0, count: 0 }; e.tokens += r.totalTokens; e.cost += r.totalCostCents; e.count += 1; m.set(r.usageType, e); }
    return [...m.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.cost - a.cost);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-xl">{u.displayName ?? u.email}</h2>
        <p className="text-sm text-muted-foreground">{u.email} · {u.role}</p>
      </div>
      <Card className="glass">
        <CardHeader className="pb-2"><CardTitle className="text-lg">Spending Limits</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <LimitBar label="Daily spend" usedCents={dailyCostCents} limitCents={dailyLimit} />
          <LimitBar label="Monthly spend" usedCents={monthlyCostCents} limitCents={monthlyLimit} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-end gap-3">
        <div><label className="mb-1 block text-xs text-muted-foreground">From</label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" /></div>
        <div><label className="mb-1 block text-xs text-muted-foreground">To</label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="glass"><CardHeader className="pb-2"><CardDescription>Total cost</CardDescription><CardTitle className="text-2xl">{formatCost(totalCost)}</CardTitle></CardHeader></Card>
        <Card className="glass"><CardHeader className="pb-2"><CardDescription>Total tokens</CardDescription><CardTitle className="text-2xl">{formatNumber(totalTokens)}</CardTitle></CardHeader></Card>
        <Card className="glass"><CardHeader className="pb-2"><CardDescription>Aggregation rows</CardDescription><CardTitle className="text-2xl">{formatNumber(totalRows)}</CardTitle></CardHeader></Card>
      </div>
      {/* Model breakdown */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-lg">Model Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead><tr className="glass-table-header border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Model</th>
                <th className="pb-2 pr-4 font-medium text-right">Prompt tokens</th>
                <th className="pb-2 pr-4 font-medium text-right">Completion tokens</th>
                <th className="pb-2 pr-4 font-medium text-right">Total tokens</th>
                <th className="pb-2 font-medium text-right">Cost</th>
              </tr></thead>
              <tbody>
                {byModel.map((m) => (
                  <tr key={m.model} className="glass-table-row border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{m.model}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(m.prompt)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(m.completion)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(m.tokens)}</td>
                    <td className="py-2 text-right tabular-nums">{formatCost(m.cost)}</td>
                  </tr>
                ))}
                {byModel.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No usage data.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Daily cost chart */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-lg">Daily Cost</CardTitle></CardHeader>
        <CardContent>
          {dailyCostChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyCostChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, "Cost"]} />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="py-8 text-center text-muted-foreground text-sm">No data.</p>}
        </CardContent>
      </Card>

      {/* Usage type breakdown */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-lg">Usage Type Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead><tr className="glass-table-header border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium text-right">Tokens</th>
                <th className="pb-2 font-medium text-right">Cost</th>
              </tr></thead>
              <tbody>
                {byType.map((t) => (
                  <tr key={t.type} className="glass-table-row border-b last:border-0">
                    <td className="py-2 pr-4 capitalize">{t.type}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(t.tokens)}</td>
                    <td className="py-2 text-right tabular-nums">{formatCost(t.cost)}</td>
                  </tr>
                ))}
                {byType.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No usage data.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent usage log */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-lg">Recent Usage Log</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-sm">
              <thead><tr className="glass-table-header border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Model</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium text-right">Prompt tokens</th>
                <th className="pb-2 pr-4 font-medium text-right">Completion tokens</th>
                <th className="pb-2 font-medium text-right">Cost</th>
              </tr></thead>
              <tbody>
                {log.map((entry) => (
                  <tr key={entry.id} className="glass-table-row border-b last:border-0">
                    <td className="py-2 pr-4 text-xs tabular-nums">{new Date(entry.createdAt).toLocaleString("en-GB")}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{entry.modelId}</td>
                    <td className="py-2 pr-4 capitalize">{entry.usageType}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(entry.promptTokens)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(entry.completionTokens)}</td>
                    <td className="py-2 text-right tabular-nums">{formatCost(entry.estimatedCostCents)}</td>
                  </tr>
                ))}
                {log.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No usage records.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

