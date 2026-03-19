"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DEFAULT_PRICING_SEEDS } from "@/lib/ai/pricing-defaults";

type PricingRule = {
  id: string;
  modelPattern: string;
  promptPricePer1kTokens: string;
  completionPricePer1kTokens: string;
  isActive: boolean;
  updatedAt: string;
};

export function ModelPricingManager() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // Form state
  const [formPattern, setFormPattern] = useState("");
  const [formPromptPrice, setFormPromptPrice] = useState("");
  const [formCompletionPrice, setFormCompletionPrice] = useState("");

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing");
      if (!res.ok) {
        toast({ type: "error", description: "Failed to load pricing rules." });
        return;
      }
      const data = await res.json();
      setRules(data.pricing ?? []);
    } catch {
      toast({ type: "error", description: "Failed to load pricing rules." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openCreate = () => {
    setEditingRule(null);
    setFormPattern("");
    setFormPromptPrice("");
    setFormCompletionPrice("");
    setDialogOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setFormPattern(rule.modelPattern);
    setFormPromptPrice(rule.promptPricePer1kTokens);
    setFormCompletionPrice(rule.completionPricePer1kTokens);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formPattern.trim()) {
      toast({ type: "error", description: "Model pattern is required." });
      return;
    }

    try {
      if (editingRule) {
        const res = await fetch("/api/admin/pricing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingRule.id,
            modelPattern: formPattern,
            promptPricePer1kTokens: formPromptPrice,
            completionPricePer1kTokens: formCompletionPrice,
          }),
        });
        if (!res.ok) throw new Error();
        toast({ type: "success", description: "Pricing rule updated." });
      } else {
        const res = await fetch("/api/admin/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelPattern: formPattern,
            promptPricePer1kTokens: formPromptPrice,
            completionPricePer1kTokens: formCompletionPrice,
          }),
        });
        if (!res.ok) throw new Error();
        toast({ type: "success", description: "Pricing rule created." });
      }
      setDialogOpen(false);
      fetchRules();
    } catch {
      toast({ type: "error", description: "Failed to save pricing rule." });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast({ type: "success", description: "Pricing rule deleted." });
      fetchRules();
    } catch {
      toast({ type: "error", description: "Failed to delete pricing rule." });
    }
  };

  const seedDefaults = async () => {
    try {
      for (const seed of DEFAULT_PRICING_SEEDS) {
        await fetch("/api/admin/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(seed),
        });
      }
      toast({ type: "success", description: "Default pricing rules seeded." });
      fetchRules();
    } catch {
      toast({ type: "error", description: "Failed to seed defaults." });
    }
  };

  if (loading) {
    return <p className="py-4 text-center text-muted-foreground text-sm">Loading pricing rules…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 size-4" />
            Add rule
          </Button>
          {rules.length === 0 && (
            <Button size="sm" variant="outline" onClick={seedDefaults}>
              Seed defaults
            </Button>
          )}
        </div>
      </div>

      {/* Pricing rules table */}
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="glass-table-header border-b text-left text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Model pattern</th>
              <th className="px-3 py-2.5 font-medium text-right">Prompt (¢/1K)</th>
              <th className="px-3 py-2.5 font-medium text-right">Completion (¢/1K)</th>
              <th className="px-3 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="glass-table-row border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs">{rule.modelPattern}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{rule.promptPricePer1kTokens}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{rule.completionPricePer1kTokens}</td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  No pricing rules configured. Click &quot;Seed defaults&quot; to add common models.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit pricing rule" : "Add pricing rule"}</DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Update the pricing for this model pattern."
                : "Add a new model pricing rule. Use glob patterns like openai/gpt-4.1-* for wildcards."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pattern">Model pattern</Label>
              <Input
                id="pattern"
                placeholder="e.g. openai/gpt-4.1-mini"
                value={formPattern}
                onChange={(e) => setFormPattern(e.target.value)}
                className="glass-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="promptPrice">Prompt price (¢/1K tokens)</Label>
                <Input
                  id="promptPrice"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.04"
                  value={formPromptPrice}
                  onChange={(e) => setFormPromptPrice(e.target.value)}
                  className="glass-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="completionPrice">Completion price (¢/1K tokens)</Label>
                <Input
                  id="completionPrice"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.16"
                  value={formCompletionPrice}
                  onChange={(e) => setFormCompletionPrice(e.target.value)}
                  className="glass-input"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

