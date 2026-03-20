"use client";

import { useCallback, useState } from "react";
import { useOrgPath } from "@/lib/org-url";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

type UserWithLimits = {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  dailyCostLimitCents: number | null;
  monthlyCostLimitCents: number | null;
};

/** Formats cents as pounds (e.g. £5.00), or "Role default" if null. */
function formatLimit(cents: number | null): string {
  if (cents == null) return "Role default";
  return `£${(cents / 100).toFixed(2)}`;
}

export function UserLimits({ users: initialUsers }: { users: UserWithLimits[] }) {
  const buildPath = useOrgPath();
  const [users, setUsers] = useState(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithLimits | null>(null);
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const openEdit = (u: UserWithLimits) => {
    setEditingUser(u);
    setDailyLimit(u.dailyCostLimitCents != null ? String(u.dailyCostLimitCents / 100) : "");
    setMonthlyLimit(u.monthlyCostLimitCents != null ? String(u.monthlyCostLimitCents / 100) : "");
    setDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!editingUser) return;

    const dailyCostLimitCents = dailyLimit.trim() ? Math.round(Number(dailyLimit) * 100) : null;
    const monthlyCostLimitCents = monthlyLimit.trim() ? Math.round(Number(monthlyLimit) * 100) : null;

    try {
      const res = await fetch(buildPath(`/api/admin/users/${editingUser.id}/limits`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCostLimitCents, monthlyCostLimitCents }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ type: "error", description: data.error ?? "Failed to update limits." });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, dailyCostLimitCents, monthlyCostLimitCents } : u,
        ),
      );
      toast({ type: "success", description: "Cost limits updated." });
      setDialogOpen(false);
    } catch {
      toast({ type: "error", description: "Failed to update limits." });
    }
  }, [editingUser, dailyLimit, monthlyLimit]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="glass-table-header border-b text-left text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">User</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium text-right">Daily limit</th>
              <th className="px-3 py-2.5 font-medium text-right">Monthly limit</th>
              <th className="px-3 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="glass-table-row border-b last:border-0">
                <td className="py-2 pr-4">{u.displayName ?? u.email}</td>
                <td className="py-2 pr-4 capitalize text-muted-foreground">{u.role}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatLimit(u.dailyCostLimitCents)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatLimit(u.monthlyCostLimitCents)}</td>
                <td className="py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit limits dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit cost limits</DialogTitle>
            <DialogDescription>
              Set per-user cost limit overrides for {editingUser?.displayName ?? editingUser?.email}.
              Leave blank to use the role default.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dailyLimit">Daily limit (£)</Label>
              <Input
                id="dailyLimit"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 5.00 (leave blank for role default)"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="glass-input"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monthlyLimit">Monthly limit (£)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50.00 (leave blank for role default)"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

