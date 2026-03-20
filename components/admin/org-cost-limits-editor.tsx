"use client";

import { useCallback, useState } from "react";
import { useOrgPath } from "@/lib/org-url";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centsToGbp(cents: number | null): string {
  if (cents === null || cents === 0) return "";
  return (cents / 100).toFixed(2);
}

function gbpToCents(value: string): number | null {
  if (!value.trim()) return null;
  const num = Number.parseFloat(value);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OrgCostLimitsEditorProps {
  dailyCostLimitCents: number | null;
  monthlyCostLimitCents: number | null;
}

export function OrgCostLimitsEditor({
  dailyCostLimitCents: initialDaily,
  monthlyCostLimitCents: initialMonthly,
}: OrgCostLimitsEditorProps) {
  const buildPath = useOrgPath();
  const [dailyLimit, setDailyLimit] = useState(centsToGbp(initialDaily));
  const [monthlyLimit, setMonthlyLimit] = useState(centsToGbp(initialMonthly));
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const dailyCostLimitCents = gbpToCents(dailyLimit);
      const monthlyCostLimitCents = gbpToCents(monthlyLimit);

      const res = await fetch(buildPath("/api/admin/usage/org-limits"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCostLimitCents, monthlyCostLimitCents }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to update organisation limits." });
        return;
      }

      toast({ type: "success", description: "Organisation cost limits updated." });
    } catch {
      toast({ type: "error", description: "Failed to update organisation limits." });
    } finally {
      setSaving(false);
    }
  }, [dailyLimit, monthlyLimit, buildPath]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Daily limit (£)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Unlimited"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            className="glass-input"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank for unlimited. All members are blocked when this limit is reached.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Monthly limit (£)
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Unlimited"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            className="glass-input"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank for unlimited. All members are blocked when this limit is reached.
          </p>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? "Saving…" : "Save limits"}
      </Button>
    </div>
  );
}

